from datetime import date, timedelta

from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Budget, Loan, Transaction, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    required = ["name", "email", "password"]
    if any(not data.get(k) for k in required):
        return jsonify({"error": "name, email and password are required"}), 400

    existing = User.query.filter_by(email=data["email"]).first()
    if existing:
        return jsonify({"error": "email already registered"}), 409

    user = User(
        name=data["name"],
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "user created"}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})


@auth_bp.post("/demo")
def demo_login():
    user = User.query.filter_by(email="demo@credit.ai").first()
    if not user:
        user = User(name="Demo User", email="demo@credit.ai", password_hash=generate_password_hash("password123"))
        db.session.add(user)
        db.session.commit()

    today = date.today()
    month_start = today.replace(day=1)
    if not Transaction.query.filter(Transaction.user_id == user.id, Transaction.tx_date >= month_start).first():
        samples = [
            Transaction(user_id=user.id, amount=85000, type="income", category="Income", tx_date=today.replace(day=1), description="Monthly salary"),
            Transaction(user_id=user.id, amount=14500, type="expense", category="Rent", tx_date=today.replace(day=3), description="Apartment rent"),
            Transaction(user_id=user.id, amount=8200, type="expense", category="Food", tx_date=today - timedelta(days=4), description="Groceries and delivery"),
            Transaction(user_id=user.id, amount=4200, type="expense", category="Travel", tx_date=today - timedelta(days=6), description="Metro and cab travel"),
            Transaction(user_id=user.id, amount=6500, type="expense", category="Shopping", tx_date=today - timedelta(days=8), description="Online shopping"),
            Transaction(user_id=user.id, amount=11800, type="emi", category="Loan/EMI", tx_date=today - timedelta(days=10), description="Education loan EMI"),
        ]
        db.session.add_all(samples)
    if not Loan.query.filter_by(user_id=user.id).first():
        db.session.add(Loan(user_id=user.id, loan_amount=480000, emi=11800, interest_rate=10.5))
    if not Budget.query.filter_by(user_id=user.id).first():
        db.session.add_all(
            [
                Budget(user_id=user.id, category="Food", monthly_limit=10000),
                Budget(user_id=user.id, category="Travel", monthly_limit=6000),
                Budget(user_id=user.id, category="Shopping", monthly_limit=7000),
                Budget(user_id=user.id, category="Loan/EMI", monthly_limit=14000),
            ]
        )
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})


@auth_bp.get("/profile")
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    return jsonify({"id": user.id, "name": user.name, "email": user.email})
