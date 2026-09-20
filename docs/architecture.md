# Nomi AI - System Architecture

## Overview
**Nomi AI** is a minimalist, production-grade full-stack prompt engineering application designed to make AI persona design, behavioral conditioning, prompt compilation, and automated evaluation accessible, transparent, and educational.

## Architectural Flow

```mermaid
graph TD
    subgraph Client [Frontend - React + TypeScript + Vite]
        UI[User Interface / Dashboards]
        AuthContext[Auth State / JWT Storage]
        PersonaUI[Persona Builder & Config]
        PromptUI[Prompt Inspector]
        ChatUI[Chat Interface]
        EvalUI[Persona Evaluation]
    end

    subgraph Server [Backend - FastAPI]
        AuthRouter[/api/auth]
        PersonaRouter[/api/personas]
        ChatRouter[/api/conversations]
        EvalRouter[/api/evaluations]
        
        AuthDep[Auth & Ownership Enforcement]
        Compiler[Dynamic Prompt Compiler]
        AIInterface[AI Provider Service]
        Evaluator[Automated Evaluator]
    end

    subgraph Data [Storage Layer]
        SQLite[(SQLite / PostgreSQL DB)]
    end

    subgraph External [AI Providers]
        Gemini[Google Gemini API]
    end

    UI --> AuthContext
    UI --> PersonaUI
    UI --> PromptUI
    UI --> ChatUI
    UI --> EvalUI

    PersonaUI --> PersonaRouter
    PromptUI --> PersonaRouter
    ChatUI --> ChatRouter
    EvalUI --> EvalRouter

    PersonaRouter --> AuthDep
    ChatRouter --> AuthDep
    EvalRouter --> AuthDep

    AuthDep --> SQLite
    PersonaRouter --> SQLite
    ChatRouter --> SQLite
    EvalRouter --> SQLite

    PersonaRouter --> Compiler
    Compiler --> SQLite
    ChatRouter --> Compiler
    ChatRouter --> AIInterface
    AIInterface --> Gemini
    EvalRouter --> AIInterface
```

## Core Components

1. **Frontend**:
   - Single Page Application built with React 19, TypeScript, and Vite.
   - Clean, minimalist aesthetic (no glowing borders, no distracting visual clutter).
   - Client-side routing and protected view state based on JWT authentication.
   - Real-time dynamic preview of compiled system prompts.

2. **Backend**:
   - RESTful API powered by FastAPI.
   - Strict Pydantic v2 schemas for request validation and response serialization.
   - User ownership verification (`resource.user_id == current_user.id`) enforced on all mutable resources.
   - Independent prompt compilation engine.

3. **Data Layer**:
   - Relational data model using SQLAlchemy ORM.
   - Portable across local SQLite and Supabase PostgreSQL.
   - Cascading deletes ensure orphan-free database records.

4. **AI Layer**:
   - Provider abstraction (`AIProvider`) decoupling application logic from vendor SDKs.
   - Dynamic prompt injection via Gemini's dedicated `system_instruction` parameter.
