import pickle
import numpy as np
import os
import warnings
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..finance import clamp, risk_from_score, score_from_finances
from ..extensions import db
from ..models import Prediction

ml_bp = Blueprint("ml", __name__)

# Load Random Forest model
def load_model():
    model_path = os.path.join(os.path.dirname(__file__), '..', '..', 'random_forest_model.pkl')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            with open(model_path, 'rb') as f:
                return pickle.load(f)
    except Exception:
        # Try alternative path
        alt_path = os.path.join(os.path.dirname(__file__), '..', 'random_forest_model.pkl')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                with open(alt_path, 'rb') as f:
                    return pickle.load(f)
        except Exception:
            return None

# Global model variable
rf_model = load_model()

def _map_features_to_input(data):
    """Map API input to model features"""
    # Extract basic features
    age = int(data.get("age", 35))
    gender = 1 if data.get("gender", "male").lower() == "male" else 0
    income = float(data.get("income", 50000))
    
    # Map education level
    edu_map = {"high school": 0, "associate": 1, "bachelor": 2, "master": 3, "doctorate": 4}
    education = edu_map.get(data.get("education", "bachelor").lower(), 2)
    
    # Map marital status
    marital = 1 if data.get("marital_status", "single").lower() == "married" else 0
    children = int(data.get("children", 0))
    home_ownership = 1 if data.get("home_ownership", "rented").lower() == "owned" else 0
    
    return np.array([[age, gender, income, education, marital, children, home_ownership]])

def _credit_class_to_score(credit_class, income=50000, expenses=0, emi=0):
    """Convert model class and financial context to a deterministic credit score."""
    base_scores = {0: 560, 1: 680, 2: 790}
    return score_from_finances(income, expenses, emi, base_scores.get(int(credit_class), 680))

def _credit_class_to_risk(credit_class):
    """Convert class to risk level"""
    if credit_class == 2:
        return "Low"
    elif credit_class == 1:
        return "Medium"
    else:
        return "High"


def _fallback_score_response(income, expenses, emi):
    credit_score = score_from_finances(income, expenses, emi)
    return {
        "credit_score": credit_score,
        "credit_class": 2 if credit_score >= 730 else 1 if credit_score >= 650 else 0,
        "confidence": 0.75,
        "model": "deterministic-finance-v1"
    }


def _reason_codes(income, expenses, emi, score):
    income = max(float(income), 0)
    expenses = max(float(expenses), 0)
    emi = max(float(emi), 0)
    reasons = []
    if income <= 0:
        reasons.append({"label": "Income missing", "impact": "negative", "detail": "Income is needed for stronger credit assessment."})
        return reasons
    expense_ratio = expenses / income
    emi_ratio = emi / income
    savings_rate = (income - expenses) / income
    reasons.append({"label": "Savings rate", "impact": "positive" if savings_rate >= 0.2 else "negative", "detail": f"Savings rate is {savings_rate * 100:.1f}%."})
    reasons.append({"label": "Expense ratio", "impact": "positive" if expense_ratio <= 0.6 else "negative", "detail": f"Expenses use {expense_ratio * 100:.1f}% of income."})
    reasons.append({"label": "EMI burden", "impact": "positive" if emi_ratio <= 0.35 else "negative", "detail": f"EMI burden is {emi_ratio * 100:.1f}% of income."})
    reasons.append({"label": "Risk band", "impact": "positive" if score >= 730 else "neutral" if score >= 650 else "negative", "detail": f"Score maps to {risk_from_score(score)} risk."})
    return reasons


def _persist_prediction_if_authenticated(score):
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            db.session.add(Prediction(user_id=int(user_id), credit_score=score, risk_level=risk_from_score(score)))
            db.session.commit()
    except Exception:
        db.session.rollback()


@ml_bp.post("/credit-score/predict")
def predict_score():
    data = request.get_json() or {}
    income = float(data.get("income", 50000) or 50000)
    expenses = float(data.get("expenses", data.get("monthly_expenses", 0)) or 0)
    emi = float(data.get("emi", data.get("monthly_emi", 0)) or 0)

    if rf_model is None:
        response = _fallback_score_response(income, expenses, emi)
        response["reason_codes"] = _reason_codes(income, expenses, emi, response["credit_score"])
        _persist_prediction_if_authenticated(response["credit_score"])
        return jsonify(response)
    
    try:
        features = _map_features_to_input(data)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            prediction = rf_model.predict(features)[0]
            probabilities = rf_model.predict_proba(features)[0]
    except Exception:
        response = _fallback_score_response(income, expenses, emi)
        response["reason_codes"] = _reason_codes(income, expenses, emi, response["credit_score"])
        _persist_prediction_if_authenticated(response["credit_score"])
        return jsonify(response)
    
    # Convert to credit score
    credit_score = _credit_class_to_score(prediction, income, expenses, emi)
    
    response = {
        "credit_score": credit_score,
        "credit_class": int(prediction),
        "confidence": float(max(probabilities)),
        "model": "random-forest-v1",
        "reason_codes": _reason_codes(income, expenses, emi, credit_score),
    }
    _persist_prediction_if_authenticated(credit_score)
    return jsonify(response)


@ml_bp.get("/credit-score/history")
def score_history():
    verify_jwt_in_request()
    user_id = int(get_jwt_identity())
    items = Prediction.query.filter_by(user_id=user_id).order_by(Prediction.timestamp.asc()).all()
    return jsonify(
        [
            {
                "id": item.id,
                "credit_score": round(item.credit_score),
                "risk_level": item.risk_level,
                "date": item.timestamp.isoformat(),
            }
            for item in items
        ]
    )


@ml_bp.post("/risk/predict")
def predict_risk():
    data = request.get_json() or {}
    income = float(data.get("income", 50000) or 50000)
    expenses = float(data.get("expenses", data.get("monthly_expenses", 0)) or 0)
    emi = float(data.get("emi", data.get("monthly_emi", 0)) or 0)

    if rf_model is None:
        fallback = _fallback_score_response(income, expenses, emi)
        return jsonify({
            "risk_level": risk_from_score(fallback["credit_score"]),
            "risk_score": clamp((730 - fallback["credit_score"]) / 430, 0, 1),
            "credit_class": fallback["credit_class"],
            "confidence": fallback["confidence"],
            "model": fallback["model"]
        })
    
    try:
        features = _map_features_to_input(data)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            prediction = rf_model.predict(features)[0]
            probabilities = rf_model.predict_proba(features)[0]
    except Exception:
        fallback = _fallback_score_response(income, expenses, emi)
        return jsonify({
            "risk_level": risk_from_score(fallback["credit_score"]),
            "risk_score": clamp((730 - fallback["credit_score"]) / 430, 0, 1),
            "credit_class": fallback["credit_class"],
            "confidence": fallback["confidence"],
            "model": fallback["model"]
        })
    
    # Convert to risk level
    credit_score = _credit_class_to_score(prediction, income, expenses, emi)
    risk_level = risk_from_score(credit_score)
    risk_score = clamp((730 - credit_score) / 430, 0, 1)
    
    return jsonify({
        "risk_level": risk_level,
        "risk_score": risk_score,
        "credit_class": int(prediction),
        "confidence": float(max(probabilities)),
        "model": "random-forest-v1"
    })
