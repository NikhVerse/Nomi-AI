from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ConversationCreate(BaseModel):
    persona_id: str
    title: Optional[str] = Field("New Conversation", max_length=150)

class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    persona_id: str
    persona_name: Optional[str] = None
    persona_role: Optional[str] = None
    title: str
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
