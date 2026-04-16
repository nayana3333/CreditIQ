from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Transaction


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    user_id = int(get_jwt_identity())
    txs = Transaction.query.filter_by(user_id=user_id).all()

    income = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type in ["expense", "emi"])
    savings = income - expenses
    score = max(300, min(900, 720 - ((expenses / income) * 160 if income > 0 else 160)))

    return jsonify(
        {
            "totals": {
                "income": round(income, 2),
                "expenses": round(expenses, 2),
                "savings": round(savings, 2),
            },
            "credit_score": round(score, 0),
            "risk_level": "Low" if score >= 730 else "Medium" if score >= 650 else "High",
        }
    )
