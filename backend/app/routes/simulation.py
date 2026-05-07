from flask import Blueprint, jsonify, request

from ..finance import risk_from_score, score_from_finances

simulation_bp = Blueprint("simulation", __name__)


@simulation_bp.post("/run")
def run_simulation():
    data = request.get_json() or {}

    try:
        current_score = float(data.get("current_score", 700))
        current_income = max(float(data.get("current_income", 0) or 0), 0)
        current_expenses = max(float(data.get("current_expenses", 0) or 0), 0)
        income_delta = float(data.get("income_delta", 0) or 0)
        expense_delta = float(data.get("expense_delta", 0) or 0)
        emi_delta = float(data.get("emi_delta", 0) or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "All simulation values must be valid numbers."}), 400

    projected_income = max(current_income + income_delta, 0)
    projected_expenses = max(current_expenses + expense_delta + emi_delta, 0)

    if projected_income > 0:
        projected = score_from_finances(projected_income, projected_expenses, max(emi_delta, 0), current_score)
    else:
        projected = current_score + (income_delta * 0.01) - (expense_delta * 0.015) - (emi_delta * 0.02)
        projected = max(300, min(900, projected))

    return jsonify({
        "projected_score": round(projected),
        "projected_risk": risk_from_score(projected),
        "projected_income": round(projected_income, 2),
        "projected_expenses": round(projected_expenses, 2),
    })
