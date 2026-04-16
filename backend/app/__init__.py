from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, jwt
from . import models
from .routes.analysis import analysis_bp
from .routes.assistant import assistant_bp
from .routes.auth import auth_bp
from .routes.dashboard import dashboard_bp
from .routes.education import education_bp
from .routes.loans import loans_bp
from .routes.ml import ml_bp
from .routes.recommendations import recommendations_bp
from .routes.simulation import simulation_bp
from .routes.transactions import transactions_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(transactions_bp, url_prefix="/api/v1/transactions")
    app.register_blueprint(analysis_bp, url_prefix="/api/v1/analysis")
    app.register_blueprint(ml_bp, url_prefix="/api/v1/ml")
    app.register_blueprint(assistant_bp, url_prefix="/api/v1/assistant")
    app.register_blueprint(simulation_bp, url_prefix="/api/v1/simulation")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(loans_bp, url_prefix="/api/v1/loans")
    app.register_blueprint(education_bp, url_prefix="/api/v1/education")
    app.register_blueprint(recommendations_bp, url_prefix="/api/v1/recommendations")

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
                "transactions": "/api/v1/transactions",
                "analysis": "/api/v1/analysis/summary",
                "ml_score": "/api/v1/ml/credit-score/predict",
                "ml_risk": "/api/v1/ml/risk/predict",
                "assistant": "/api/v1/assistant/chat",
                "simulation": "/api/v1/simulation/run",
                "dashboard": "/api/v1/dashboard",
                "loans": "/api/v1/loans",
                "education_lessons": "/api/v1/education/lessons",
                "education_quiz": "/api/v1/education/quiz",
                "recommendations": "/api/v1/recommendations",
                "health": "/api/v1/health",
            },
        }

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    with app.app_context():
        db.create_all()

    return app
