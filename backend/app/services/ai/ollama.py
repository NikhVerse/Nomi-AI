import logging
import httpx
from typing import List, Dict, Optional, Any
from app.services.ai.base import AIProvider
from app.services.ai.builtin_local import BuiltinLocalProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaProvider(AIProvider):
    """
    Local Ollama LLM provider for 100% free, private, local model inference.
    Connects to local Ollama server (default http://127.0.0.1:11434).
    Zero API keys required. Seamlessly falls back to BuiltinLocalProvider
    if the local daemon is offline or the requested model is downloading.
    """

    def __init__(self, host: Optional[str] = None, model: Optional[str] = None):
        self.host = (host or settings.OLLAMA_HOST).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
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
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.host}/api/chat", json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("message", {}).get("content", "").strip()
                    if content:
                        return content
                else:
                    logger.warning(
                        f"Ollama returned HTTP {resp.status_code}: {resp.text}. "
                        f"Falling back to built-in local engine."
                    )
        except httpx.ConnectError:
            logger.info(
                f"Ollama server at {self.host} not reachable. Using built-in local engine."
            )
        except Exception as e:
            logger.warning(f"Ollama invocation error: {e}. Using built-in local engine.")

        # Seamless local fallback
        return await self.fallback.generate_response(
            system_prompt=system_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Queries local Ollama instance for pulled models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.host}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    return [
                        {
                            "name": m.get("name"),
                            "size": m.get("size", 0),
                            "modified_at": m.get("modified_at")
                        }
                        for m in data.get("models", [])
                    ]
        except Exception:
            pass
        return []

    async def check_health(self) -> Dict[str, Any]:
        """Checks if local Ollama daemon is active and responsive."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.host}/api/version")
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "connected": True,
                        "version": data.get("version", "unknown"),
                        "host": self.host
                    }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "host": self.host
            }
        return {"connected": False, "host": self.host}
