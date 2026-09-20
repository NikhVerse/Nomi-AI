import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.dependencies import get_current_user
from app.db.models import User
from app.services.ai.factory import provider_manager, get_ai_provider
from app.services.ai.ollama import OllamaProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/models", tags=["AI Models & Providers"])

POPULAR_LOCAL_MODELS = [
    {
        "name": "qwen2.5:0.5b",
        "label": "Qwen 2.5 (0.5B)",
        "size": "~397 MB",
        "description": "Ultra-lightweight & lightning-fast. Ideal for any laptop or desktop GPU.",
        "recommended": True
    },
    {
        "name": "llama3.2:1b",
        "label": "Llama 3.2 (1B)",
        "size": "~1.3 GB",
        "description": "Meta's official compact model. High-speed reasoning with zero API cost.",
        "recommended": True
    },
    {
        "name": "llama3.2:3b",
        "label": "Llama 3.2 (3B)",
        "size": "~2.0 GB",
        "description": "Powerful 3B parameter model from Meta with balanced quality & speed.",
        "recommended": False
    },
    {
        "name": "phi3:mini",
        "label": "Microsoft Phi-3 Mini (3.8B)",
        "size": "~2.2 GB",
        "description": "Exceptional reasoning and code generation in a compact footprint.",
        "recommended": False
    },
    {
        "name": "mistral:7b",
        "label": "Mistral (7B)",
        "size": "~4.1 GB",
        "description": "The gold standard open-weights instruction model for complex tasks.",
        "recommended": False
    }
]

class ProviderSelectRequest(BaseModel):
    provider: str
    model: Optional[str] = None
    host: Optional[str] = None

class PullModelRequest(BaseModel):
    model: str

@router.get("/status")
async def get_models_status(current_user: User = Depends(get_current_user)):
    """
    Returns live connectivity status for local and free model providers.
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

@router.get("/popular")
def get_popular_models():
    """Returns catalog of top free local models."""
    return POPULAR_LOCAL_MODELS

@router.post("/select")
def select_model_provider(
    req: ProviderSelectRequest,
    current_user: User = Depends(get_current_user)
):
    """Switches the active provider, model, or host."""
    try:
        provider_manager.set_active_provider(
            provider_type=req.provider,
            model=req.model,
            host=req.host
        )
        return {
            "success": True,
            "active_provider": provider_manager.active_provider_type,
            "active_model": provider_manager.active_model,
            "active_host": provider_manager.active_host
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/pull")
async def pull_ollama_model(
    req: PullModelRequest,
    current_user: User = Depends(get_current_user)
):
    """Initiates an asynchronous model pull via local Ollama daemon."""
    model_name = req.model.strip()
    host = provider_manager.active_host

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{host}/api/pull",
                json={"name": model_name, "stream": False},
                timeout=10.0
            )
            return {"status": "initiated", "model": model_name}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Local Ollama server is not running on {host}. Run 'ollama serve' first."
        )
    except Exception as e:
        # If timeout because download is in progress, that's normal for big models
        return {"status": "downloading", "model": model_name, "note": str(e)}
