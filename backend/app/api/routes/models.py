import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.dependencies import get_current_user
from app.db.models import User
from app.services.ai.factory import provider_manager, SUPPORTED_PROVIDERS
from app.services.ai.ollama import OllamaProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/models", tags=["AI Models & Providers"])

UNIVERSAL_MODEL_CATALOG = [
    # Built-in Local Offline Engine (Default Free Model)
    {
        "name": "builtin-dialogue",
        "provider": "builtin_local",
        "provider_name": "Offline Engine",
        "model": "builtin-dialogue",
        "label": "Built-in Free Engine (Default)",
        "tag": "Free & Offline",
        "badge": "Default (Zero Keys)",
        "requires_key": False,
        "is_default": True,
        "description": "Built-in natural dialogue engine. 100% Free, zero keys, zero setup, completely offline."
    },
    # Ollama Local (Free Open Weights)
    {
        "name": "llama3.2:1b",
        "provider": "ollama",
        "provider_name": "Local Ollama",
        "model": "llama3.2:1b",
        "label": "Ollama Llama 3.2 (1B)",
        "tag": "Free & Local",
        "badge": "Private & Free",
        "requires_key": False,
        "description": "Runs completely locally on your hardware with 0 network calls."
    },
    {
        "name": "qwen2.5:0.5b",
        "provider": "ollama",
        "provider_name": "Local Ollama",
        "model": "qwen2.5:0.5b",
        "label": "Ollama Qwen 2.5 (0.5B)",
        "tag": "Free & Local",
        "badge": "Ultra Lightweight",
        "requires_key": False,
        "description": "Runs on any laptop GPU/CPU with instantaneous latency."
    },
    # Google Gemini
    {
        "provider": "gemini",
        "provider_name": "Google Gemini",
        "model": "gemini-2.0-flash",
        "label": "Gemini 2.0 Flash",
        "tag": "Google",
        "badge": "Fast & Smart",
        "requires_key": True,
        "key_param": "gemini_api_key",
        "description": "Next-gen multimodal model with lightning speed and 1M context window."
    },
    {
        "provider": "gemini",
        "provider_name": "Google Gemini",
        "model": "gemini-1.5-pro",
        "label": "Gemini 1.5 Pro",
        "tag": "Google",
        "badge": "High Reasoning",
        "requires_key": True,
        "key_param": "gemini_api_key",
        "description": "State-of-the-art reasoning for complex coding and deep analysis."
    },
    # OpenAI / ChatGPT
    {
        "provider": "openai",
        "provider_name": "OpenAI ChatGPT",
        "model": "gpt-4o",
        "label": "GPT-4o (Omni)",
        "tag": "OpenAI",
        "badge": "Flagship",
        "requires_key": True,
        "key_param": "openai_api_key",
        "description": "OpenAI's flagship conversational and reasoning model."
    },
    {
        "provider": "openai",
        "provider_name": "OpenAI ChatGPT",
        "model": "gpt-4o-mini",
        "label": "GPT-4o Mini",
        "tag": "OpenAI",
        "badge": "Affordable & Fast",
        "requires_key": True,
        "key_param": "openai_api_key",
        "description": "Fast, high-quality, lightweight model for everyday conversations."
    },
    {
        "provider": "openai",
        "provider_name": "OpenAI ChatGPT",
        "model": "o3-mini",
        "label": "o3 Mini Reasoning",
        "tag": "OpenAI",
        "badge": "Reasoning",
        "requires_key": True,
        "key_param": "openai_api_key",
        "description": "Deliberative reasoning model optimized for STEM and system design."
    },
    # Anthropic Claude
    {
        "provider": "claude",
        "provider_name": "Anthropic Claude",
        "model": "claude-3-5-sonnet-20241022",
        "label": "Claude 3.5 Sonnet",
        "tag": "Anthropic",
        "badge": "Top Human Tone",
        "requires_key": True,
        "key_param": "anthropic_api_key",
        "description": "Industry benchmark for natural prose, nuanced tone, and advanced coding."
    },
    {
        "provider": "claude",
        "provider_name": "Anthropic Claude",
        "model": "claude-3-5-haiku-20241022",
        "label": "Claude 3.5 Haiku",
        "tag": "Anthropic",
        "badge": "Ultra Responsive",
        "requires_key": True,
        "key_param": "anthropic_api_key",
        "description": "Blazing fast inference with human-level conversational fluency."
    },
    # DeepSeek
    {
        "provider": "deepseek",
        "provider_name": "DeepSeek",
        "model": "deepseek-chat",
        "label": "DeepSeek V3",
        "tag": "DeepSeek",
        "badge": "Open Weights SOTA",
        "requires_key": True,
        "key_param": "deepseek_api_key",
        "description": "Massive 671B MoE model delivering frontier-class dialogue at low cost."
    },
    {
        "provider": "deepseek",
        "provider_name": "DeepSeek",
        "model": "deepseek-reasoner",
        "label": "DeepSeek R1 (Reasoning)",
        "tag": "DeepSeek",
        "badge": "Deep Thought",
        "requires_key": True,
        "key_param": "deepseek_api_key",
        "description": "Open reasoning powerhouse with step-by-step chain of thought."
    },
    # Groq
    {
        "provider": "groq",
        "provider_name": "Groq",
        "model": "llama-3.3-70b-versatile",
        "label": "Groq Llama 3.3 (70B)",
        "tag": "Groq",
        "badge": "500+ tok/s",
        "requires_key": True,
        "key_param": "groq_api_key",
        "description": "Extreme speed LPU inference with Meta's flagship 70B parameter model."
    },
    # Mistral AI
    {
        "provider": "mistral",
        "provider_name": "Mistral AI",
        "model": "mistral-large-latest",
        "label": "Mistral Large 2",
        "tag": "Mistral",
        "badge": "Multilingual",
        "requires_key": True,
        "key_param": "mistral_api_key",
        "description": "European flagship LLM with exceptional precision and character adherence."
    },
    # OpenRouter
    {
        "provider": "openrouter",
        "provider_name": "OpenRouter",
        "model": "meta-llama/llama-3.3-70b-instruct",
        "label": "OpenRouter Universal",
        "tag": "OpenRouter",
        "badge": "Unified Gateway",
        "requires_key": True,
        "key_param": "openrouter_api_key",
        "description": "Access any open or commercial model through a single unified key."
    },
    # Perplexity
    {
        "provider": "perplexity",
        "provider_name": "Perplexity",
        "model": "sonar",
        "label": "Perplexity Sonar",
        "tag": "Perplexity",
        "badge": "Search-Grounded",
        "requires_key": True,
        "key_param": "perplexity_api_key",
        "description": "Factual conversational model with built-in search grounding."
    }
]

# Ensure every model has 'name' attribute populated
for m in UNIVERSAL_MODEL_CATALOG:
    if "name" not in m:
        m["name"] = m["model"]

class ProviderSelectRequest(BaseModel):
    provider: str
    model: Optional[str] = None
    host: Optional[str] = None

@router.get("/status")
async def get_models_status(current_user: User = Depends(get_current_user)):
    """
    Returns live connectivity status for local and cloud providers.
    """
    ollama = OllamaProvider(host=provider_manager.active_host, model=provider_manager.active_model)
    ollama_health = await ollama.check_health()
    ollama_models = await ollama.list_models() if ollama_health.get("connected") else []

    return {
        "active_provider": provider_manager.active_provider_type,
        "active_model": provider_manager.active_model,
        "active_host": provider_manager.active_host,
        "ollama": {
            "connected": ollama_health.get("connected", False),
            "version": ollama_health.get("version", "offline"),
            "host": ollama.host,
            "models": ollama_models
        },
        "builtin_local": {
            "available": True,
            "description": "Instant offline natural dialogue engine (0 downloads, 0 API keys required)."
        },
        "gemini": {
            "configured": bool(settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"))
        }
    }

@router.get("/catalog")
def get_model_catalog():
    """Returns catalog of all available models across 10+ providers."""
    return UNIVERSAL_MODEL_CATALOG

@router.get("/popular")
def get_popular_models():
    """Returns catalog for backward compatibility."""
    return UNIVERSAL_MODEL_CATALOG

@router.post("/select")
def select_model_provider(
    req: ProviderSelectRequest,
    current_user: User = Depends(get_current_user)
):
    """Switches default active provider, model, or host."""
    try:
        provider_manager.set_active_provider(
            provider_type=req.provider,
            model=req.model,
            host=req.host
        )
        return {
            "status": "success",
            "success": True,
            "active_provider": provider_manager.active_provider_type,
            "active_model": provider_manager.active_model,
            "active_host": provider_manager.active_host
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
