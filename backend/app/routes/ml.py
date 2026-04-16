from flask import Blueprint, jsonify, request

ml_bp = Blueprint("ml", __name__)


def _clamp_score(value: float):
    return max(300, min(900, value))


@ml_bp.post("/credit-score/predict")
def predict_score():
    data = request.get_json() or {}
    income = float(data.get("income", 0))
    expenses = float(data.get("expenses", 0))
    emi = float(data.get("emi", 0))
    loan_utilization = float(data.get("loan_utilization", 0.3))

    expense_ratio = (expenses / income) if income > 0 else 1.0
    raw_score = 760 - (expense_ratio * 180) - (emi * 0.03) - (loan_utilization * 120)

    return jsonify({
        "credit_score": round(_clamp_score(raw_score), 0),
        "model": "rule-based-baseline-v1"
    })


@ml_bp.post("/risk/predict")
def predict_risk():
    data = request.get_json() or {}
    expense_ratio = float(data.get("expense_ratio", 0.5))
    missed_emi_count = int(data.get("missed_emi_count", 0))

    risk_score = (expense_ratio * 0.7) + min(missed_emi_count / 6, 1.0) * 0.3
    level = "Low"
    if risk_score >= 0.7:
        level = "High"
    elif risk_score >= 0.4:
        level = "Medium"

    return jsonify({"risk_level": level, "risk_score": round(risk_score, 2), "model": "baseline-classifier-v1"})
