from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class AIProvider(ABC):
    """
    Abstract base class for LLM providers.
    Decouples business logic and prompt architecture from specific model vendors.
    """

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generates a model response conditioned strictly on the system_prompt
        and message history.
        """
        pass
