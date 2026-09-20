from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import User, Conversation, Message, Persona, PromptVersion
from app.schemas.message import MessageCreate, MessageResponse
from app.services.prompt.compiler import PromptCompiler
from app.services.ai.factory import get_ai_provider
from app.core.dependencies import get_current_user, verify_ownership

router = APIRouter(prefix="/api/conversations/{conversation_id}/messages", tags=["Messages"])


@router.get("", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all messages in a conversation in chronological order."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    verify_ownership(conv.user_id, current_user.id)

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()

    return [MessageResponse.model_validate(m) for m in messages]

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sends a user message, executes persona-conditioned AI generation, and returns response."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    verify_ownership(conv.user_id, current_user.id)

    persona = db.query(Persona).filter(Persona.id == conv.persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona for this conversation no longer exists.")

    # Retrieve current system prompt
    latest_pv = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).first()
    system_prompt = latest_pv.system_prompt if latest_pv else PromptCompiler.compile(persona)

    # 1. Save user message to database
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=msg_in.content.strip()
    )
    db.add(user_msg)
    db.commit()

    # 2. Build full conversation history for context injection
    all_past_messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).all()

    history_payload = [
        {"role": m.role, "content": m.content}
        for m in all_past_messages
    ]

    # 3. Call active AI provider (Local Ollama, Local OpenAI, Built-in, or Gemini)
    try:
        ai_provider = get_ai_provider()
        assistant_reply_text = await ai_provider.generate_response(
            system_prompt=system_prompt,
            messages=history_payload
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"We couldn't generate a response: {str(e)}"
        )


    # 4. Save assistant response
    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=assistant_reply_text
    )
    db.add(assistant_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assistant_msg)

    return MessageResponse.model_validate(assistant_msg)
