from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import User, Conversation, Persona, Message
from app.schemas.conversation import (
    ConversationCreate, ConversationUpdate, ConversationResponse
)
from app.core.dependencies import get_current_user, verify_ownership

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

def build_conv_response(c: Conversation, db: Session) -> ConversationResponse:
    persona = db.query(Persona).filter(Persona.id == c.persona_id).first()
    msg_count = db.query(Message).filter(Message.conversation_id == c.id).count()
    return ConversationResponse(
        id=c.id,
        user_id=c.user_id,
        persona_id=c.persona_id,
        persona_name=persona.name if persona else "Deleted Persona",
        persona_role=persona.role if persona else "Unknown Role",
        title=c.title,
        message_count=msg_count,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    persona_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists conversations belonging to the current user."""
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if persona_id:
        query = query.filter(Conversation.persona_id == persona_id)
    conversations = query.order_by(Conversation.updated_at.desc()).all()
    return [build_conv_response(c, db) for c in conversations]

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Starts a new conversation session with a persona."""
    persona = db.query(Persona).filter(Persona.id == conv_in.persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Selected persona does not exist.")
    verify_ownership(persona.user_id, current_user.id)

    conv = Conversation(
        user_id=current_user.id,
        persona_id=persona.id,
        title=conv_in.title or f"Chat with {persona.name}"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return build_conv_response(conv, db)

@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets details for a specific conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    verify_ownership(conv.user_id, current_user.id)
    return build_conv_response(conv, db)

@router.patch("/{conversation_id}", response_model=ConversationResponse)
def rename_conversation(
    conversation_id: str,
    update_in: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Renames an existing conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    verify_ownership(conv.user_id, current_user.id)

    conv.title = update_in.title.strip()
    db.commit()
    db.refresh(conv)
    return build_conv_response(conv, db)

@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a conversation and its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    verify_ownership(conv.user_id, current_user.id)

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully."}
