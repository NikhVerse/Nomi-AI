from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class PersonaBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., min_length=2, max_length=150)
    description: str = Field("", max_length=1000)
    objective: str = Field("", max_length=1500)
    personality: List[str] = Field(default_factory=list)
    tone: str = Field("Professional", max_length=50)
    expertise: List[str] = Field(default_factory=list)
    rules: List[str] = Field(default_factory=list)
    restrictions: List[str] = Field(default_factory=list)
    response_preferences: List[str] = Field(default_factory=list)

class PersonaCreate(PersonaBase):
    pass

class PersonaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    objective: Optional[str] = None
    personality: Optional[List[str]] = None
    tone: Optional[str] = None
    expertise: Optional[List[str]] = None
    rules: Optional[List[str]] = None
    restrictions: Optional[List[str]] = None
    response_preferences: Optional[List[str]] = None

class PromptVersionResponse(BaseModel):
    id: str
    persona_id: str
    version: int
    system_prompt: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PersonaResponse(PersonaBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    conversation_count: int = 0
    current_version: int = 1
    system_prompt: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
