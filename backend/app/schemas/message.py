from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    provider: Optional[str] = Field(None, description="Custom model provider (e.g. gemini, openai, claude, deepseek, groq, mistral, ollama)")
    model: Optional[str] = Field(None, description="Specific model identifier (e.g. gpt-4o, claude-3-5-sonnet, deepseek-chat)")
    api_key: Optional[str] = Field(None, description="User Bring-Your-Own-Key (BYOK)")
    image_url: Optional[str] = Field(None, description="Optional attached image URL")

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str # 'user' | 'assistant' | 'system'
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
