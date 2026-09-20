from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import User, Persona, Evaluation, PromptVersion
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse
from app.services.prompt.compiler import PromptCompiler
from app.services.ai.factory import get_ai_provider
from app.services.evaluation.evaluator import PersonaEvaluator
from app.core.dependencies import get_current_user, verify_ownership

router = APIRouter(prefix="/api/evaluations", tags=["Evaluations"])


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def run_evaluation(
    eval_in: EvaluationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executes a test case against the persona and runs transparent 5-metric scoring."""
    persona = db.query(Persona).filter(Persona.id == eval_in.persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    # 1. Fetch current compiled system prompt
    latest_pv = db.query(PromptVersion).filter(
        PromptVersion.persona_id == persona.id
    ).order_by(PromptVersion.version.desc()).first()
    system_prompt = latest_pv.system_prompt if latest_pv else PromptCompiler.compile(persona)

    # 2. Generate persona response to test case using active provider
    try:
        ai_provider = get_ai_provider()
        evaluator = PersonaEvaluator(ai_provider=ai_provider)
        persona_response = await ai_provider.generate_response(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": eval_in.test_case.strip()}],
            temperature=0.7
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Persona execution error during evaluation: {str(e)}"
        )

    # 3. Grade response across the 5 dimensions
    evaluation_result = await evaluator.evaluate(
        system_prompt=system_prompt,
        test_case=eval_in.test_case.strip(),
        response_text=persona_response
    )


    # 4. Save evaluation run to database
    eval_record = Evaluation(
        user_id=current_user.id,
        persona_id=persona.id,
        test_case=eval_in.test_case.strip(),
        response=persona_response,
        instruction_adherence=evaluation_result["instruction_adherence"],
        persona_consistency=evaluation_result["persona_consistency"],
        tone_consistency=evaluation_result["tone_consistency"],
        relevance=evaluation_result["relevance"],
        preference_compliance=evaluation_result["preference_compliance"],
        feedback=evaluation_result["feedback"]
    )
    db.add(eval_record)
    db.commit()
    db.refresh(eval_record)

    return EvaluationResponse.model_validate(eval_record)

@router.get("/{persona_id}", response_model=List[EvaluationResponse])
def get_persona_evaluations(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all past evaluations run on the specified persona."""
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    verify_ownership(persona.user_id, current_user.id)

    evals = db.query(Evaluation).filter(
        Evaluation.persona_id == persona_id,
        Evaluation.user_id == current_user.id
    ).order_by(Evaluation.created_at.desc()).all()

    return [EvaluationResponse.model_validate(e) for e in evals]
