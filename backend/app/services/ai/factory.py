import logging
from typing import Optional, Dict, Any
from app.services.ai.base import AIProvider
from app.services.ai.ollama import OllamaProvider
from app.services.ai.local_openai import LocalOpenAIProvider
from app.services.ai.builtin_local import BuiltinLocalProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.universal_openai_compatible import UniversalOpenAIProvider
from app.services.ai.anthropic import AnthropicProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = {
    "gemini",
    "openai",
    "claude",
    "deepseek",
    "groq",
    "mistral",
    "together",
    "openrouter",
    "perplexity",
    "cohere",
    "ollama",
    "local_openai",
    "builtin_local",
}

class AIProviderManager:
    """
    Central registry and dynamic factory for all AI providers.
    Supports Bring-Your-Own-Key (BYOK) per-request or global runtime switching.
    """

    def __init__(self):
        self._active_provider_type: str = settings.DEFAULT_AI_PROVIDER
        self._active_model: str = settings.OLLAMA_MODEL
        self._active_host: str = settings.OLLAMA_HOST

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
        host: Optional[str] = None,
    ):
        """Switches the default active provider and model configuration."""
        ptype = provider_type.lower()
        if ptype not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Invalid provider: {provider_type}. Must be one of {sorted(SUPPORTED_PROVIDERS)}")

        self._active_provider_type = ptype
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
        host: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> AIProvider:
        """
        Dynamically instantiates the requested provider with optional custom BYOK credentials.
        """
        ptype = (provider_type or self._active_provider_type).lower()
        pmodel = model or (self._active_model if ptype == self._active_provider_type else None)
        phost = host or self._active_host

        # 1. Google Gemini
        if ptype == "gemini":
            return GeminiProvider(api_key=api_key, model=pmodel or "gemini-2.0-flash")

        # 2. Anthropic Claude
        elif ptype == "claude" or ptype == "anthropic":
            return AnthropicProvider(api_key=api_key, model=pmodel or "claude-3-5-sonnet-20241022")

        # 3. Universal OpenAI Compatible Providers (OpenAI, DeepSeek, Groq, Mistral, Together, OpenRouter, Perplexity)
        elif ptype in ("openai", "chatgpt"):
            return UniversalOpenAIProvider(
                provider_name="openai",
                api_key=api_key,
                model=pmodel or "gpt-4o-mini",
            )
        elif ptype == "deepseek":
            return UniversalOpenAIProvider(
                provider_name="deepseek",
                api_key=api_key,
                model=pmodel or "deepseek-chat",
            )
        elif ptype == "groq":
            return UniversalOpenAIProvider(
                provider_name="groq",
                api_key=api_key,
                model=pmodel or "llama-3.3-70b-versatile",
            )
        elif ptype == "mistral":
            return UniversalOpenAIProvider(
                provider_name="mistral",
                api_key=api_key,
                model=pmodel or "mistral-large-latest",
            )
        elif ptype == "together":
            return UniversalOpenAIProvider(
                provider_name="together",
                api_key=api_key,
                model=pmodel or "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            )
        elif ptype == "openrouter":
            return UniversalOpenAIProvider(
                provider_name="openrouter",
                api_key=api_key,
                model=pmodel or "meta-llama/llama-3.3-70b-instruct",
            )
        elif ptype == "perplexity":
            return UniversalOpenAIProvider(
                provider_name="perplexity",
                api_key=api_key,
                model=pmodel or "sonar",
            )

        # 4. Local Ollama
        elif ptype == "ollama":
            return OllamaProvider(host=phost, model=pmodel or "llama3.2:1b")

        # 5. Local OpenAI compatible (LM Studio, LocalAI)
        elif ptype in ("local_openai", "lm_studio"):
            return LocalOpenAIProvider(
                base_url=phost or settings.LOCAL_OPENAI_URL,
                model=pmodel or settings.LOCAL_OPENAI_MODEL,
            )

        # 6. Built-in Offline Natural Engine (default fallback)
        else:
            return BuiltinLocalProvider()

# Global singleton
provider_manager = AIProviderManager()

def get_ai_provider(
    provider_type: Optional[str] = None,
    model: Optional[str] = None,
    host: Optional[str] = None,
    api_key: Optional[str] = None,
) -> AIProvider:
    return provider_manager.get_provider(provider_type, model, host, api_key)
