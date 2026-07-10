from flask import Flask
from flask_cors import CORS
from sqlalchemy import text

from .config import Config
from .extensions import db, jwt, limiter
from .routes.assistant import assistant_bp
from .routes.auth import auth_bp
from .routes.dashboard import dashboard_bp
from .routes.loans import loans_bp
from .routes.ml import ml_bp


def _ensure_sqlite_columns():
    """Add new nullable loan columns for existing local SQLite databases."""
    engine = db.engine
    if engine.dialect.name != "sqlite":
        return

    desired_columns = {
        "duration": "INTEGER",
        "purpose": "VARCHAR(80)",
        "checking_status": "VARCHAR(80)",
        "credit_history": "VARCHAR(120)",
        "savings_status": "VARCHAR(80)",
        "employment": "VARCHAR(80)",
        "installment_rate": "INTEGER",
        "personal_status": "VARCHAR(80)",
        "other_parties": "VARCHAR(80)",
        "residence_since": "INTEGER",
        "property_magnitude": "VARCHAR(80)",
        "age": "INTEGER",
        "other_payment_plans": "VARCHAR(80)",
        "housing": "VARCHAR(80)",
        "existing_credits": "INTEGER",
        "job": "VARCHAR(80)",
        "num_dependents": "INTEGER",
        "own_telephone": "VARCHAR(40)",
        "foreign_worker": "VARCHAR(40)",
        "status": "VARCHAR(20)",
    }
    existing = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(loan)")).fetchall()
    }
    for column, column_type in desired_columns.items():
        if column not in existing:
            db.session.execute(text(f"ALTER TABLE loan ADD COLUMN {column} {column_type}"))

    credit_app_tables = {
        row[0]
        for row in db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    }
    if "credit_applications" in credit_app_tables:
        credit_app_columns = {
            "lr_decision": "VARCHAR(20)",
            "lr_confidence": "FLOAT",
            "lr_good_prob": "FLOAT",
            "lr_bad_prob": "FLOAT",
            "rf_decision": "VARCHAR(20)",
            "rf_confidence": "FLOAT",
            "rf_good_prob": "FLOAT",
            "rf_bad_prob": "FLOAT",
            "consensus": "BOOLEAN",
            "lr_shap_reasons": "TEXT",
            "rf_shap_reasons": "TEXT",
        }
        existing_credit_app_columns = {
            row[1]
            for row in db.session.execute(text("PRAGMA table_info(credit_applications)")).fetchall()
        }
        for column, column_type in credit_app_columns.items():
            if column not in existing_credit_app_columns:
                db.session.execute(text(f"ALTER TABLE credit_applications ADD COLUMN {column} {column_type}"))
    db.session.commit()


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(ml_bp, url_prefix="/api/v1/ml")
    app.register_blueprint(assistant_bp, url_prefix="/api/v1/assistant")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(loans_bp, url_prefix="/api/v1/loans")

    @app.get("/")
    def index():
        return {
            "message": "Credit Intelligence backend is running",
            "health": "/api/v1/health",
            "api_index": "/api/v1",
        }

    @app.get("/api/v1")
    def api_index():
        return {
            "service": "credit-intelligence-api",
            "version": "v1",
            "endpoints": {
                "auth": "/api/v1/auth",
                "ml_predict": "/api/v1/ml/predict",
                "ml_metrics": "/api/v1/ml/metrics",
                "ml_simulate": "/api/v1/ml/simulate",
                "ml_batch": "/api/v1/ml/batch",
                "assistant": "/api/v1/assistant/chat",
                "dashboard": "/api/v1/dashboard",
                "loans": "/api/v1/loans",
                "health": "/api/v1/health",
            },
        }

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    with app.app_context():
        db.create_all()
        _ensure_sqlite_columns()

    return app
