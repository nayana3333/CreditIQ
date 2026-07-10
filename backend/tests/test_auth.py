def test_register_success(client):
    res = client.post("/api/v1/auth/register", json={
        "name": "New User",
        "email": "newuser@example.com",
        "password": "validpass123",
    })
    assert res.status_code in (200, 201)


def test_register_rejects_short_password(client):
    res = client.post("/api/v1/auth/register", json={
        "name": "New User",
        "email": "shortpass@example.com",
        "password": "short",
    })
    assert res.status_code == 400
    assert "8 characters" in res.get_json()["error"]


def test_register_rejects_password_without_digit(client):
    res = client.post("/api/v1/auth/register", json={
        "name": "New User",
        "email": "nodigit@example.com",
        "password": "nodigitshere",
    })
    assert res.status_code == 400
    assert "number" in res.get_json()["error"]


def test_register_duplicate_email_fails(client):
    client.post("/api/v1/auth/register", json={
        "name": "First",
        "email": "dup@example.com",
        "password": "validpass123",
    })
    res = client.post("/api/v1/auth/register", json={
        "name": "Second",
        "email": "dup@example.com",
        "password": "validpass456",
    })
    assert res.status_code in (400, 409)


def test_login_success(client):
    client.post("/api/v1/auth/register", json={
        "name": "Login User",
        "email": "loginuser@example.com",
        "password": "validpass123",
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "loginuser@example.com",
        "password": "validpass123",
    })
    assert res.status_code == 200
    assert "access_token" in res.get_json()


def test_login_wrong_password_fails(client):
    client.post("/api/v1/auth/register", json={
        "name": "Login User",
        "email": "wrongpass@example.com",
        "password": "validpass123",
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword",
    })
    assert res.status_code in (400, 401)


def test_login_nonexistent_valid_user_auto_registers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "doesnotexist@example.com",
        "password": "whatever123",
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "doesnotexist@example.com"
