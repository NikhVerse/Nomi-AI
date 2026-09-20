from typing import List, Dict, Any, Union
from app.services.prompt.templates import DEFAULT_GENERAL_REQUIREMENTS, DEFAULT_RESTRICTIONS

class PromptCompiler:
    """
    Compiles persona configuration into a deterministic, highly-structured
    system prompt instruction for LLM conditioning.
    """

    @classmethod
    def compile(cls, persona_data: Union[Any, Dict[str, Any]]) -> str:
        # Extract attributes safely whether object or dict
        def get_attr(key: str, default: Any = None):
            if isinstance(persona_data, dict):
                return persona_data.get(key, default)
            return getattr(persona_data, key, default)

        name = (get_attr("name") or "Assistant").strip()
        role = (get_attr("role") or "Helpful AI Assistant").strip()
        description = (get_attr("description") or "").strip()
        objective = (get_attr("objective") or "").strip()
        
        personality = get_attr("personality") or []
        if isinstance(personality, str):
            personality = [p.strip() for p in personality.split(",") if p.strip()]
        
        tone = (get_attr("tone") or "Professional").strip()
        
        expertise = get_attr("expertise") or []
        if isinstance(expertise, str):
            expertise = [e.strip() for e in expertise.split(",") if e.strip()]
            
        rules = get_attr("rules") or []
        if isinstance(rules, str):
            rules = [r.strip() for r in rules.split("\n") if r.strip()]
            
        user_restrictions = get_attr("restrictions") or []
        if isinstance(user_restrictions, str):
            user_restrictions = [r.strip() for r in user_restrictions.split("\n") if r.strip()]
            
        # Combine user restrictions with system safety defaults without duplicates
        all_restrictions = list(dict.fromkeys(user_restrictions + DEFAULT_RESTRICTIONS))
        
        preferences = get_attr("response_preferences") or []
        if isinstance(preferences, str):
            preferences = [p.strip() for p in preferences.split("\n") if p.strip()]

        sections: List[str] = []

        # 1. IDENTITY
        sections.append(f"IDENTITY\nYou are {name}.")
        if description:
            sections.append(f"BACKGROUND\n{description}")

        # 2. ROLE
        sections.append(f"ROLE\nYou act as {role}.")

        # 3. OBJECTIVE
        if objective:
            sections.append(f"OBJECTIVE\n{objective}")

        # 4. PERSONALITY
        if personality:
            traits_str = ", ".join(personality)
            sections.append(f"PERSONALITY\n{traits_str}")

        # 5. COMMUNICATION STYLE
        sections.append(f"COMMUNICATION STYLE\nAdopt a {tone} tone in all responses.")

        # 6. EXPERTISE
        if expertise:
            expertise_items = "\n".join(f"- {item}" for item in expertise)
            sections.append(f"EXPERTISE\n{expertise_items}")

        # 7. BEHAVIORAL RULES
        if rules:
            rule_items = "\n".join(f"- {rule}" for rule in rules)
            sections.append(f"BEHAVIORAL RULES\n{rule_items}")

        # 8. RESTRICTIONS
        if all_restrictions:
            restriction_items = "\n".join(f"- {rest}" for rest in all_restrictions)
            sections.append(f"RESTRICTIONS\n{restriction_items}")

        # 9. RESPONSE PREFERENCES
        if preferences:
            pref_items = "\n".join(f"- {pref}" for pref in preferences)
            sections.append(f"RESPONSE PREFERENCES\n{pref_items}")

        # 10. GENERAL RESPONSE REQUIREMENTS
        gen_req_items = "\n".join(f"- {req}" for req in DEFAULT_GENERAL_REQUIREMENTS)
        sections.append(f"GENERAL RESPONSE REQUIREMENTS\n{gen_req_items}")

        return "\n\n".join(sections)
