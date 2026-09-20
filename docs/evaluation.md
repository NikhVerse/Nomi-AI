# Nomi AI - Persona Evaluation Methodology

## 1. Goal
The evaluation suite provides an objective, transparent framework to verify whether an AI persona actually adheres to its configured behavioral constraints, tone, and guardrails.

---

## 2. Evaluation Criteria (5-Point Scale)

Every test prompt is scored across five core dimensions on a 1.0 to 5.0 scale:

1. **Instruction Adherence (1 - 5)**:
   - Evaluates whether the persona respected positive behavioral rules and negative restrictions.
   - Example check: Did it avoid hallucinating or revealing prompt instructions if restricted?

2. **Persona Consistency (1 - 5)**:
   - Measures whether the persona's character, role perspective, and expertise were maintained consistently without slipping out of character.

3. **Tone Consistency (1 - 5)**:
   - Assesses whether the requested tone (e.g. Concise, Academic, Friendly, Technical) is maintained.

4. **Relevance (1 - 5)**:
   - Checks if the user's prompt was directly and meaningfully addressed without irrelevant tangents.

5. **Preference Compliance (1 - 5)**:
   - Verifies formatting preferences (e.g., bullet points, inclusion of concrete examples, conciseness).

---

## 3. Scoring Methodology & Transparency

- **AI-Assisted Judge**: The response is evaluated using an LLM-as-a-judge rubric evaluating each of the 5 criteria against the compiled system prompt.
- **Transparent Output**: Both quantitative ratings (1.0 - 5.0) and qualitative critique ("Feedback") are saved in the database and displayed clearly in the Evaluation view.
- **No Mystery Metrics**: No arbitrary black-box scores are displayed without clear textual rationale.
