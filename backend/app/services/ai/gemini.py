import logging
from typing import List, Dict, Optional
from app.services.ai.base import AIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    """
    Google Gemini implementation of AIProvider.
    Uses Gemini's native system_instruction parameter.
    Falls back cleanly to simulation mode when GEMINI_API_KEY is not configured.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key and self.api_key.strip() and not self.api_key.startswith("your_"):
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize google.genai client: {e}. Falling back to simulation.")
                self.client = None

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        # Validate inputs
        if not messages:
            raise ValueError("Cannot generate response with empty message history.")
        
        last_user_message = messages[-1].get("content", "").strip()
        if not last_user_message:
            raise ValueError("User message cannot be empty.")

        # Real Gemini API invocation
        if self.client:
            try:
                from google.genai import types
                
                # Format conversation history for Gemini contents
                contents = []
                for msg in messages:
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg["content"])]
                        )
                    )

                config = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens or 1500
                )

                response = self.client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=contents,
                    config=config
                )

                result_text = response.text or ""
                # Section 25 Response Validation
                if not result_text.strip():
                    raise ValueError("Gemini returned an empty response.")
                return result_text.strip()

            except Exception as e:
                logger.error(f"Error calling Gemini API: {e}", exc_info=True)
                # If Gemini API fails (e.g. rate limit, quota, invalid key), provide helpful message
                raise RuntimeError(f"AI Provider error: {str(e)}")

        # Simulation Mode when no valid GEMINI_API_KEY is supplied
        return self._simulate_persona_response(system_prompt, last_user_message)

    def _simulate_persona_response(self, system_prompt: str, user_query: str) -> str:
        """
        Produces a high-quality persona-conditioned simulated response for local
        development and automated verification when an external API key is omitted.
        """
        # Parse basic persona identity from the system prompt if present
        persona_name = "Nomi Assistant"
        for line in system_prompt.split("\n"):
            if line.startswith("IDENTITY"):
                continue
            if "You are " in line:
                persona_name = line.replace("You are ", "").strip(" .")
                break

        return (
            f"Hello! I am **{persona_name}**, conditioned by the system prompt above.\n\n"
            f"Regarding your query: *\"{user_query}\"*\n\n"
            f"Here are my thoughts based on my configured role and behavioral rules:\n"
            f"- **Point 1**: I strictly adhere to my configured tone and guidelines.\n"
            f"- **Point 2**: All instructions provided in my system prompt govern this interaction.\n"
            f"- **Point 3**: Practical examples and structured formatting are applied according to my persona.\n\n"
            f"*(Note: Running in local simulation mode. Set GEMINI_API_KEY in backend/.env to connect live Gemini-2.0-Flash)*"
        )
