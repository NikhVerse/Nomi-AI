from app.services.prompt.compiler import PromptCompiler

def test_prompt_compiler_full_persona():
    persona = {
        "name": "CareerForge",
        "role": "AI/ML Career Mentor",
        "description": "Professional mentor focused on practical AI career guidance.",
        "objective": "Guide students toward actionable software and ML job readiness.",
        "personality": ["Encouraging", "Analytical", "Direct"],
        "tone": "Professional",
        "expertise": ["Python", "FastAPI", "Prompt Engineering", "Machine Learning"],
        "rules": [
            "Provide concrete code examples.",
            "Ask clarifying questions if the prompt is vague."
        ],
        "restrictions": [
            "Never suggest unverified bootcamps.",
            "Do not write entire essays without user prompt."
        ],
        "response_preferences": [
            "Use bullet points for lists.",
            "Highlight key takeaways at the end."
        ]
    }

    compiled = PromptCompiler.compile(persona)

    # Assert all structured sections and values are compiled
    assert "IDENTITY" in compiled
    assert "CareerForge" in compiled
    assert "ROLE" in compiled
    assert "AI/ML Career Mentor" in compiled
    assert "OBJECTIVE" in compiled
    assert "Guide students toward actionable software and ML job readiness." in compiled
    assert "PERSONALITY" in compiled
    assert "Encouraging, Analytical, Direct" in compiled
    assert "COMMUNICATION STYLE" in compiled
    assert "Professional" in compiled
    assert "EXPERTISE" in compiled
    assert "- Python" in compiled
    assert "- Prompt Engineering" in compiled
    assert "BEHAVIORAL RULES" in compiled
    assert "- Provide concrete code examples." in compiled
    assert "RESTRICTIONS" in compiled
    assert "- Never suggest unverified bootcamps." in compiled
    assert "Do not fabricate facts" in compiled  # default safety restriction
    assert "RESPONSE PREFERENCES" in compiled
    assert "- Use bullet points for lists." in compiled
    assert "GENERAL RESPONSE REQUIREMENTS" in compiled

def test_prompt_compiler_minimal_persona():
    persona = {
        "name": "MinimalBot",
        "role": "General Assistant"
    }

    compiled = PromptCompiler.compile(persona)

    assert "IDENTITY\nYou are MinimalBot." in compiled
    assert "ROLE\nYou act as General Assistant." in compiled
    assert "GENERAL RESPONSE REQUIREMENTS" in compiled
    # Sections without entries should not clutter the output
    assert "EXPERTISE\n" not in compiled
    assert "BEHAVIORAL RULES\n" not in compiled
