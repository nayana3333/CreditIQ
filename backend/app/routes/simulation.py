from flask import Blueprint, jsonify, request

simulation_bp = Blueprint("simulation", __name__)


@simulation_bp.post("/run")
def run_simulation():
    data = request.get_json() or {}

    current_score = float(data.get("current_score", 700))
    income_delta = float(data.get("income_delta", 0))
    expense_delta = float(data.get("expense_delta", 0))

    projected = current_score + (income_delta * 0.01) - (expense_delta * 0.015)
    projected = max(300, min(900, projected))

    risk = "Low" if projected >= 730 else "Medium" if projected >= 650 else "High"

    return jsonify({"projected_score": round(projected, 0), "projected_risk": risk})
