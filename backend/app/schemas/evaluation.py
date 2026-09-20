from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class EvaluationCreate(BaseModel):
    persona_id: str
    test_case: str = Field(..., min_length=3, max_length=1000)

class EvaluationResponse(BaseModel):
    id: str
    user_id: str
    persona_id: str
    test_case: str
    response: str
    instruction_adherence: float
    persona_consistency: float
    tone_consistency: float
    relevance: float
    preference_compliance: float
    feedback: str
    created_at: datetime

    @property
    def overall_score(self) -> float:
        scores = [
            self.instruction_adherence,
            self.persona_consistency,
            self.tone_consistency,
            self.relevance,
            self.preference_compliance
        ]
        return round(sum(scores) / len(scores), 2)

    model_config = ConfigDict(from_attributes=True)
