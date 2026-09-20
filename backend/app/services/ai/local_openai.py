import logging
import httpx
from typing import List, Dict, Optional, Any
from app.services.ai.base import AIProvider
from app.services.ai.builtin_local import BuiltinLocalProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalOpenAIProvider(AIProvider):
    """
    OpenAI-compatible local provider for tools like LM Studio, LocalAI, Jan,
    and vLLM running on local ports (e.g. http://127.0.0.1:1234/v1).
    Zero external API keys required.
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.LOCAL_OPENAI_URL).rstrip("/")
        self.model = model or settings.LOCAL_OPENAI_MODEL
        self.fallback = BuiltinLocalProvider()

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        if not messages:
            raise ValueError("Cannot generate response with empty message history.")

        payload_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            payload_messages.append({"role": m["role"], "content": m["content"]})

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers={"Authorization": "Bearer not-needed"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        if content:
                            return content
                else:
                    logger.warning(
                        f"Local OpenAI endpoint returned HTTP {resp.status_code}. "
                        f"Falling back to built-in local engine."
                    )
        except Exception as e:
            logger.info(
                f"Local OpenAI endpoint at {self.base_url} unavailable ({e}). "
                f"Falling back to built-in local engine."
            )

        return await self.fallback.generate_response(
            system_prompt=system_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

    async def check_health(self) -> Dict[str, Any]:
        """Checks if local OpenAI-compatible endpoint is running."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/models")
                return {"connected": resp.status_code == 200, "url": self.base_url}
        except Exception as e:
            return {"connected": False, "error": str(e), "url": self.base_url}
