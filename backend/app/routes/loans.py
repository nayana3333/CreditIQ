from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..finance import amortization_schedule, loan_months, money
from ..models import Loan

loans_bp = Blueprint("loans", __name__)


def _loan_payload(item):
    months = loan_months(item.loan_amount, item.interest_rate, item.emi)
    schedule = amortization_schedule(item.loan_amount, item.interest_rate, months, max_rows=None) if months else []
    interest = money(sum(row["interest"] for row in schedule)) if schedule else None
    return {
        "id": item.id,
        "loan_amount": item.loan_amount,
        "emi": item.emi,
        "interest_rate": item.interest_rate,
        "estimated_months": months,
        "estimated_interest": interest,
        "estimated_total_payable": money(item.loan_amount + interest) if interest is not None else None,
    }


@loans_bp.post("")
@jwt_required()
def add_loan():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    try:
        loan_amount = money(data.get("loan_amount", 0))
        emi = money(data.get("emi", 0))
        interest_rate = float(data.get("interest_rate", 0) or 0)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if loan_amount <= 0 or emi <= 0 or interest_rate < 0:
        return jsonify({"error": "loan_amount and emi must be positive; interest_rate cannot be negative"}), 400

    loan = Loan(
        user_id=user_id,
        loan_amount=loan_amount,
        emi=emi,
        interest_rate=interest_rate,
    )
    db.session.add(loan)
    db.session.commit()
    return jsonify({"id": loan.id, "message": "loan added"}), 201


@loans_bp.get("")
@jwt_required()
def list_loans():
    user_id = int(get_jwt_identity())
    items = Loan.query.filter_by(user_id=user_id).order_by(Loan.id.desc()).all()
    return jsonify(
        [
            _loan_payload(item)
            for item in items
        ]
    )
