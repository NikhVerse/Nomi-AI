import logging
import httpx
from typing import List, Dict, Optional, Any
from app.services.ai.base import AIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class AnthropicProvider(AIProvider):
    """
    Native Anthropic Claude API provider.
    Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or getattr(settings, "ANTHROPIC_API_KEY", "") or ""
        self.model = model or "claude-3-5-sonnet-20241022"
        self.base_url = "https://api.anthropic.com/v1/messages"

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = 2048,
    ) -> str:
        if not self.api_key:
            raise ValueError(
                "No Anthropic API key provided. "
                "Please enter your Anthropic API key in the chat window or settings."
            )

        # Anthropic messages API requires alternating user/assistant roles.
        # System instructions are passed separately in the top-level 'system' parameter.
        formatted_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant"):
                formatted_messages.append({"role": role, "content": content})

        if not formatted_messages:
            formatted_messages = [{"role": "user", "content": "Hello."}]

        # Ensure first message is from user
        if formatted_messages[0]["role"] != "user":
            formatted_messages.insert(0, {"role": "user", "content": "Hello."})

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": self.model,
            "max_tokens": max_tokens or 2048,
            "system": system_prompt,
            "messages": formatted_messages,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                response = await client.post(self.base_url, headers=headers, json=payload)
                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        err_json = response.json()
                        error_detail = err_json.get("error", {}).get("message", response.text)
                    except Exception:
                        pass
                    raise RuntimeError(f"Anthropic Claude API Error ({response.status_code}): {error_detail}")

                data = response.json()
                content_blocks = data.get("content", [])
                text_parts = [block.get("text", "") for block in content_blocks if block.get("type") == "text"]
                return "".join(text_parts).strip()
            except httpx.RequestError as e:
                raise RuntimeError(f"Connection to Anthropic failed: {str(e)}")
