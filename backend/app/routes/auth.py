import json
import re

from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError, OperationalError

from ..extensions import db, limiter
from ..models import Loan, LoanDecision, User
from .ml import _dual_credit_prediction

auth_bp = Blueprint("auth", __name__)


def _user_payload(user):
    return {"id": user.id, "name": user.name, "email": user.email}


def _validate_password(password):
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    return None


@auth_bp.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "error": "Too many attempts. Please wait a minute and try again.",
        "status": "rate_limited",
    }), 429


@auth_bp.post("/register")
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "enter a valid email address"}), 400
    password_error = _validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "email already registered"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "email already registered"}), 409
    except OperationalError:
        db.session.rollback()
        return jsonify({"error": "database is temporarily unavailable. Please try again."}), 503

    return jsonify({"message": "user created"}), 201


@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "enter a valid email address"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        password_error = _validate_password(password)
        if password_error:
            return jsonify({"error": password_error}), 400
        user = User(
            name=email.split("@")[0].replace(".", " ").replace("_", " ").title() or "CreditIQ User",
            email=email,
            password_hash=generate_password_hash(password),
        )
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            user = User.query.filter_by(email=email).first()
        except OperationalError:
            db.session.rollback()
            return jsonify({"error": "database is temporarily unavailable. Please try again."}), 503

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": _user_payload(user)})


@auth_bp.post("/demo")
def demo_login():
    user = User.query.filter_by(email="demo@creditiq.com").first()
    if not user:
        user = User(name="Demo User", email="demo@creditiq.com", password_hash=generate_password_hash("demo123"))
        db.session.add(user)
        db.session.commit()

    if not Loan.query.filter_by(user_id=user.id).first():
        sample_applications = [
            {
                "checking_status": "A14",
                "duration": 24,
                "credit_history": "A32",
                "purpose": "A42",
                "credit_amount": 2500,
                "savings_status": "A61",
                "employment": "A73",
                "installment_rate": 2,
                "personal_status": "A91",
                "other_parties": "A101",
                "residence_since": 3,
                "property_magnitude": "A121",
                "age": 32,
                "other_payment_plans": "A143",
                "housing": "A152",
                "existing_credits": 1,
                "job": "A173",
                "num_dependents": 1,
                "own_telephone": "A192",
                "foreign_worker": "A201",
            },
            {
                "checking_status": "A11",
                "duration": 48,
                "credit_history": "A33",
                "purpose": "A49",
                "credit_amount": 9800,
                "savings_status": "A61",
                "employment": "A72",
                "installment_rate": 4,
                "personal_status": "A92",
                "other_parties": "A101",
                "residence_since": 1,
                "property_magnitude": "A124",
                "age": 24,
                "other_payment_plans": "A141",
                "housing": "A151",
                "existing_credits": 2,
                "job": "A173",
                "num_dependents": 1,
                "own_telephone": "A191",
                "foreign_worker": "A201",
            },
        ]
        for data in sample_applications:
            decision = _dual_credit_prediction(data)
            loan = Loan(
                user_id=user.id,
                loan_amount=data["credit_amount"],
                emi=0,
                interest_rate=0,
                duration=data["duration"],
                purpose=data["purpose"],
                checking_status=data["checking_status"],
                credit_history=data["credit_history"],
                savings_status=data["savings_status"],
                employment=data["employment"],
                installment_rate=data["installment_rate"],
                personal_status=data["personal_status"],
                other_parties=data["other_parties"],
                residence_since=data["residence_since"],
                property_magnitude=data["property_magnitude"],
                age=data["age"],
                other_payment_plans=data["other_payment_plans"],
                housing=data["housing"],
                existing_credits=data["existing_credits"],
                job=data["job"],
                num_dependents=data["num_dependents"],
                own_telephone=data["own_telephone"],
                foreign_worker=data["foreign_worker"],
                status=decision["final_decision"],
            )
            db.session.add(loan)
            db.session.flush()
            db.session.add(
                LoanDecision(
                    loan_id=loan.id,
                    user_id=user.id,
                    lr_decision=decision["lr"]["decision"],
                    lr_confidence=decision["lr"]["confidence"],
                    lr_good_prob=decision["lr"]["good_probability"],
                    lr_bad_prob=decision["lr"]["bad_probability"],
                    rf_decision=decision["rf"]["decision"],
                    rf_confidence=decision["rf"]["confidence"],
                    rf_good_prob=decision["rf"]["good_probability"],
                    rf_bad_prob=decision["rf"]["bad_probability"],
                    final_decision=decision["final_decision"],
                    consensus=decision["consensus"],
                    lr_shap_reasons=json.dumps(decision["lr"]["shap_reasons"]),
                    rf_shap_reasons=json.dumps(decision["rf"]["shap_reasons"]),
                    shap_reasons=json.dumps(decision["rf"]["shap_reasons"]),
                    input_features=json.dumps(decision["input_summary"]),
                )
            )
        db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": _user_payload(user)})


@auth_bp.get("/profile")
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    return jsonify({"id": user.id, "name": user.name, "email": user.email})
