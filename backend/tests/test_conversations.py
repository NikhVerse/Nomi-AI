def test_conversations_and_messages(client, auth_headers):
    # 1. Create a persona
    p_res = client.post("/api/personas", json={
        "name": "MathBot",
        "role": "Math Professor",
        "objective": "Teach calculus clearly",
        "tone": "Academic"
    }, headers=auth_headers)
    persona_id = p_res.json()["id"]

    # 2. Create conversation
    conv_res = client.post("/api/conversations", json={
        "persona_id": persona_id,
        "title": "Calculus Q&A"
    }, headers=auth_headers)
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # 3. Post a message (triggers simulated or real AI response)
    msg_res = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "What is the derivative of x squared?"},
        headers=auth_headers
    )
    assert msg_res.status_code == 201
    assistant_msg = msg_res.json()
    assert assistant_msg["role"] == "assistant"
    assert len(assistant_msg["content"]) > 0

    # 4. Fetch messages list
    list_msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=auth_headers)
    assert list_msgs.status_code == 200
    messages = list_msgs.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"

    # 5. Rename conversation
    rename_res = client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "Derivatives Session"},
        headers=auth_headers
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["title"] == "Derivatives Session"

    # 6. Run evaluation on persona
    eval_res = client.post("/api/evaluations", json={
        "persona_id": persona_id,
        "test_case": "Explain the chain rule simply."
    }, headers=auth_headers)
    assert eval_res.status_code == 201
    eval_data = eval_res.json()
    assert eval_data["instruction_adherence"] >= 1.0
    assert eval_data["persona_consistency"] >= 1.0
    assert len(eval_data["feedback"]) > 0

    # 7. List evaluations
    get_evals = client.get(f"/api/evaluations/{persona_id}", headers=auth_headers)
    assert get_evals.status_code == 200
    assert len(get_evals.json()) == 1
