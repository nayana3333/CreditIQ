from datetime import date, datetime

from .extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # income, expense, emi
    category = db.Column(db.String(80), nullable=False)
    tx_date = db.Column(db.Date, nullable=False, default=date.today)
    description = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Loan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    loan_amount = db.Column(db.Float, nullable=False)
    emi = db.Column(db.Float, nullable=False, default=0)
    interest_rate = db.Column(db.Float, nullable=False, default=0)
    duration = db.Column(db.Integer, nullable=True)
    purpose = db.Column(db.String(80), nullable=True)
    checking_status = db.Column(db.String(80), nullable=True)
    credit_history = db.Column(db.String(120), nullable=True)
    savings_status = db.Column(db.String(80), nullable=True)
    employment = db.Column(db.String(80), nullable=True)
    installment_rate = db.Column(db.Integer, nullable=True)
    personal_status = db.Column(db.String(80), nullable=True)
    other_parties = db.Column(db.String(80), nullable=True)
    residence_since = db.Column(db.Integer, nullable=True)
    property_magnitude = db.Column(db.String(80), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    other_payment_plans = db.Column(db.String(80), nullable=True)
    housing = db.Column(db.String(80), nullable=True)
    existing_credits = db.Column(db.Integer, nullable=True)
    job = db.Column(db.String(80), nullable=True)
    num_dependents = db.Column(db.Integer, nullable=True)
    own_telephone = db.Column(db.String(40), nullable=True)
    foreign_worker = db.Column(db.String(40), nullable=True)
    status = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class CreditApplication(db.Model):
    __tablename__ = "credit_applications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    checking_status = db.Column(db.String(80), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    credit_history = db.Column(db.String(120), nullable=False)
    purpose = db.Column(db.String(80), nullable=False)
    credit_amount = db.Column(db.Float, nullable=False)
    savings_status = db.Column(db.String(80), nullable=False)
    employment = db.Column(db.String(80), nullable=False)
    installment_rate = db.Column(db.Integer, nullable=False)
    personal_status = db.Column(db.String(80), nullable=False)
    other_parties = db.Column(db.String(80), nullable=False)
    residence_since = db.Column(db.Integer, nullable=False)
    property_magnitude = db.Column(db.String(80), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    other_payment_plans = db.Column(db.String(80), nullable=False)
    housing = db.Column(db.String(80), nullable=False)
    existing_credits = db.Column(db.Integer, nullable=False)
    job = db.Column(db.String(80), nullable=False)
    num_dependents = db.Column(db.Integer, nullable=False)
    own_telephone = db.Column(db.String(40), nullable=False)
    foreign_worker = db.Column(db.String(40), nullable=False)
    lr_decision = db.Column(db.String(20), nullable=True)
    lr_confidence = db.Column(db.Float, nullable=True)
    lr_good_prob = db.Column(db.Float, nullable=True)
    lr_bad_prob = db.Column(db.Float, nullable=True)
    rf_decision = db.Column(db.String(20), nullable=True)
    rf_confidence = db.Column(db.Float, nullable=True)
    rf_good_prob = db.Column(db.Float, nullable=True)
    rf_bad_prob = db.Column(db.Float, nullable=True)
    final_decision = db.Column(db.String(20), nullable=True)
    consensus = db.Column(db.Boolean, default=False)
    lr_shap_reasons = db.Column(db.Text, nullable=True)
    rf_shap_reasons = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class MLMetricsCache(db.Model):
    __tablename__ = "ml_metrics_cache"

    id = db.Column(db.Integer, primary_key=True)
    metrics_json = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)


class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False)
    monthly_limit = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Prediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    credit_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class LoanDecision(db.Model):
    __tablename__ = "loan_decisions"

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey("loan.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    lr_decision = db.Column(db.String(20))
    lr_confidence = db.Column(db.Float)
    lr_good_prob = db.Column(db.Float)
    lr_bad_prob = db.Column(db.Float)
    rf_decision = db.Column(db.String(20))
    rf_confidence = db.Column(db.Float)
    rf_good_prob = db.Column(db.Float)
    rf_bad_prob = db.Column(db.Float)
    final_decision = db.Column(db.String(20))
    consensus = db.Column(db.Boolean, default=False)
    lr_shap_reasons = db.Column(db.Text)
    rf_shap_reasons = db.Column(db.Text)
    shap_reasons = db.Column(db.Text)
    input_features = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    loan = db.relationship("Loan", backref=db.backref("decision", uselist=False))
