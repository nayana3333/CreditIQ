from collections import defaultdict
from datetime import date

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..finance import risk_from_score, score_from_finances
from ..models import Loan, Prediction, Transaction

analytics_bp = Blueprint("analytics", __name__)


def _month_key(tx_date):
    return tx_date.strftime("%Y-%m")


@analytics_bp.get("")
@jwt_required()
def analytics():
    user_id = int(get_jwt_identity())
    txs = Transaction.query.filter_by(user_id=user_id).all()
    loans = Loan.query.filter_by(user_id=user_id).all()
    predictions = Prediction.query.filter_by(user_id=user_id).order_by(Prediction.timestamp.asc()).all()

    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "emi": 0.0})
    categories = defaultdict(float)
    for tx in txs:
        key = _month_key(tx.tx_date)
        if tx.type == "income":
            monthly[key]["income"] += tx.amount
        elif tx.type == "emi":
            monthly[key]["emi"] += tx.amount
            monthly[key]["expenses"] += tx.amount
            categories[tx.category] += tx.amount
        else:
            monthly[key]["expenses"] += tx.amount
            categories[tx.category] += tx.amount

    months = []
    for key in sorted(monthly):
        item = monthly[key]
        income = item["income"]
        expenses = item["expenses"]
        score = score_from_finances(income, expenses, item["emi"])
        months.append(
            {
                "month": key,
                "income": round(income, 2),
                "expenses": round(expenses, 2),
                "savings": round(income - expenses, 2),
                "savings_rate": round(((income - expenses) / income) if income else 0, 3),
                "emi_burden": round((item["emi"] / income) if income else 0, 3),
                "credit_score": score,
                "risk_level": risk_from_score(score),
            }
        )

    current = months[-1] if months else {"income": 0, "expenses": 0, "savings": 0, "emi_burden": 0}
    previous = months[-2] if len(months) > 1 else None
    alerts = []
    if current["income"] and current["expenses"] / current["income"] > 0.75:
        alerts.append("Monthly expenses are above 75% of income.")
    if current["income"] and current["savings"] / current["income"] < 0.1:
        alerts.append("Savings rate is below 10%.")
    if current.get("emi_burden", 0) > 0.4:
        alerts.append("EMI burden is above the recommended 40% threshold.")
    if previous and previous["expenses"] > 0 and current["expenses"] > previous["expenses"] * 1.2:
        alerts.append("Expenses increased by more than 20% compared with the previous month.")

    return jsonify(
        {
            "monthly": months,
            "category_breakdown": [
                {"category": category, "amount": round(amount, 2)}
                for category, amount in sorted(categories.items(), key=lambda item: item[1], reverse=True)
            ],
            "score_history": [
                {
                    "date": item.timestamp.date().isoformat(),
                    "credit_score": round(item.credit_score),
                    "risk_level": item.risk_level,
                }
                for item in predictions
            ],
            "loan_summary": {
                "total_loan_amount": round(sum(item.loan_amount for item in loans), 2),
                "total_emi": round(sum(item.emi for item in loans), 2),
            },
            "alerts": alerts,
            "generated_on": date.today().isoformat(),
        }
    )
