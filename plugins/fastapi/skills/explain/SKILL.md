---
name: explain
description: "This skill should be used when the user asks to \"explain this endpoint\", \"break down this route\", \"what does this endpoint do\", \"explain the code\", \"fastapi explain\", \"walk me through this\", or mentions understanding, explaining, or breaking down FastAPI code, endpoints, or application structure."
argument-hint: "<file_path_or_endpoint>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# Explain FastAPI Code

Read and explain FastAPI application code in educational detail. This skill targets learners and focuses on the **why** behind each pattern, not just the what. It breaks down endpoints, middleware, dependencies, and project structure into clear, approachable explanations.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Use Context7 to look up FastAPI documentation for any patterns encountered during the explanation — dependency injection, response models, middleware, background tasks, WebSockets, etc. Reference the official docs in the explanation so the user knows where to learn more.

## Workflow

### 1. Determine What to Explain

Parse the user's argument to decide the scope:

- **File path provided** (e.g., `app/routers/users.py`) — Read that file and explain its contents.
- **Endpoint reference provided** (e.g., `GET /users/{id}` or `/users`) — Search the codebase for the matching route handler using Grep, then read and explain it.
- **No argument provided** — Explain the overall project structure. Scan the project directory tree, identify the major components (routers, models, schemas, services, middleware, config), and describe how they fit together.

### 2. Read the Code

Use the Read tool to load the target file(s). If explaining a single endpoint, also read:

- The router file containing the endpoint.
- Any dependency functions referenced via `Depends()`.
- Pydantic schemas used as request bodies or response models.
- Service or repository modules called by the endpoint.

Gather enough context to give a complete explanation without leaving gaps.

### 3. Break Down the Components

Structure the explanation around these areas (include only what is relevant to the code being explained):

**Route Decorator**
- Explain the HTTP method and path.
- Describe path parameters and their type annotations.
- Explain `response_model`, `status_code`, `tags`, `summary`, and `description` if present.
- Note any `dependencies` parameter on the router or route level.

**Function Signature**
- Explain each parameter and how FastAPI resolves it:
  - Path parameters — matched from the URL.
  - Query parameters — default-valued function arguments.
  - Request body — Pydantic model type hints.
  - Dependencies — `Depends()` calls and what they inject.
  - Headers, cookies, forms — special parameter types.
- Clarify async vs sync handler implications.

**Dependency Injection**
- Trace each `Depends()` call to its source function.
- Explain the dependency chain (dependencies that depend on other dependencies).
- Describe `yield` dependencies and their cleanup behavior.
- Note reusable dependencies vs request-scoped ones.

**Request Handling**
- Walk through the function body step by step.
- Explain database queries, service calls, or business logic.
- Highlight error handling patterns (`HTTPException`, custom exception handlers).
- Note any background tasks registered via `BackgroundTasks`.

**Response Model**
- Explain the `response_model` Pydantic schema and field-level details.
- Describe response serialization and field exclusion patterns.
- Note multiple response types if `responses` parameter is used.

**Middleware and Hooks**
- If the file contains middleware, explain the request/response cycle.
- Describe event handlers (`on_startup`, `on_shutdown`, `lifespan`) if present.

### 4. Explain the Why

For each pattern encountered, explain **why** it is used, not just what it does:

- Why use `Depends()` instead of direct function calls? (testability, separation of concerns, automatic cleanup)
- Why use `response_model` instead of returning dicts? (validation, documentation, field filtering)
- Why use async handlers? (concurrency for I/O-bound operations)
- Why separate routers from the main app? (modularity, team collaboration, route grouping)
- Why use Pydantic schemas for request/response? (validation, serialization, auto-generated docs)
- Why use `status_code=201` explicitly? (API clarity, correct HTTP semantics)

Ground the explanations in practical benefits, not abstract principles.

### 5. Provide Learning Pointers

End every explanation with a **"What to Explore Next"** section that suggests 2-4 related topics the user might want to learn about. Tailor the suggestions to the complexity of the code being explained:

- For simple CRUD endpoints: suggest middleware, error handling, testing.
- For endpoints with complex DI: suggest yield dependencies, sub-dependencies, overrides for testing.
- For WebSocket endpoints: suggest connection managers, broadcasting patterns, authentication.
- For middleware: suggest ASGI lifespan events, custom exception handlers, CORS configuration.

Include links to the relevant FastAPI documentation sections (use the URLs from Context7 if available).

### 6. Project Structure Explanation (No-Argument Case)

When no specific file or endpoint is provided, deliver a high-level project walkthrough:

1. **Scan the directory tree** — Use Glob to map out the project layout.
2. **Identify the entry point** — Find `app/main.py` or equivalent and explain how the app is initialized.
3. **Map the components** — For each major directory or module, explain its role:
   - `routers/` — API route definitions
   - `models/` — Database models (SQLAlchemy, Beanie, etc.)
   - `schemas/` — Pydantic request/response schemas
   - `services/` or `crud/` — Business logic layer
   - `core/` — Configuration, security, middleware
   - `dependencies/` — Shared dependency injection functions
   - `tests/` — Test suite structure
4. **Describe the request flow** — Trace a typical request from entry to response, showing how it moves through middleware, dependencies, route handler, service layer, and back.
5. **Note patterns in use** — Identify architectural patterns (repository pattern, service layer, factory pattern) and explain the benefits.
