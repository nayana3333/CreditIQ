from collections import defaultdict
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..finance import money
from ..models import Budget, Transaction

budgets_bp = Blueprint("budgets", __name__)


@budgets_bp.get("")
@jwt_required()
def list_budgets():
    user_id = int(get_jwt_identity())
    budgets = Budget.query.filter_by(user_id=user_id).order_by(Budget.category.asc()).all()
    month_start = date.today().replace(day=1)
    txs = Transaction.query.filter(Transaction.user_id == user_id, Transaction.tx_date >= month_start).all()

    spent = defaultdict(float)
    for tx in txs:
        if tx.type in ["expense", "emi"]:
            spent[tx.category.lower()] += tx.amount

    return jsonify(
        [
            {
                "id": item.id,
                "category": item.category,
                "monthly_limit": item.monthly_limit,
                "spent": round(spent[item.category.lower()], 2),
                "usage": round((spent[item.category.lower()] / item.monthly_limit) if item.monthly_limit else 0, 3),
                "status": "Exceeded"
                if item.monthly_limit and spent[item.category.lower()] > item.monthly_limit
                else "Warning"
                if item.monthly_limit and spent[item.category.lower()] >= item.monthly_limit * 0.8
                else "Healthy",
            }
            for item in budgets
        ]
    )


@budgets_bp.post("")
@jwt_required()
def upsert_budget():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    category = (data.get("category") or "").strip()
    if not category:
        return jsonify({"error": "category is required"}), 400
    try:
        monthly_limit = money(data.get("monthly_limit", 0))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if monthly_limit <= 0:
        return jsonify({"error": "monthly_limit must be greater than zero"}), 400

    budget = Budget.query.filter(Budget.user_id == user_id, Budget.category.ilike(category)).first()
    if not budget:
        budget = Budget(user_id=user_id, category=category, monthly_limit=monthly_limit)
        db.session.add(budget)
    else:
        budget.monthly_limit = monthly_limit
    db.session.commit()
    return jsonify({"id": budget.id, "message": "budget saved"}), 201


@budgets_bp.delete("/<int:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    user_id = int(get_jwt_identity())
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first_or_404()
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "budget deleted"})
