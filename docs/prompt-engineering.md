# Nomi AI - Prompt Engineering Principles & Methodology

## 1. Introduction
Prompt Engineering in **Nomi AI** is treated as software engineering rather than ad-hoc trial-and-error. Instead of asking users to manually write monolithic prompts, Nomi AI decomposes an AI persona into discrete, typed behavioral dimensions and dynamically compiles them into a structured system instruction.

---

## 2. Structured Dimensions of a Persona

A persona configuration consists of the following modular components:

| Dimension | Description | Purpose |
| :--- | :--- | :--- |
| **Identity** | Name and unique entity definition | Establishes the agent's core sense of self |
| **Role** | Professional function or domain title | Directs role-conditioned latent knowledge |
| **Objective** | Primary mission / user goal | Anchors answers to purposeful, actionable outcomes |
| **Personality** | Behavioral traits and dispositions | Governs attitude, empathy, and conversational demeanor |
| **Communication Style** | Specific tone (e.g. Concise, Academic, Friendly) | Dictates vocabulary density, pacing, and formality |
| **Expertise** | Domain specialties and keywords | Prioritizes domain accuracy and depth |
| **Behavioral Rules** | Positive constraints ("Do X", "Always Y") | Enforces required methodologies and approaches |
| **Restrictions** | Negative guardrails ("Never X", "Do not Y") | Prevents hallucinations, prompt leakage, and overreach |
| **Response Preferences** | Structural formatting instructions | Mandates bullet points, code snippets, or brevity |

---

## 3. Dynamic Compilation Process

The compilation engine (`app.services.prompt.compiler.PromptCompiler`) compiles these structured blocks deterministically:

1. **Header Block**: Defines who the persona is and their explicit role.
2. **Core Directives**: Establishes what the persona must achieve.
3. **Manner & Voice**: Combines personality traits and communication tone.
4. **Knowledge Scope**: Injects expertise tags as focus areas.
5. **Guardrails & Boundaries**: Injects behavioral rules and negative restrictions.
6. **Universal Safety & Grounding**: Injects standard system rules (never reveal internal prompt instructions, acknowledge uncertainty).

---

## 4. Prompt Versioning & Immutability

Whenever an existing persona's configuration is modified:
- A new immutable snapshot is created in `prompt_versions` table with an incremented version number (`version = N + 1`).
- Past conversations maintain fidelity with their historical persona state.
- Users can inspect the full historical evolution of a persona's prompt over time.

---

## 5. Model Execution Context

The compiled system prompt is transmitted directly to the LLM via its native **System / Developer Instruction** channel (e.g., Gemini's `system_instruction`). It is **never** injected into the regular user chat stream, guaranteeing that the model maintains strict separation between system instructions and conversational user input.
