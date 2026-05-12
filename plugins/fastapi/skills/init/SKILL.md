---
name: init
description: "This skill should be used when the user asks to \"create a new FastAPI project\", \"scaffold a FastAPI app\", \"initialize a FastAPI project\", \"start a new API project\", \"fastapi init\", \"bootstrap FastAPI\", or mentions setting up a new FastAPI application from scratch. Generates a complete project structure with best practices."
argument-hint: "monolith | microservice"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# Initialize FastAPI Project

Scaffold a production-ready FastAPI project with async SQLAlchemy, Alembic migrations, structured configuration, and comprehensive testing infrastructure. Support two project archetypes: **monolith** (default) and **microservice**.

## Step 1: Gather Requirements

Prompt the user for the following before generating any files:

- **Project name** — Used for the root directory and `pyproject.toml` metadata. Default to a slugified version of the user's description if provided.
- **Project type** — `monolith` (default) or `microservice`. If the argument is provided, use it directly.
- **Service name** — Required only for microservice type. Ask for the first service name (e.g., `users`, `orders`).
- **Python version** — Default to `3.12` unless specified otherwise.
- **Database** — Default to PostgreSQL with asyncpg. Note alternatives if requested.

If the user provides a clear, complete description, proceed without redundant questions.

## Step 2: Query Context7 for Current Documentation

Before generating any code, fetch up-to-date API references from Context7. This step is mandatory -- do not skip it even if the patterns seem familiar.

### Required lookups

1. Call `resolve-library-id` for each of these libraries:
   - `FastAPI`
   - `SQLAlchemy`

2. Call `query-docs` with targeted queries for the specific patterns needed:
   - `"FastAPI application factory lifespan async"` — for `main.py` lifespan and app factory
   - `"SQLAlchemy async engine session setup"` — for `database.py` async session configuration

### Conditional lookups (query as the generated code requires them)

- **Pydantic**: `"Pydantic BaseSettings v2 model_config"` — for `config.py` settings pattern
- **Alembic**: `"Alembic async migration environment"` — for `alembic/env.py` async setup
- **Uvicorn**: `"Uvicorn programmatic server configuration"` — for run configuration

Use the returned documentation to ensure all generated code follows current API patterns. If Context7 returns different signatures or patterns than what is described below, prefer the Context7 results.

## Step 3: Create Project Structure

### Monolith (default)

Generate the following directory tree. Replace `{project_name}` with the user-provided name:

```
{project_name}/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application factory with lifespan
│   ├── config.py               # Pydantic BaseSettings (modular per-domain)
│   ├── database.py             # SQLAlchemy async engine + session
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py         # Auth utilities (placeholder)
│   │   ├── exceptions.py       # Custom exception classes + handlers
│   │   └── middleware.py       # Request logging middleware
│   ├── domains/
│   │   └── health/
│   │       ├── __init__.py
│   │       ├── router.py       # Health check endpoint
│   │       └── schemas.py      # Health response schemas
│   ├── models/
│   │   ├── __init__.py
│   │   └── base.py             # SQLAlchemy Base + mixins (id, created_at, updated_at)
│   └── repositories/
│       ├── __init__.py
│       └── base.py             # Generic base repository
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Async fixtures, SQLite in-memory test DB
│   └── test_health.py          # Health endpoint tests
├── alembic/
│   ├── env.py                  # Async Alembic env
│   ├── script.py.mako
│   └── versions/               # Empty directory for migration files
├── alembic.ini
├── pyproject.toml              # uv-managed, all deps
├── .env.example
├── .gitignore
└── README.md
```

### Microservice

Generate a workspace layout with a shared `common/` library and per-service directories:

```
{project_name}/
├── services/
│   └── {service_name}/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   ├── security.py
│       │   │   ├── exceptions.py
│       │   │   └── middleware.py
│       │   ├── domains/
│       │   │   └── health/
│       │   │       ├── __init__.py
│       │   │       ├── router.py
│       │   │       └── schemas.py
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   └── base.py
│       │   └── repositories/
│       │       ├── __init__.py
│       │       └── base.py
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── conftest.py
│       │   └── test_health.py
│       ├── alembic/
│       │   ├── env.py
│       │   ├── script.py.mako
│       │   └── versions/
│       ├── alembic.ini
│       ├── Dockerfile
│       └── pyproject.toml
├── common/
│   ├── __init__.py
│   ├── models.py               # Shared base models
│   ├── schemas.py              # Shared schemas
│   ├── security.py             # Shared auth utilities
│   └── exceptions.py           # Shared exception definitions
├── docker-compose.yml
├── pyproject.toml              # Workspace root
└── README.md
```

## Step 4: Generate All Files

Generate all files following the detailed implementation specifications in `references/file-specs.md`. That reference covers every file listed below with exact patterns, code examples, and configuration details.

### Files to generate

- **`main.py`** — Application factory with `asynccontextmanager` lifespan (NOT deprecated `on_event`)
- **`database.py`** — Async SQLAlchemy engine + session with `expire_on_commit=False`
- **`config.py`** — Pydantic `BaseSettings` from `pydantic_settings` with `@lru_cache`
- **`models/base.py`** — `DeclarativeBase` + `TimestampMixin` (id, created_at, updated_at)
- **`repositories/base.py`** — Generic `BaseRepository[T]` with async CRUD methods
- **`core/exceptions.py`** — Custom exception classes + FastAPI handlers
- **`core/middleware.py`** — Request logging middleware with structlog
- **`core/security.py`** — Auth placeholder with `get_current_user` stub
- **`domains/health/router.py`** — `/health` and `/health/ready` endpoints
- **`tests/conftest.py`** — Async fixtures: engine, session, httpx client
- **`tests/test_health.py`** — Health endpoint tests
- **`pyproject.toml`** — uv-managed dependencies (FastAPI, SQLAlchemy, Alembic, etc.)
- **`alembic/env.py`** — Async migration environment
- **`.env.example`**, **`.gitignore`**, **`README.md`**

For microservice projects, additionally generate Dockerfile per service, docker-compose.yml, and root pyproject.toml. See `references/file-specs.md` for details.

## Step 5: Initialize Project Tooling

After writing all files, execute the following commands:

1. Run `uv sync` inside the project root to install dependencies and create the virtual environment. If `uv` is not available, fall back to creating `pyproject.toml` only and note that the user must install uv.
2. Initialize a git repository with `git init` and create an initial commit.
3. Verify the project structure is correct by listing the generated directory tree.

## Step 6: Present Post-Scaffold Checklist

After all files are generated and tooling is initialized, print the following checklist for the user:

```
Project "{project_name}" has been scaffolded.

Next steps:
[ ] Copy .env.example to .env and fill in real values
[ ] Update database_url in .env to point to a real PostgreSQL instance
[ ] Run `uv sync` to install dependencies (if not already done)
[ ] Run `uv run alembic upgrade head` to apply migrations
[ ] Run `uv run uvicorn app.main:app --reload` to start the dev server
[ ] Run `uv run pytest` to verify tests pass
[ ] Review core/security.py and implement authentication
[ ] Add domain modules under app/domains/ as needed
[ ] Configure CI/CD pipeline for linting (ruff) and testing (pytest)
```

For microservice projects, append:

```
[ ] Build service containers: docker compose build
[ ] Start all services: docker compose up -d
[ ] Add new services by copying the service template directory
```
