import pytest
from app.services.evaluation.evaluator import PersonaEvaluator

@pytest.mark.asyncio
async def test_persona_evaluator_deterministic_rubric():
    evaluator = PersonaEvaluator(ai_provider=None)
    system_prompt = (
        "IDENTITY: You are CodeMentor.\n"
        "ROLE: Senior Software Architect.\n"
        "COMMUNICATION STYLE: Concise and technical.\n"
        "BEHAVIORAL RULES: - Provide clean code samples."
    )
    test_case = "How do I implement a singleton pattern in Python?"
    response_text = (
        "Here is a clean Python singleton using a metaclass:\n\n"
        "```python\n"
        "class Singleton(type):\n"
        "    _instances = {}\n"
        "    def __call__(cls, *args, **kwargs):\n"
        "        if cls not in cls._instances:\n"
        "            cls._instances[cls] = super().__call__(*args, **kwargs)\n"
        "        return cls._instances[cls]\n"
        "```"
    )

    result = await evaluator.evaluate(system_prompt, test_case, response_text)

    assert "instruction_adherence" in result
    assert "persona_consistency" in result
    assert "tone_consistency" in result
    assert "relevance" in result
    assert "preference_compliance" in result
    assert "feedback" in result

    # Verify score range 1.0 to 5.0
    for metric in ["instruction_adherence", "persona_consistency", "tone_consistency", "relevance", "preference_compliance"]:
        assert 1.0 <= result[metric] <= 5.0
    assert len(result["feedback"]) > 0

def test_evaluation_api_endpoints(client, auth_headers):
    # 1. Create a persona
    p_res = client.post("/api/personas", json={
        "name": "DocWriter",
        "role": "Technical Writer",
        "objective": "Write clear documentation",
        "tone": "Clear",
        "rules": ["Use active voice"]
    }, headers=auth_headers)
    assert p_res.status_code == 201
    persona_id = p_res.json()["id"]

    # 2. Run evaluation
    eval_res = client.post("/api/evaluations", json={
        "persona_id": persona_id,
        "test_case": "Draft an API introduction section."
    }, headers=auth_headers)
    assert eval_res.status_code == 201
    eval_data = eval_res.json()
    assert eval_data["persona_id"] == persona_id
    assert eval_data["test_case"] == "Draft an API introduction section."
    assert len(eval_data["response"]) > 0
    assert 1.0 <= eval_data["instruction_adherence"] <= 5.0
    assert 1.0 <= eval_data["persona_consistency"] <= 5.0

    # 3. Retrieve evaluation history
    list_res = client.get(f"/api/evaluations/{persona_id}", headers=auth_headers)
    assert list_res.status_code == 200
    evals = list_res.json()
    assert len(evals) >= 1
    assert evals[0]["id"] == eval_data["id"]

def test_evaluation_ownership_isolation(client, auth_headers):
    # User 1 creates a persona
    p_res = client.post("/api/personas", json={
        "name": "SecretPersona",
        "role": "Security Analyst"
    }, headers=auth_headers)
    persona_id = p_res.json()["id"]

    # User 2 registers and gets token
    u2_res = client.post("/api/auth/register", json={
        "name": "User Two",
        "email": "user2@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    u2_token = u2_res.json()["access_token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 2 cannot evaluate User 1's persona
    eval_res = client.post("/api/evaluations", json={
        "persona_id": persona_id,
        "test_case": "Explain SQL injection."
    }, headers=u2_headers)
    assert eval_res.status_code == 403

    # User 2 cannot view User 1's evaluations
    view_res = client.get(f"/api/evaluations/{persona_id}", headers=u2_headers)
    assert view_res.status_code == 403

def test_evaluation_nonexistent_persona(client, auth_headers):
    res = client.post("/api/evaluations", json={
        "persona_id": "non-existent-persona-id",
        "test_case": "Hello world"
    }, headers=auth_headers)
    assert res.status_code == 404
