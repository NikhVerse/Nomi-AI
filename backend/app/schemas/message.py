from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str # 'user' | 'assistant' | 'system'
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
