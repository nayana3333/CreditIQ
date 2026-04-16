from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Loan, Transaction

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.get("")
@jwt_required()
def get_recommendations():
    user_id = int(get_jwt_identity())
    txs = Transaction.query.filter_by(user_id=user_id).all()
    loans = Loan.query.filter_by(user_id=user_id).all()

    income = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type in ["expense", "emi"])
    food_expenses = sum(
        t.amount for t in txs if t.type in ["expense", "emi"] and t.category.lower() == "food"
    )
    total_emi = sum(l.emi for l in loans)

    suggestions = []
    if income > 0 and expenses / income > 0.75:
        suggestions.append("Reduce variable expenses by at least 10% to avoid overspending risk.")
    if expenses > 0 and food_expenses / expenses > 0.3:
        suggestions.append("Food expenses are high. Set a category limit for dining and delivery.")
    if income > 0 and total_emi / income > 0.4:
        suggestions.append("Your EMI burden is high. Consider prepayment or refinancing options.")
    if not suggestions:
        suggestions.append("Financial behavior looks stable. Continue monthly reviews and timely EMI payments.")

    return jsonify({"recommendations": suggestions})

