import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from app.core.dependencies import get_current_user
from app.db.models import User
from app.services.ai.image_generator import ImageGeneratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/images", tags=["Image Generation"])

class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000, description="Text prompt describing the desired image")
    provider: Optional[str] = Field("pollinations", description="Image provider (pollinations, dalle)")
    aspect_ratio: Optional[str] = Field("1:1", description="Aspect ratio (1:1, 16:9, 9:16, 4:3)")
    api_key: Optional[str] = Field(None, description="Optional custom user API key for paid providers")

class ImageGenerateResponse(BaseModel):
    url: str
    provider: str
    prompt: str
    width: Optional[int] = None
    height: Optional[int] = None
    status: str

@router.post("/generate", response_model=ImageGenerateResponse, status_code=status.HTTP_200_OK)
async def generate_image(
    req: ImageGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generates an AI image from a text prompt.
    Supports free Flux/SDXL engine (instant, zero keys required) as well as DALL-E 3.
    """
    try:
        result = await ImageGeneratorService.generate_image(
            prompt=req.prompt,
            provider=req.provider or "pollinations",
            aspect_ratio=req.aspect_ratio or "1:1",
            api_key=req.api_key,
        )
        return ImageGenerateResponse(**result)
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate image: {str(e)}",
        )
