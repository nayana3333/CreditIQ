import os

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, jwt, limiter, migrate
from .routes.assistant import assistant_bp
from .routes.auth import auth_bp
from .routes.dashboard import dashboard_bp
from .routes.loans import loans_bp
from .routes.ml import ml_bp

MIGRATIONS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "migrations"))


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    migrate.init_app(app, db, directory=MIGRATIONS_DIR)

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

    return app
