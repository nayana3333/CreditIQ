import os
import tempfile

import pytest

from app import create_app
from app.extensions import db as _db


@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        "JWT_SECRET_KEY": "test-secret-key",
        "SECRET_KEY": "test-secret-key",
        "RATELIMIT_ENABLED": False,
    }

    app = create_app(test_config)

    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()
        _db.engine.dispose()

    os.unlink(db_path)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testpass123",
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "testuser@example.com",
        "password": "testpass123",
    })
    token = res.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
