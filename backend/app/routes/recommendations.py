from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import date

from ..models import Budget, Loan, Transaction

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.get("")
@jwt_required()
def get_recommendations():
    user_id = int(get_jwt_identity())
    month_start = date.today().replace(day=1)
    txs = Transaction.query.filter(Transaction.user_id == user_id, Transaction.tx_date >= month_start).all()
    loans = Loan.query.filter_by(user_id=user_id).all()
    budgets = Budget.query.filter_by(user_id=user_id).all()

    income = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type in ["expense", "emi"])
    food_expenses = sum(
        t.amount for t in txs if t.type in ["expense", "emi"] and t.category.lower() == "food"
    )
    total_emi = sum(l.emi for l in loans)
    savings_rate = ((income - expenses) / income) if income else 0

    suggestions = []
    if income > 0 and expenses / income > 0.75:
        suggestions.append(f"Your expenses are {(expenses / income) * 100:.1f}% of income. Reduce flexible spending by at least 10%.")
    if expenses > 0 and food_expenses / expenses > 0.3:
        suggestions.append(f"Food spending is {(food_expenses / expenses) * 100:.1f}% of expenses. Add or tighten a Food budget.")
    if income > 0 and total_emi / income > 0.4:
        suggestions.append(f"Your EMI is {(total_emi / income) * 100:.1f}% of income. Consider refinancing before taking new debt.")
    if income > 0 and savings_rate < 0.1:
        suggestions.append(f"Your savings rate is {savings_rate * 100:.1f}%. Aim for at least 10% this month.")
    for budget in budgets:
        spent = sum(t.amount for t in txs if t.type in ["expense", "emi"] and t.category.lower() == budget.category.lower())
        if budget.monthly_limit and spent >= budget.monthly_limit * 0.8:
            suggestions.append(f"{budget.category} budget is at {(spent / budget.monthly_limit) * 100:.1f}% usage.")
    if not suggestions:
        suggestions.append("Financial behavior looks stable. Continue monthly reviews and timely EMI payments.")

    return jsonify({"recommendations": suggestions})
