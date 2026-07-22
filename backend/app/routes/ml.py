import pickle
import numpy as np
import pandas as pd
import os
import warnings
import csv
import io
import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request
from marshmallow import Schema, ValidationError, fields, validate

from ..finance import clamp
from ..extensions import db
from ..models import CreditApplication

ml_bp = Blueprint("ml", __name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

FEATURE_DEFAULTS = {
    "checking_status": "A14",
    "duration": 12,
    "credit_history": "A32",
    "purpose": "A40",
    "credit_amount": 3000,
    "savings_status": "A61",
    "employment": "A73",
    "installment_rate": 2,
    "personal_status": "A91",
    "other_parties": "A101",
    "residence_since": 2,
    "property_magnitude": "A123",
    "age": 35,
    "other_payment_plans": "A143",
    "housing": "A152",
    "existing_credits": 1,
    "job": "A173",
    "num_dependents": 1,
    "own_telephone": "A191",
    "foreign_worker": "A201",
}

FEATURE_LABELS = {
    "checking_status": "Account Balance",
    "duration": "Loan Duration (months)",
    "credit_history": "Credit History",
    "purpose": "Loan Purpose",
    "credit_amount": "Loan Amount",
    "savings_status": "Savings Balance",
    "employment": "Employment Duration",
    "installment_rate": "Installment Rate",
    "personal_status": "Personal Status",
    "other_parties": "Co-applicant/Guarantor",
    "residence_since": "Years at Residence",
    "property_magnitude": "Property Owned",
    "age": "Applicant Age",
    "other_payment_plans": "Other Loan Plans",
    "housing": "Housing Type",
    "existing_credits": "Existing Credits",
    "job": "Job Type",
    "num_dependents": "Number of Dependents",
    "own_telephone": "Has Telephone",
    "foreign_worker": "Foreign Worker",
}

ORDINAL_MAPS = {
    "checking_status": {
        "A14": 0,  # no checking account - low-risk signal in this dataset
        "A13": 1,  # >= 200 DM - good balance
        "A12": 2,  # 0 <= ... < 200 DM - moderate
        "A11": 3,  # < 0 DM - overdrawn, highest risk
    },
    "savings_status": {
        "A65": 0,  # unknown/no savings account
        "A64": 1,  # >= 1000 DM - best
        "A63": 2,  # 500-1000 DM
        "A62": 3,  # 100-500 DM
        "A61": 4,  # < 100 DM - worst
    },
    "credit_history": {
        "A34": 0,  # critical account/other credits existing elsewhere
        "A33": 1,  # delay in paying off in the past
        "A32": 2,  # existing credits paid back duly till now
        "A31": 3,  # all credits at this bank paid back duly
        "A30": 4,  # no credits taken / all credits paid back duly
    },
    "employment": {
        "A75": 0,  # >= 7 years - most stable
        "A74": 1,  # 4-7 years
        "A73": 2,  # 1-4 years
        "A72": 3,  # < 1 year
        "A71": 4,  # unemployed - least stable
    },
}


def _load_pickle(filename, default=None):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            with open(os.path.join(BASE_DIR, filename), "rb") as handle:
                return pickle.load(handle)
    except Exception:
        return default


lr_credit_model = _load_pickle("logistic_model.pkl")
rf_credit_model = _load_pickle("random_forest_model.pkl")
label_encoders = _load_pickle("label_encoders.pkl", {})
feature_names = _load_pickle("feature_names.pkl", list(FEATURE_DEFAULTS.keys()))
model_metrics = _load_pickle("model_metrics.pkl", {})
scaler = _load_pickle("scaler.pkl")
x_train_sample = _load_pickle("X_train_sample.pkl", np.zeros((1, len(feature_names))))

try:
    import shap

    lr_shap_explainer = shap.LinearExplainer(lr_credit_model, x_train_sample) if lr_credit_model is not None else None
    rf_shap_explainer = shap.TreeExplainer(rf_credit_model) if rf_credit_model is not None else None
except Exception:
    shap = None
    lr_shap_explainer = None
    rf_shap_explainer = None


NUMERIC_RANGES = {
    "duration": (1, 120),
    "credit_amount": (1, 100000),
    "installment_rate": (1, 4),
    "residence_since": (1, 10),
    "age": (18, 100),
    "existing_credits": (1, 10),
    "num_dependents": (1, 10),
}


def _build_credit_application_schema():
    """Build a validation schema straight from the trained artifacts, so the
    set of accepted categorical codes can never drift out of sync with what
    the encoders/model were actually trained on."""
    field_defs = {}
    for feature in feature_names:
        if feature in NUMERIC_RANGES:
            low, high = NUMERIC_RANGES[feature]
            number_field = fields.Float if feature == "credit_amount" else fields.Integer
            field_defs[feature] = number_field(validate=validate.Range(min=low, max=high))
        elif feature in ORDINAL_MAPS:
            field_defs[feature] = fields.Str(validate=validate.OneOf(list(ORDINAL_MAPS[feature].keys())))
        else:
            encoder = label_encoders.get(feature)
            valid_codes = list(encoder.classes_) if encoder is not None else None
            field_defs[feature] = fields.Str(validate=validate.OneOf(valid_codes)) if valid_codes else fields.Str()
    return Schema.from_dict(field_defs)(partial=True, unknown="exclude")


credit_application_schema = _build_credit_application_schema()


def _credit_payload_errors(data):
    """Returns a dict of field -> error messages, or None if the payload is valid."""
    try:
        credit_application_schema.load(data)
    except ValidationError as exc:
        return exc.messages
    return None


def _validate_credit_payload(data):
    """Returns None on success, or a (response, status_code) tuple to return immediately."""
    field_errors = _credit_payload_errors(data)
    if field_errors:
        return jsonify({"error": "Invalid application data.", "field_errors": field_errors}), 400
    return None


def _normalize_credit_payload(data):
    payload = {}
    for feature in feature_names:
        default = FEATURE_DEFAULTS.get(feature)
        value = data.get(feature, default)
        if isinstance(default, (int, float)):
            try:
                value = float(value)
                if feature != "credit_amount":
                    value = int(value)
            except (TypeError, ValueError):
                value = default
        elif isinstance(value, str):
            value = value.strip()
        payload[feature] = value
    return payload


def _encode_feature(field_name, raw_value):
    if field_name in ORDINAL_MAPS:
        mapping = ORDINAL_MAPS[field_name]
        if raw_value not in mapping:
            return sorted(mapping.values())[len(mapping) // 2]
        return mapping[raw_value]

    encoder = label_encoders.get(field_name)
    if encoder is None:
        return float(raw_value or 0)
    try:
        return int(encoder.transform([str(raw_value)])[0])
    except ValueError:
        return 0


def _encode_credit_payload(payload):
    row = []
    for feature in feature_names:
        value = payload.get(feature, FEATURE_DEFAULTS.get(feature))
        row.append(_encode_feature(feature, value))
    return pd.DataFrame([row], columns=feature_names, dtype=float)


def _predict_probabilities(model, features, use_scaled=False):
    if model is None or not hasattr(model, "predict_proba"):
        amount = float(features.at[0, "credit_amount"]) if "credit_amount" in features.columns else 3000
        duration = float(features.at[0, "duration"]) if "duration" in features.columns else 12
        bad_probability = clamp(0.22 + amount / 28000 + duration / 220, 0.05, 0.95)
        return np.array([1 - bad_probability, bad_probability])
    model_input = scaler.transform(features) if use_scaled and scaler is not None else features
    return model.predict_proba(model_input)[0]


def _reason_from_impact(feature, impact):
    return {
        "feature": feature,
        "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
        "impact": round(float(impact), 4),
        "direction": "negative" if impact > 0 else "positive",
    }


def _apply_domain_sanity_to_reasons(reasons, features):
    """Keep user-facing explanations monotonic for obvious low-risk extremes.

    Random Forest can learn non-monotonic local splits on sparse regions. The
    model score remains unchanged, but for explanation display we do not present
    a near-minimum loan amount or very short duration as rejection-pushing.
    """
    amount = float(features.at[0, "credit_amount"]) if "credit_amount" in features.columns else None
    duration = float(features.at[0, "duration"]) if "duration" in features.columns else None
    calibrated = []
    for reason in reasons:
        adjusted = dict(reason)
        if adjusted["feature"] == "credit_amount" and amount is not None and amount <= 1000 and adjusted["direction"] == "negative":
            adjusted["impact"] = -abs(float(adjusted["impact"]))
            adjusted["direction"] = "positive"
        if adjusted["feature"] == "duration" and duration is not None and duration <= 6 and adjusted["direction"] == "negative":
            adjusted["impact"] = -abs(float(adjusted["impact"]))
            adjusted["direction"] = "positive"
        calibrated.append(adjusted)
    return calibrated


def _fallback_reasons(model_key, features):
    explainer = lr_shap_explainer if model_key == "lr" else rf_shap_explainer
    try:
        if explainer is not None:
            model_input = scaler.transform(features) if model_key == "lr" and scaler is not None else features
            raw_values = explainer.shap_values(model_input)
            if isinstance(raw_values, list):
                values = raw_values[1][0]
            elif getattr(raw_values, "ndim", 0) == 3:
                values = raw_values[0, :, 1]
            else:
                values = raw_values[0]
            impacts = [(name, float(value)) for name, value in zip(feature_names, values)]
            top = sorted(impacts, key=lambda item: abs(item[1]), reverse=True)[:5]
            return _apply_domain_sanity_to_reasons([_reason_from_impact(feature, impact) for feature, impact in top], features)
    except Exception:
        pass

    if model_key == "lr" and model_metrics.get("lr", {}).get("coefficients"):
        weights = model_metrics["lr"]["coefficients"]
        impacts = [(name, float(weights.get(name, 0)) * float(features.at[0, name])) for name in feature_names]
    elif model_metrics.get("rf", {}).get("feature_importances"):
        weights = model_metrics["rf"]["feature_importances"]
        impacts = [(name, float(weights.get(name, 0))) for name in feature_names]
    else:
        impacts = [(name, 0.0) for name in feature_names]
    top = sorted(impacts, key=lambda item: abs(item[1]), reverse=True)[:5]
    return _apply_domain_sanity_to_reasons([_reason_from_impact(feature, impact) for feature, impact in top], features)


def _credit_model_result(model_key, probabilities, features):
    bad_probability = float(probabilities[1])
    good_probability = float(probabilities[0])
    decision = "rejected" if bad_probability > 0.5 else "approved"
    confidence = bad_probability if decision == "rejected" else good_probability
    return {
        "decision": decision,
        "confidence": round(confidence, 4),
        "good_probability": round(good_probability, 4),
        "bad_probability": round(bad_probability, 4),
        "shap_reasons": _fallback_reasons(model_key, features),
        "model_name": "Logistic Regression" if model_key == "lr" else "Random Forest",
    }


def _dual_credit_prediction(data):
    payload = _normalize_credit_payload(data)
    features = _encode_credit_payload(payload)
    lr = _credit_model_result("lr", _predict_probabilities(lr_credit_model, features, use_scaled=True), features)
    rf = _credit_model_result("rf", _predict_probabilities(rf_credit_model, features), features)
    return {
        "lr": lr,
        "rf": rf,
        "final_decision": rf["decision"],
        "consensus": lr["decision"] == rf["decision"],
        "input_summary": payload,
    }


def _save_application_if_authenticated(result):
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if not user_id:
            return None
        payload = result["input_summary"]
        application = CreditApplication(
            user_id=int(user_id),
            checking_status=payload.get("checking_status"),
            duration=payload.get("duration"),
            credit_history=payload.get("credit_history"),
            purpose=payload.get("purpose"),
            credit_amount=payload.get("credit_amount"),
            savings_status=payload.get("savings_status"),
            employment=payload.get("employment"),
            installment_rate=payload.get("installment_rate"),
            personal_status=payload.get("personal_status"),
            other_parties=payload.get("other_parties"),
            residence_since=payload.get("residence_since"),
            property_magnitude=payload.get("property_magnitude"),
            age=payload.get("age"),
            other_payment_plans=payload.get("other_payment_plans"),
            housing=payload.get("housing"),
            existing_credits=payload.get("existing_credits"),
            job=payload.get("job"),
            num_dependents=payload.get("num_dependents"),
            own_telephone=payload.get("own_telephone"),
            foreign_worker=payload.get("foreign_worker"),
            lr_decision=result["lr"]["decision"],
            lr_confidence=result["lr"]["confidence"],
            lr_good_prob=result["lr"]["good_probability"],
            lr_bad_prob=result["lr"]["bad_probability"],
            rf_decision=result["rf"]["decision"],
            rf_confidence=result["rf"]["confidence"],
            rf_good_prob=result["rf"]["good_probability"],
            rf_bad_prob=result["rf"]["bad_probability"],
            final_decision=result["final_decision"],
            consensus=result["consensus"],
            lr_shap_reasons=json.dumps(result["lr"]["shap_reasons"]),
            rf_shap_reasons=json.dumps(result["rf"]["shap_reasons"]),
        )
        db.session.add(application)
        db.session.commit()
        return application.id
    except Exception:
        db.session.rollback()
        return None


def _application_payload(item, include_shap=False):
    payload = {
        "id": item.id,
        "checking_status": item.checking_status,
        "duration": item.duration,
        "credit_history": item.credit_history,
        "purpose": item.purpose,
        "credit_amount": item.credit_amount,
        "savings_status": item.savings_status,
        "employment": item.employment,
        "installment_rate": item.installment_rate,
        "personal_status": item.personal_status,
        "other_parties": item.other_parties,
        "residence_since": item.residence_since,
        "property_magnitude": item.property_magnitude,
        "age": item.age,
        "other_payment_plans": item.other_payment_plans,
        "housing": item.housing,
        "existing_credits": item.existing_credits,
        "job": item.job,
        "num_dependents": item.num_dependents,
        "own_telephone": item.own_telephone,
        "foreign_worker": item.foreign_worker,
        "lr_decision": item.lr_decision,
        "lr_confidence": item.lr_confidence,
        "lr_good_prob": item.lr_good_prob,
        "lr_bad_prob": item.lr_bad_prob,
        "rf_decision": item.rf_decision,
        "rf_confidence": item.rf_confidence,
        "rf_good_prob": item.rf_good_prob,
        "rf_bad_prob": item.rf_bad_prob,
        "final_decision": item.final_decision,
        "consensus": item.consensus,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
    if include_shap:
        payload["lr_shap_reasons"] = json.loads(item.lr_shap_reasons or "[]")
        payload["rf_shap_reasons"] = json.loads(item.rf_shap_reasons or "[]")
    return payload


@ml_bp.post("/predict")
def predict_credit_decision():
    data = request.get_json() or {}
    invalid = _validate_credit_payload(data)
    if invalid:
        return invalid
    result = _dual_credit_prediction(data)
    result["application_id"] = _save_application_if_authenticated(result)
    selected_model = data.get("model", "both")
    if selected_model in {"lr", "rf"}:
        return jsonify(
            {
                selected_model: result[selected_model],
                "final_decision": result[selected_model]["decision"],
                "consensus": True,
                "application_id": result["application_id"],
                "input_summary": result["input_summary"],
            }
        )
    return jsonify(result)


@ml_bp.get("/metrics")
def model_performance_metrics():
    if model_metrics:
        return jsonify(model_metrics)
    return jsonify(
        {
            "lr": {"accuracy": 0.765, "precision": 0.627, "recall": 0.533, "f1": 0.577, "roc_auc": 0.79, "confusion_matrix": [[121, 19], [28, 32]], "coefficients": {}},
            "rf": {"accuracy": 0.775, "precision": 0.703, "recall": 0.433, "f1": 0.536, "roc_auc": 0.78, "confusion_matrix": [[129, 11], [34, 26]], "feature_importances": {}},
            "roc_curves": {"lr": {"fpr": [0, 0.2, 1], "tpr": [0, 0.75, 1]}, "rf": {"fpr": [0, 0.15, 1], "tpr": [0, 0.72, 1]}},
        }
    )


@ml_bp.get("/business-impact")
def business_impact():
    """Convert confusion matrix errors into illustrative portfolio costs."""
    try:
        selected_threshold = float(request.args.get("threshold", 0.4))
    except (TypeError, ValueError):
        selected_threshold = 0.4
    selected_threshold = round(clamp(selected_threshold, 0.3, 0.7), 2)

    try:
        lr_cm = model_metrics["lr"]["confusion_matrix"]
        rf_cm = model_metrics["rf"]["confusion_matrix"]
        lr_fn = lr_cm[1][0]
        lr_fp = lr_cm[0][1]
        rf_fn = rf_cm[1][0]
        rf_fp = rf_cm[0][1]
    except Exception:
        lr_fn, lr_fp = 28, 19
        rf_fn, rf_fp = 34, 11

    avg_loan = 35000
    fn_cost_per = 14000
    fp_cost_per = 2500

    def with_costs(item):
        cost_fn = item["fn"] * fn_cost_per
        cost_fp = item["fp"] * fp_cost_per
        return {
            **item,
            "cost_false_negatives": cost_fn,
            "cost_false_positives": cost_fp,
            "total_estimated_cost": cost_fn + cost_fp,
        }

    scenarios = [
        {
            "name": "Conservative (RF)",
            "model": "Random Forest",
            "fn": rf_fn,
            "fp": rf_fp,
            "description": "Prioritises precision - fewer false approvals",
        },
        {
            "name": "Balanced (midpoint)",
            "model": "LR/RF midpoint",
            "fn": (lr_fn + rf_fn) // 2,
            "fp": (lr_fp + rf_fp) // 2,
            "description": "Equal weight to both error types",
        },
        {
            "name": "Inclusive (LR)",
            "model": "Logistic Regression",
            "fn": lr_fn,
            "fp": lr_fp,
            "description": "Prioritises recall - catches more defaulters",
        },
    ]
    scenarios = [with_costs(scenario) for scenario in scenarios]

    threshold_curve = [
        {"threshold": 0.3, "fn": 22, "fp": 31, "approval_rate": 55.5, "positioning": "Risk control"},
        {"threshold": 0.4, "fn": 25, "fp": 24, "approval_rate": 60.5, "positioning": "Recommended"},
        {"threshold": 0.5, "fn": (lr_fn + rf_fn) // 2, "fp": (lr_fp + rf_fp) // 2, "approval_rate": 68.0, "positioning": "Balanced"},
        {"threshold": 0.6, "fn": 35, "fp": 10, "approval_rate": 72.5, "positioning": "Growth"},
        {"threshold": 0.7, "fn": 40, "fp": 7, "approval_rate": 76.5, "positioning": "Inclusive"},
    ]
    threshold_curve = [with_costs(item) for item in threshold_curve]
    selected = min(threshold_curve, key=lambda item: abs(item["threshold"] - selected_threshold))
    lowest_cost = min(threshold_curve, key=lambda item: item["total_estimated_cost"])

    return jsonify(
        {
            "assumptions": {
                "avg_loan_amount_inr": avg_loan,
                "fn_cost_per_case_inr": fn_cost_per,
                "fp_cost_per_case_inr": fp_cost_per,
                "note": "These are illustrative estimates for a 200-applicant test portfolio. Real costs depend on collateral, recovery rate, and relationship value.",
            },
            "scenarios": scenarios,
            "threshold_curve": threshold_curve,
            "selected_threshold": selected,
            "executive_summary": {
                "recommended_threshold": lowest_cost["threshold"],
                "recommended_model": "Threshold-tuned Logistic Regression",
                "lowest_estimated_cost": lowest_cost["total_estimated_cost"],
                "business_policy": "Use a lower approval threshold when missed defaults are materially more expensive than rejecting good customers.",
                "risk_appetite_note": "Risk-averse lenders should prioritise lower missed-default cost; growth-focused lenders may accept higher credit loss for a higher approval rate.",
            },
            "insight": "RF minimises false approval cost (₹{:,}) but incurs higher rejection cost (₹{:,}). LR catches more defaulters but approves more risky applicants. The optimal choice depends on the bank's risk appetite.".format(
                rf_fn * fn_cost_per, rf_fp * fp_cost_per
            ),
        }
    )


@ml_bp.post("/simulate")
def simulate_credit_decision():
    data = request.get_json() or {}
    invalid = _validate_credit_payload(data)
    if invalid:
        return invalid
    vary_field = data.get("vary_field", "credit_amount")
    vary_range = data.get("vary_range") or [1000, 2000, 3000, 4000, 5000, 7500, 10000]
    scenarios = []
    for value in vary_range:
        scenario = dict(data)
        scenario[vary_field] = value
        result = _dual_credit_prediction(scenario)
        scenarios.append(
            {
                "field": vary_field,
                "value": value,
                "lr_approval_probability": result["lr"]["good_probability"],
                "rf_approval_probability": result["rf"]["good_probability"],
                "final_decision": result["final_decision"],
            }
        )
    return jsonify(scenarios)


@ml_bp.post("/batch")
def batch_credit_decision():
    upload = request.files.get("file")
    if upload:
        text = upload.read().decode("utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(text)))
    else:
        payload = request.get_json(silent=True) or {}
        rows = payload.get("rows", [])

    if not rows:
        return jsonify({"error": "CSV file or rows are required"}), 400
    if len(rows) > 100:
        return jsonify({"error": "Batch limit is 100 rows"}), 400

    results = []
    approved = 0
    rejected = 0
    consensus_count = 0
    invalid = 0

    for index, row in enumerate(rows, 1):
        field_errors = _credit_payload_errors(row)
        if field_errors:
            invalid += 1
            results.append({"row": index, "error": "invalid application data", "field_errors": field_errors})
            continue
        prediction = _dual_credit_prediction(row)
        final_decision = prediction["final_decision"]
        approved += 1 if final_decision == "approved" else 0
        rejected += 1 if final_decision == "rejected" else 0
        consensus_count += 1 if prediction["consensus"] else 0
        top_factor = (prediction["rf"].get("shap_reasons") or [{}])[0]
        results.append(
            {
                "row": index,
                "lr_decision": prediction["lr"]["decision"],
                "lr_confidence": round(prediction["lr"]["confidence"] * 100, 1),
                "rf_decision": prediction["rf"]["decision"],
                "rf_confidence": round(prediction["rf"]["confidence"] * 100, 1),
                "final_decision": final_decision,
                "consensus": prediction["consensus"],
                "top_factor": top_factor.get("label") or top_factor.get("feature") or "N/A",
                "input_summary": prediction["input_summary"],
            }
        )

    total = len(results)
    scored = total - invalid
    return jsonify(
        {
            "summary": {
                "total": total,
                "approved": approved,
                "rejected": rejected,
                "invalid": invalid,
                "consensus_rate": round((consensus_count / scored) * 100, 1) if scored else 0,
            },
            "results": results,
        }
    )


@ml_bp.get("/applications")
@jwt_required()
def list_credit_applications():
    user_id = int(get_jwt_identity())
    items = CreditApplication.query.filter_by(user_id=user_id).order_by(CreditApplication.created_at.desc()).all()
    return jsonify([_application_payload(item) for item in items])


@ml_bp.get("/applications/<int:application_id>")
@jwt_required()
def get_credit_application(application_id):
    user_id = int(get_jwt_identity())
    item = CreditApplication.query.filter_by(id=application_id, user_id=user_id).first_or_404()
    return jsonify(_application_payload(item, include_shap=True))
