from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..finance import amortization_schedule, decision_support, money
from ..models import Loan, Transaction

decision_bp = Blueprint("decision", __name__)


@decision_bp.post("/loan")
@jwt_required()
def loan_decision():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    txs = Transaction.query.filter_by(user_id=user_id).all()
    loans = Loan.query.filter_by(user_id=user_id).all()

    income = float(data.get("income") or sum(tx.amount for tx in txs if tx.type == "income"))
    expenses = float(data.get("expenses") or sum(tx.amount for tx in txs if tx.type in ["expense", "emi"]))
    existing_emi = float(data.get("existing_emi") or sum(item.emi for item in loans))
    loan_amount = float(data.get("loan_amount", 0) or 0)
    interest_rate = float(data.get("interest_rate", 0) or 0)
    tenure_months = int(data.get("tenure_months", 0) or 0)
    current_score = float(data.get("current_score", 700) or 700)

    if loan_amount <= 0 or tenure_months <= 0 or interest_rate < 0:
        return jsonify({"error": "Enter valid loan amount, tenure, and interest rate."}), 400

    decision = decision_support(
        income,
        expenses,
        existing_emi,
        loan_amount,
        interest_rate,
        tenure_months,
        current_score,
    )
    total_interest = sum(row["interest"] for row in amortization_schedule(loan_amount, interest_rate, tenure_months, max_rows=None))
    decision["total_interest"] = money(total_interest)
    decision["total_payable"] = money(loan_amount + total_interest)
    decision["amortization"] = amortization_schedule(loan_amount, interest_rate, tenure_months, max_rows=12)
    return jsonify(decision)
