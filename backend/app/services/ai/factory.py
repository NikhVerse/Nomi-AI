import logging
from typing import Optional, Dict, Any
from app.services.ai.base import AIProvider
from app.services.ai.ollama import OllamaProvider
from app.services.ai.local_openai import LocalOpenAIProvider
from app.services.ai.builtin_local import BuiltinLocalProvider
from app.services.ai.gemini import GeminiProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIProviderManager:
    """
    Central registry and manager for local and cloud AI providers.
    Allows runtime switching between Local Ollama, Local OpenAI endpoints,
    Built-in Offline Engine, and Google Gemini.
    """

    def __init__(self):
        self._active_provider_type: str = settings.DEFAULT_AI_PROVIDER
        self._active_model: str = settings.OLLAMA_MODEL
        self._active_host: str = settings.OLLAMA_HOST
        self._providers: Dict[str, AIProvider] = {}

    @property
    def active_provider_type(self) -> str:
        return self._active_provider_type

    @property
    def active_model(self) -> str:
        return self._active_model

    @property
    def active_host(self) -> str:
        return self._active_host

    def set_active_provider(
        self,
        provider_type: str,
        model: Optional[str] = None,
        host: Optional[str] = None
    ):
        """Switches the active provider and model configuration."""
        valid_types = {"ollama", "local_openai", "builtin_local", "gemini"}
        if provider_type not in valid_types:
            raise ValueError(f"Invalid provider: {provider_type}. Must be one of {valid_types}")

        self._active_provider_type = provider_type
        if model:
            self._active_model = model
        if host:
            self._active_host = host

        logger.info(
            f"Active AI provider updated: {self._active_provider_type} "
            f"(model={self._active_model}, host={self._active_host})"
        )

    def get_provider(
        self,
        provider_type: Optional[str] = None,
        model: Optional[str] = None,
        host: Optional[str] = None
    ) -> AIProvider:
        """Instantiates or retrieves the configured provider."""
        ptype = provider_type or self._active_provider_type
        pmodel = model or self._active_model
        phost = host or self._active_host

        if ptype == "ollama":
            return OllamaProvider(host=phost, model=pmodel)
        elif ptype == "local_openai":
            return LocalOpenAIProvider(base_url=phost or settings.LOCAL_OPENAI_URL, model=pmodel or settings.LOCAL_OPENAI_MODEL)
        elif ptype == "gemini":
            return GeminiProvider()
        else:
            return BuiltinLocalProvider()

# Global provider manager instance
provider_manager = AIProviderManager()

def get_ai_provider(
    provider_type: Optional[str] = None,
    model: Optional[str] = None,
    host: Optional[str] = None
) -> AIProvider:
    return provider_manager.get_provider(provider_type, model, host)
