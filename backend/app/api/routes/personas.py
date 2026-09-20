from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import User, Persona, PromptVersion, Conversation
from app.schemas.persona import (
    PersonaCreate, PersonaUpdate, PersonaResponse, PromptVersionResponse
)
from app.services.prompt.compiler import PromptCompiler
from app.core.dependencies import get_current_user, verify_ownership

router = APIRouter(prefix="/api/personas", tags=["Personas"])

def build_persona_response(persona: Persona, db: Session) -> PersonaResponse:
    conv_count = db.query(Conversation).filter(Conversation.persona_id == persona.id).count()
    latest_pv = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).first()

    system_prompt = latest_pv.system_prompt if latest_pv else PromptCompiler.compile(persona)
    current_version = latest_pv.version if latest_pv else 1

    return PersonaResponse(
        id=persona.id,
        user_id=persona.user_id,
        name=persona.name,
        role=persona.role,
        description=persona.description,
        objective=persona.objective,
        personality=persona.personality or [],
        tone=persona.tone,
        expertise=persona.expertise or [],
        rules=persona.rules or [],
        restrictions=persona.restrictions or [],
        response_preferences=persona.response_preferences or [],
        created_at=persona.created_at,
        updated_at=persona.updated_at,
        conversation_count=conv_count,
        current_version=current_version,
        system_prompt=system_prompt
    )

@router.get("", response_model=List[PersonaResponse])
def list_personas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all personas owned by the authenticated user."""
    personas = db.query(Persona).filter(
        Persona.user_id == current_user.id
    ).order_by(Persona.updated_at.desc()).all()

    return [build_persona_response(p, db) for p in personas]

@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
def create_persona(
    persona_in: PersonaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new AI persona, compiles its initial system prompt, and saves version 1."""
    persona = Persona(
        user_id=current_user.id,
        name=persona_in.name.strip(),
        role=persona_in.role.strip(),
        description=persona_in.description.strip(),
        objective=persona_in.objective.strip(),
        personality=persona_in.personality,
        tone=persona_in.tone.strip(),
        expertise=persona_in.expertise,
        rules=persona_in.rules,
        restrictions=persona_in.restrictions,
        response_preferences=persona_in.response_preferences
    )
    db.add(persona)
    db.commit()
    db.refresh(persona)

    # Compile initial system prompt and record Version 1
    compiled_prompt = PromptCompiler.compile(persona)
    prompt_version = PromptVersion(
        persona_id=persona.id,
        version=1,
        system_prompt=compiled_prompt
    )
    db.add(prompt_version)
    db.commit()

    return build_persona_response(persona, db)

@router.get("/{persona_id}", response_model=PersonaResponse)
def get_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets persona details if owned by the user."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)
    return build_persona_response(persona, db)

@router.put("/{persona_id}", response_model=PersonaResponse)
def update_persona(
    persona_id: str,
    persona_in: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates persona configuration and creates a new prompt version if instructions change."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    # Update provided fields
    if persona_in.name is not None:
        persona.name = persona_in.name.strip()
    if persona_in.role is not None:
        persona.role = persona_in.role.strip()
    if persona_in.description is not None:
        persona.description = persona_in.description.strip()
    if persona_in.objective is not None:
        persona.objective = persona_in.objective.strip()
    if persona_in.personality is not None:
        persona.personality = persona_in.personality
    if persona_in.tone is not None:
        persona.tone = persona_in.tone.strip()
    if persona_in.expertise is not None:
        persona.expertise = persona_in.expertise
    if persona_in.rules is not None:
        persona.rules = persona_in.rules
    if persona_in.restrictions is not None:
        persona.restrictions = persona_in.restrictions
    if persona_in.response_preferences is not None:
        persona.response_preferences = persona_in.response_preferences

    # Re-compile system prompt
    new_compiled_prompt = PromptCompiler.compile(persona)

    # Check latest version
    latest_pv = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).first()

    if not latest_pv or latest_pv.system_prompt != new_compiled_prompt:
        next_ver = (latest_pv.version + 1) if latest_pv else 1
        new_version_record = PromptVersion(
            persona_id=persona.id,
            version=next_ver,
            system_prompt=new_compiled_prompt
        )
        db.add(new_version_record)

    db.commit()
    db.refresh(persona)
    return build_persona_response(persona, db)

@router.delete("/{persona_id}", status_code=status.HTTP_200_OK)
def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a persona and all its cascades."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    db.delete(persona)
    db.commit()
    return {"message": "Persona deleted successfully."}

@router.get("/{persona_id}/prompt")
def get_persona_prompt(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns current compiled prompt and version."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    latest_pv = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).first()

    prompt = latest_pv.system_prompt if latest_pv else PromptCompiler.compile(persona)
    version = latest_pv.version if latest_pv else 1

    return {
        "persona_id": persona.id,
        "persona_name": persona.name,
        "version": version,
        "system_prompt": prompt,
        "updated_at": latest_pv.created_at if latest_pv else persona.updated_at
    }

@router.post("/{persona_id}/compile-prompt")
def preview_compiled_prompt(
    persona_id: str,
    draft_in: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dynamic compilation preview from draft configuration without saving."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    # Merge existing persona data with draft fields
    merged = {
        "name": draft_in.name if draft_in.name is not None else persona.name,
        "role": draft_in.role if draft_in.role is not None else persona.role,
        "description": draft_in.description if draft_in.description is not None else persona.description,
        "objective": draft_in.objective if draft_in.objective is not None else persona.objective,
        "personality": draft_in.personality if draft_in.personality is not None else persona.personality,
        "tone": draft_in.tone if draft_in.tone is not None else persona.tone,
        "expertise": draft_in.expertise if draft_in.expertise is not None else persona.expertise,
        "rules": draft_in.rules if draft_in.rules is not None else persona.rules,
        "restrictions": draft_in.restrictions if draft_in.restrictions is not None else persona.restrictions,
        "response_preferences": draft_in.response_preferences if draft_in.response_preferences is not None else persona.response_preferences,
    }

    compiled = PromptCompiler.compile(merged)
    return {"compiled_prompt": compiled}

@router.get("/{persona_id}/prompt-versions", response_model=List[PromptVersionResponse])
def get_prompt_versions(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists historical compiled prompt versions for the persona."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    versions = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).all()

    return [PromptVersionResponse.model_validate(v) for v in versions]
