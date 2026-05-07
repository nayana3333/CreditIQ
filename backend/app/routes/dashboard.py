from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import date, timedelta

from ..models import Transaction
from ..finance import risk_from_score, score_from_finances


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    user_id = int(get_jwt_identity())
    month_start = date.today().replace(day=1)
    previous_month_end = month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)
    txs = Transaction.query.filter(Transaction.user_id == user_id, Transaction.tx_date >= month_start).all()
    previous_txs = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.tx_date >= previous_month_start,
        Transaction.tx_date < month_start,
    ).all()

    income = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type in ["expense", "emi"])
    emi = sum(t.amount for t in txs if t.type == "emi")
    savings = income - expenses
    score = score_from_finances(income, expenses, emi)

    previous_income = sum(t.amount for t in previous_txs if t.type == "income")
    previous_expenses = sum(t.amount for t in previous_txs if t.type in ["expense", "emi"])
    previous_emi = sum(t.amount for t in previous_txs if t.type == "emi")
    previous_savings = previous_income - previous_expenses
    previous_score = score_from_finances(previous_income, previous_expenses, previous_emi)

    def trend(current, previous):
        if previous == 0:
            return {"percent": None, "direction": "flat"}
        delta = ((current - previous) / abs(previous)) * 100
        return {
            "percent": round(delta, 1),
            "direction": "up" if delta > 0 else "down" if delta < 0 else "flat",
        }

    return jsonify(
        {
            "totals": {
                "income": round(income, 2),
                "expenses": round(expenses, 2),
                "savings": round(savings, 2),
            },
            "credit_score": round(score, 0),
            "risk_level": risk_from_score(score),
            "score_label": "Excellent" if score >= 800 else "Good" if score >= 730 else "Fair" if score >= 650 else "Needs attention",
            "trends": {
                "income": trend(income, previous_income),
                "expenses": trend(expenses, previous_expenses),
                "savings": trend(savings, previous_savings),
                "credit_score": trend(score, previous_score),
            },
        }
    )
