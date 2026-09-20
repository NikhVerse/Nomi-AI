def test_create_and_list_persona(client, auth_headers):
    payload = {
        "name": "DevTutor",
        "role": "Senior Developer Tutor",
        "description": "Helps students learn fullstack web development.",
        "objective": "Build solid fundamental coding habits.",
        "personality": ["Patient", "Supportive"],
        "tone": "Technical",
        "expertise": ["React", "FastAPI", "PostgreSQL"],
        "rules": ["Always explain the why behind code."],
        "restrictions": ["Do not give copy-paste answers without explanation."],
        "response_preferences": ["Include code comments."]
    }

    create_res = client.post("/api/personas", json=payload, headers=auth_headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == "DevTutor"
    assert created_data["current_version"] == 1
    assert "Senior Developer Tutor" in created_data["system_prompt"]
    persona_id = created_data["id"]

    # List personas
    list_res = client.get("/api/personas", headers=auth_headers)
    assert list_res.status_code == 200
    personas = list_res.json()
    assert len(personas) == 1
    assert personas[0]["id"] == persona_id

    # View prompt endpoint
    prompt_res = client.get(f"/api/personas/{persona_id}/prompt", headers=auth_headers)
    assert prompt_res.status_code == 200
    assert prompt_res.json()["version"] == 1

    # Update persona and verify version increments
    update_res = client.put(f"/api/personas/{persona_id}", json={
        "role": "Lead Architect Tutor",
        "tone": "Academic"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["current_version"] == 2
    assert "Lead Architect Tutor" in updated_data["system_prompt"]

    # Check prompt versions history
    versions_res = client.get(f"/api/personas/{persona_id}/prompt-versions", headers=auth_headers)
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 2

    # Delete persona
    del_res = client.delete(f"/api/personas/{persona_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify deleted
    get_res = client.get(f"/api/personas/{persona_id}", headers=auth_headers)
    assert get_res.status_code == 404

def test_persona_ownership_isolation(client, auth_headers):
    # User 1 creates persona
    p = client.post("/api/personas", json={
        "name": "User 1 Persona",
        "role": "Assistant"
    }, headers=auth_headers).json()

    # User 2 registers
    u2_res = client.post("/api/auth/register", json={
        "name": "User Two",
        "email": "user2@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    u2_token = u2_res.json()["access_token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 2 cannot access User 1's persona
    forbidden_get = client.get(f"/api/personas/{p['id']}", headers=u2_headers)
    assert forbidden_get.status_code == 403

    forbidden_put = client.put(f"/api/personas/{p['id']}", json={"name": "Hacked"}, headers=u2_headers)
    assert forbidden_put.status_code == 403

    forbidden_del = client.delete(f"/api/personas/{p['id']}", headers=u2_headers)
    assert forbidden_del.status_code == 403
