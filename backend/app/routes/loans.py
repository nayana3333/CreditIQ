import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..finance import amortization_schedule, loan_months, money
from ..models import Loan, LoanDecision

loans_bp = Blueprint("loans", __name__)


def _loan_payload(item):
    months = loan_months(item.loan_amount, item.interest_rate or 0, item.emi or 0)
    schedule = amortization_schedule(item.loan_amount, item.interest_rate, months, max_rows=None) if months else []
    interest = money(sum(row["interest"] for row in schedule)) if schedule else None
    decision = getattr(item, "decision", None)
    return {
        "id": item.id,
        "loan_amount": item.loan_amount,
        "credit_amount": getattr(item, "credit_amount", None) if getattr(item, "credit_amount", None) is not None else item.loan_amount,
        "duration": item.duration,
        "purpose": item.purpose,
        "age": item.age,
        "employment": item.employment,
        "status": decision.final_decision if decision else item.status or "pending",
        "created_at": item.created_at.isoformat(),
        "emi": item.emi,
        "interest_rate": item.interest_rate,
        "estimated_months": months,
        "estimated_interest": interest,
        "estimated_total_payable": money(item.loan_amount + interest) if interest is not None else None,
    }


@loans_bp.post("")
@jwt_required()
def add_loan():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    try:
        loan_amount = money(data.get("loan_amount", data.get("credit_amount", 0)))
        emi = money(data.get("emi", 0))
        interest_rate = float(data.get("interest_rate", 0) or 0)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if loan_amount <= 0 or interest_rate < 0:
        return jsonify({"error": "loan_amount must be positive; interest_rate cannot be negative"}), 400

    loan = Loan(
        user_id=user_id,
        loan_amount=loan_amount,
        emi=emi,
        interest_rate=interest_rate,
        duration=data.get("duration"),
        purpose=data.get("purpose"),
        checking_status=data.get("checking_status"),
        credit_history=data.get("credit_history"),
        savings_status=data.get("savings_status"),
        employment=data.get("employment"),
        installment_rate=data.get("installment_rate"),
        personal_status=data.get("personal_status"),
        other_parties=data.get("other_parties"),
        residence_since=data.get("residence_since"),
        property_magnitude=data.get("property_magnitude"),
        age=data.get("age"),
        other_payment_plans=data.get("other_payment_plans"),
        housing=data.get("housing"),
        existing_credits=data.get("existing_credits"),
        job=data.get("job"),
        num_dependents=data.get("num_dependents"),
        own_telephone=data.get("own_telephone"),
        foreign_worker=data.get("foreign_worker"),
        status=data.get("final_decision") or data.get("status"),
    )
    db.session.add(loan)
    db.session.commit()
    decision = data.get("decision_result")
    if decision:
        item = LoanDecision(
            loan_id=loan.id,
            user_id=user_id,
            lr_decision=decision.get("lr", {}).get("decision"),
            lr_confidence=decision.get("lr", {}).get("confidence"),
            lr_good_prob=decision.get("lr", {}).get("good_probability"),
            lr_bad_prob=decision.get("lr", {}).get("bad_probability"),
            rf_decision=decision.get("rf", {}).get("decision"),
            rf_confidence=decision.get("rf", {}).get("confidence"),
            rf_good_prob=decision.get("rf", {}).get("good_probability"),
            rf_bad_prob=decision.get("rf", {}).get("bad_probability"),
            final_decision=decision.get("final_decision"),
            consensus=bool(decision.get("consensus")),
            lr_shap_reasons=json.dumps(decision.get("lr", {}).get("shap_reasons", [])),
            rf_shap_reasons=json.dumps(decision.get("rf", {}).get("shap_reasons", [])),
            shap_reasons=json.dumps(decision.get("rf", {}).get("shap_reasons", [])),
            input_features=json.dumps(decision.get("input_summary", data)),
        )
        db.session.add(item)
        loan.status = decision.get("final_decision")
        db.session.commit()
    return jsonify({"id": loan.id, "message": "loan added", "loan": _loan_payload(loan)}), 201


@loans_bp.get("")
@jwt_required()
def list_loans():
    user_id = int(get_jwt_identity())
    items = Loan.query.filter_by(user_id=user_id).order_by(Loan.id.desc()).all()
    return jsonify(
        [
            _loan_payload(item)
            for item in items
        ]
    )


@loans_bp.get("/<int:loan_id>/decision")
@jwt_required()
def get_loan_decision(loan_id):
    user_id = int(get_jwt_identity())
    loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first_or_404()
    decision = LoanDecision.query.filter_by(loan_id=loan.id, user_id=user_id).first()
    input_features = {}
    if decision and decision.input_features:
        input_features = json.loads(decision.input_features)
    else:
        input_features = {
            "checking_status": loan.checking_status,
            "duration": loan.duration,
            "credit_history": loan.credit_history,
            "purpose": loan.purpose,
            "credit_amount": loan.loan_amount,
            "savings_status": loan.savings_status,
            "employment": loan.employment,
            "installment_rate": loan.installment_rate,
            "personal_status": loan.personal_status,
            "other_parties": loan.other_parties,
            "residence_since": loan.residence_since,
            "property_magnitude": loan.property_magnitude,
            "age": loan.age,
            "other_payment_plans": loan.other_payment_plans,
            "housing": loan.housing,
            "existing_credits": loan.existing_credits,
            "job": loan.job,
            "num_dependents": loan.num_dependents,
            "own_telephone": loan.own_telephone,
            "foreign_worker": loan.foreign_worker,
        }
    if not decision:
        return jsonify({"loan": _loan_payload(loan), "input_summary": input_features, "final_decision": loan.status or "pending"})
    return jsonify(
        {
            "loan": _loan_payload(loan),
            "lr": {
                "decision": decision.lr_decision,
                "confidence": decision.lr_confidence,
                "good_probability": decision.lr_good_prob,
                "bad_probability": decision.lr_bad_prob,
                "shap_reasons": json.loads(decision.lr_shap_reasons or "[]"),
                "model_name": "Logistic Regression",
            },
            "rf": {
                "decision": decision.rf_decision,
                "confidence": decision.rf_confidence,
                "good_probability": decision.rf_good_prob,
                "bad_probability": decision.rf_bad_prob,
                "shap_reasons": json.loads(decision.rf_shap_reasons or "[]"),
                "model_name": "Random Forest",
            },
            "final_decision": decision.final_decision,
            "consensus": decision.consensus,
            "input_summary": input_features,
            "application_id": loan.id,
            "created_at": decision.created_at.isoformat(),
        }
    )
