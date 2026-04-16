from collections import defaultdict

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Transaction

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.get("/summary")
@jwt_required()
def summary():
    user_id = int(get_jwt_identity())
    txs = Transaction.query.filter_by(user_id=user_id).all()

    income = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type in ["expense", "emi"])

    by_category = defaultdict(float)
    for tx in txs:
        if tx.type in ["expense", "emi"]:
            by_category[tx.category] += tx.amount

    overspending = expenses > income if income > 0 else expenses > 0

    return jsonify(
        {
            "income": income,
            "expenses": expenses,
            "savings": income - expenses,
            "overspending": overspending,
            "category_breakdown": by_category,
        }
    )
