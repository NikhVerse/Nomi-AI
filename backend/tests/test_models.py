from app.services.ai.factory import provider_manager

def test_get_popular_models(client, auth_headers):
    res = client.get("/api/models/popular", headers=auth_headers)
    assert res.status_code == 200
    models = res.json()
    assert len(models) >= 3
    names = [m["name"] for m in models]
    assert "qwen2.5:0.5b" in names
    assert "llama3.2:1b" in names

def test_get_models_status(client, auth_headers):
    res = client.get("/api/models/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "active_provider" in data
    assert "active_model" in data
    assert "active_host" in data
    assert "ollama" in data
    assert "builtin_local" in data
    assert data["builtin_local"]["available"] is True

def test_select_model_provider(client, auth_headers):
    # Select builtin_local provider
    res = client.post("/api/models/select", json={
        "provider": "builtin_local",
        "model": "offline-neural-v1"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["active_provider"] == "builtin_local"

    # Verify provider manager state
    assert provider_manager.active_provider_type == "builtin_local"

    # Reset back to ollama
    reset_res = client.post("/api/models/select", json={
        "provider": "ollama",
        "model": "qwen2.5:0.5b",
        "host": "http://127.0.0.1:11434"
    }, headers=auth_headers)
    assert reset_res.status_code == 200
    assert provider_manager.active_provider_type == "ollama"

def test_select_invalid_provider(client, auth_headers):
    res = client.post("/api/models/select", json={
        "provider": "invalid_unknown_provider",
        "model": "test"
    }, headers=auth_headers)
    assert res.status_code == 400
