import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="user", cascade="all, delete-orphan")

class Persona(Base):
    __tablename__ = "personas"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    objective = Column(Text, default="", nullable=False)
    personality = Column(JSON, default=list, nullable=False) # list of traits & custom notes
    tone = Column(String(100), default="Professional", nullable=False)
    expertise = Column(JSON, default=list, nullable=False) # list of tags
    rules = Column(JSON, default=list, nullable=False) # list of behavioral rules
    restrictions = Column(JSON, default=list, nullable=False) # list of guardrails
    response_preferences = Column(JSON, default=list, nullable=False) # list of response preferences
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    user = relationship("User", back_populates="personas")
    prompt_versions = relationship("PromptVersion", back_populates="persona", cascade="all, delete-orphan", order_by="desc(PromptVersion.version)")
    conversations = relationship("Conversation", back_populates="persona", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="persona", cascade="all, delete-orphan")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    persona_id = Column(String(36), ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    system_prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    persona = relationship("Persona", back_populates="prompt_versions")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    persona_id = Column(String(36), ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    user = relationship("User", back_populates="conversations")
    persona = relationship("Persona", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False) # 'user' or 'assistant' or 'system'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    persona_id = Column(String(36), ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    instruction_adherence = Column(Float, nullable=False)
    persona_consistency = Column(Float, nullable=False)
    tone_consistency = Column(Float, nullable=False)
    relevance = Column(Float, nullable=False)
    preference_compliance = Column(Float, nullable=False)
    feedback = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    user = relationship("User", back_populates="evaluations")
    persona = relationship("Persona", back_populates="evaluations")
