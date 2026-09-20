import pytest
from app.services.ai.factory import get_ai_provider, SUPPORTED_PROVIDERS
from app.services.ai.universal_openai_compatible import UniversalOpenAIProvider
from app.services.ai.anthropic import AnthropicProvider
from app.services.ai.image_generator import ImageGeneratorService

def test_supported_providers_set():
    assert "gemini" in SUPPORTED_PROVIDERS
    assert "openai" in SUPPORTED_PROVIDERS
    assert "claude" in SUPPORTED_PROVIDERS
    assert "deepseek" in SUPPORTED_PROVIDERS
    assert "groq" in SUPPORTED_PROVIDERS
    assert "mistral" in SUPPORTED_PROVIDERS
    assert "together" in SUPPORTED_PROVIDERS
    assert "openrouter" in SUPPORTED_PROVIDERS
    assert "perplexity" in SUPPORTED_PROVIDERS
    assert "ollama" in SUPPORTED_PROVIDERS
    assert "builtin_local" in SUPPORTED_PROVIDERS

def test_get_ai_provider_factory_byok():
    prov_openai = get_ai_provider(provider_type="openai", api_key="sk-test-fake-key", model="gpt-4o")
    assert isinstance(prov_openai, UniversalOpenAIProvider)
    assert prov_openai.api_key == "sk-test-fake-key"
    assert prov_openai.model == "gpt-4o"

    prov_claude = get_ai_provider(provider_type="claude", api_key="sk-ant-test-key", model="claude-3-5-haiku-20241022")
    assert isinstance(prov_claude, AnthropicProvider)
    assert prov_claude.api_key == "sk-ant-test-key"
    assert prov_claude.model == "claude-3-5-haiku-20241022"

    prov_deepseek = get_ai_provider(provider_type="deepseek", api_key="sk-deepseek-key", model="deepseek-reasoner")
    assert isinstance(prov_deepseek, UniversalOpenAIProvider)
    assert prov_deepseek.api_key == "sk-deepseek-key"
    assert prov_deepseek.model == "deepseek-reasoner"

def test_models_catalog_endpoint(client, auth_headers):
    res = client.get("/api/models/catalog", headers=auth_headers)
    assert res.status_code == 200
    catalog = res.json()
    assert len(catalog) >= 10
    providers = {item["provider"] for item in catalog}
    assert "gemini" in providers
    assert "openai" in providers
    assert "claude" in providers
    assert "deepseek" in providers
    assert "groq" in providers

@pytest.mark.asyncio
async def test_image_generator_service_pollinations():
    res = await ImageGeneratorService.generate_image(
        prompt="A serene cyberpunk Tokyo garden at twilight",
        provider="pollinations",
        aspect_ratio="1:1"
    )
    assert res["status"] == "success"
    assert "url" in res
    assert "pollinations.ai" in res["url"]

def test_image_generate_api_endpoint(client, auth_headers):
    res = client.post(
        "/api/images/generate",
        headers=auth_headers,
        json={
            "prompt": "Modern minimalist persona avatar",
            "provider": "pollinations",
            "aspect_ratio": "1:1"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["status"] == "success"
