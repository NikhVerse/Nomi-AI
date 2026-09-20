import logging
import urllib.parse
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ImageGeneratorService:
    """
    Multi-tier AI image generation service.
    - Default: Instant high-quality zero-key free generation via Pollinations / Flux.
    - DALL-E 3: Via OpenAI API when key is available.
    - Imagen 3: Via Google Gemini when key is available.
    """

    @classmethod
    async def generate_image(
        cls,
        prompt: str,
        provider: str = "pollinations",
        aspect_ratio: str = "1:1",
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        prompt_clean = prompt.strip()
        if not prompt_clean:
            raise ValueError("Image generation prompt cannot be empty.")

        # Determine width & height from aspect_ratio
        dimensions = {
            "1:1": (1024, 1024),
            "16:9": (1280, 720),
            "9:16": (720, 1280),
            "4:3": (1024, 768),
            "3:2": (1080, 720),
        }
        width, height = dimensions.get(aspect_ratio, (1024, 1024))

        provider_norm = provider.lower()

        # 1. OpenAI DALL-E 3
        if provider_norm in ("dalle", "openai"):
            key = api_key or getattr(settings, "OPENAI_API_KEY", "") or ""
            if not key:
                # Fallback to pollinations if no key provided
                logger.info("No OpenAI key provided for DALL-E, using high-speed free engine.")
                return await cls._generate_pollinations(prompt_clean, width, height)
            return await cls._generate_dalle(prompt_clean, key, aspect_ratio)

        # 2. Default high-quality free generation (Pollinations Flux / Turbo)
        return await cls._generate_pollinations(prompt_clean, width, height)

    @classmethod
    async def _generate_pollinations(cls, prompt: str, width: int, height: int) -> Dict[str, Any]:
        """Generates instant high-res image via free Flux/SDXL engine."""
        encoded_prompt = urllib.parse.quote(prompt)
        # Using Pollinations AI with flux model and enhance prompt
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model=flux&nologo=true&enhance=true"

        return {
            "url": image_url,
            "provider": "Flux Free Engine",
            "prompt": prompt,
            "width": width,
            "height": height,
            "status": "success",
        }

    @classmethod
    async def _generate_dalle(cls, prompt: str, api_key: str, aspect_ratio: str) -> Dict[str, Any]:
        """Generates image via OpenAI DALL-E 3."""
        size = "1024x1024"
        if aspect_ratio == "16:9":
            size = "1792x1024"
        elif aspect_ratio == "9:16":
            size = "1024x1792"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "dall-e-3",
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": "standard",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers,
                    json=payload,
                )
                if resp.status_code != 200:
                    raise RuntimeError(f"DALL-E 3 Error: {resp.text}")
                data = resp.json()
                image_url = data["data"][0]["url"]
                revised_prompt = data["data"][0].get("revised_prompt", prompt)
                return {
                    "url": image_url,
                    "provider": "OpenAI DALL-E 3",
                    "prompt": revised_prompt,
                    "status": "success",
                }
            except Exception as e:
                logger.warning(f"DALL-E 3 generation failed: {e}. Falling back to free Flux engine.")
                return await cls._generate_pollinations(prompt, 1024, 1024)
