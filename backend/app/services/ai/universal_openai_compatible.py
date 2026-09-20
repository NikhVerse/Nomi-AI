import logging
import httpx
from typing import List, Dict, Optional, Any
from app.services.ai.base import AIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

# Provider configuration presets
PROVIDER_PRESETS = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "env_key": "OPENAI_API_KEY",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-chat",
        "env_key": "DEEPSEEK_API_KEY",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
        "env_key": "GROQ_API_KEY",
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "default_model": "mistral-large-latest",
        "env_key": "MISTRAL_API_KEY",
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "default_model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "env_key": "TOGETHER_API_KEY",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.3-70b-instruct",
        "env_key": "OPENROUTER_API_KEY",
    },
    "perplexity": {
        "base_url": "https://api.perplexity.ai",
        "default_model": "sonar",
        "env_key": "PERPLEXITY_API_KEY",
    },
}

class UniversalOpenAIProvider(AIProvider):
    """
    Universal OpenAI-compatible completion provider.
    Supports standard chat completions API format used by OpenAI, DeepSeek,
    Groq, Mistral, Together AI, OpenRouter, Perplexity, and LM Studio.
    """

    def __init__(
        self,
        provider_name: str = "openai",
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.provider_name = provider_name.lower()
        preset = PROVIDER_PRESETS.get(self.provider_name, {})

        self.base_url = (base_url or preset.get("base_url") or "https://api.openai.com/v1").rstrip("/")
        self.model = model or preset.get("default_model") or "gpt-4o-mini"
        
        # Priority: explicit key passed > preset environment key > generic settings
        env_var_name = preset.get("env_key")
        env_val = getattr(settings, env_var_name, None) if env_var_name else None
        self.api_key = api_key or env_val or ""

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = 2048,
    ) -> str:
        if not self.api_key and not self.base_url.startswith("http://localhost") and not self.base_url.startswith("http://127.0.0.1"):
            raise ValueError(
                f"No API key provided for {self.provider_name.title()}. "
                f"Please provide your API key in the chat window or settings."
            )

        # Standard OpenAI chat messages format: system message first, followed by dialogue history
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant", "system"):
                formatted_messages.append({"role": role, "content": content})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if self.provider_name == "openrouter":
            headers["HTTP-Referer"] = "https://nomi.ai"
            headers["X-Title"] = "Nomi AI Persona Studio"

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": temperature,
        }
        if max_tokens:
            if self.model.startswith("o1") or self.model.startswith("o3"):
                payload["max_completion_tokens"] = max_tokens
            else:
                payload["max_tokens"] = max_tokens

        url = f"{self.base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        err_json = response.json()
                        error_detail = err_json.get("error", {}).get("message", response.text)
                    except Exception:
                        pass
                    raise RuntimeError(f"{self.provider_name.title()} API Error ({response.status_code}): {error_detail}")

                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError(f"No response choices returned by {self.provider_name.title()}.")

                reply = choices[0].get("message", {}).get("content", "").strip()
                return reply
            except httpx.RequestError as e:
                raise RuntimeError(f"Connection to {self.provider_name.title()} failed: {str(e)}")
