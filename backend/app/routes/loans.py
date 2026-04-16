from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Loan

loans_bp = Blueprint("loans", __name__)


@loans_bp.post("")
@jwt_required()
def add_loan():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    loan = Loan(
        user_id=user_id,
        loan_amount=float(data.get("loan_amount", 0)),
        emi=float(data.get("emi", 0)),
        interest_rate=float(data.get("interest_rate", 0)),
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
            {
                "id": item.id,
                "loan_amount": item.loan_amount,
                "emi": item.emi,
                "interest_rate": item.interest_rate,
            }
            for item in items
        ]
    )

