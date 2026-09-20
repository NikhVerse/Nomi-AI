def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_user_registration_success(client):
    payload = {
        "name": "Alice Bob",
        "email": "alice@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice Bob"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

def test_duplicate_registration_fails(client):
    payload = {
        "name": "Alice Bob",
        "email": "duplicate@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]

def test_password_mismatch_fails(client):
    payload = {
        "name": "Alice Bob",
        "email": "mismatch@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "DifferentPassword456!"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 422

def test_login_success(client):
    payload = {
        "name": "Bob Smith",
        "email": "bob@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    client.post("/api/auth/register", json=payload)

    login_res = client.post("/api/auth/login", json={
        "email": "bob@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_login_invalid_password(client):
    login_res = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "WrongPassword!"
    })
    assert login_res.status_code == 401

def test_protected_route_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_authenticated_me_route(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "jane@example.com"
