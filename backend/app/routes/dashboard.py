import os
import pickle

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import CreditApplication, Loan, LoanDecision


dashboard_bp = Blueprint("dashboard", __name__)


def _model_accuracy():
    metrics_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model_metrics.pkl"))
    try:
        with open(metrics_path, "rb") as handle:
            metrics = pickle.load(handle)
        return float(metrics.get("rf", {}).get("accuracy", 0))
    except Exception:
        return 0


@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    user_id = int(get_jwt_identity())
    applications = Loan.query.filter_by(user_id=user_id).order_by(Loan.created_at.desc()).all()
    decisions = LoanDecision.query.filter_by(user_id=user_id).all()
    decision_by_loan = {item.loan_id: item for item in decisions}

    approved = sum(1 for item in decisions if item.final_decision == "approved")
    rejected = sum(1 for item in decisions if item.final_decision == "rejected")
    pending = max(len(applications) - approved - rejected, 0)
    consensus = sum(1 for item in decisions if item.consensus)
    total = len(applications)

    recent_applications = []
    for loan in applications[:5]:
        decision = decision_by_loan.get(loan.id)
        recent_applications.append(
            {
                "id": loan.id,
                "amount": loan.loan_amount,
                "purpose": loan.purpose or "Credit request",
                "date": loan.created_at.isoformat(),
                "status": decision.final_decision if decision else loan.status or "pending",
                "consensus": bool(decision.consensus) if decision else False,
            }
        )

    credit_apps = CreditApplication.query.filter_by(user_id=user_id).order_by(CreditApplication.created_at.desc()).all()
    if credit_apps:
        total = len(credit_apps)
        approved = sum(1 for item in credit_apps if item.final_decision == "approved")
        rejected = sum(1 for item in credit_apps if item.final_decision == "rejected")
        pending = max(total - approved - rejected, 0)
        consensus = sum(1 for item in credit_apps if item.consensus)
        consensus_rate = round((consensus / total) * 100, 1) if total else 0
        recent_applications = [
            {
                "id": item.id,
                "amount": item.credit_amount,
                "purpose": item.purpose,
                "date": item.created_at.isoformat(),
                "status": item.final_decision,
                "lr_confidence": item.lr_confidence,
                "rf_confidence": item.rf_confidence,
                "consensus": item.consensus,
            }
            for item in credit_apps[:5]
        ]
    else:
        consensus_rate = round((consensus / len(decisions)) * 100, 1) if decisions else 0

    return jsonify(
        {
            "total_applications": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "approval_rate": round((approved / total) * 100, 1) if total else 0,
            "consensus_rate": consensus_rate,
            "model_accuracy": _model_accuracy(),
            "risk_distribution": {
                "approved": approved,
                "rejected": rejected,
                "pending": pending,
            },
            "recent_applications": recent_applications,
            "latest_application": recent_applications[0] if recent_applications else None,
        }
    )
