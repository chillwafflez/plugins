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

Apply the following implementation details when generating each file.

### main.py — Application Factory with Lifespan

Use the `asynccontextmanager` lifespan pattern. Do NOT use the deprecated `on_event` decorator.

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import get_settings
from app.database import init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url="/docs" if settings.debug else None,
        lifespan=lifespan,
    )
    # Register routers
    # Register exception handlers
    # Add middleware
    return app

app = create_app()
```

Register all domain routers inside `create_app()`. Include the health router by default. Register custom exception handlers from `core/exceptions.py`. Add request logging middleware from `core/middleware.py`.

### database.py — Async SQLAlchemy

Use `create_async_engine` and `async_sessionmaker` from `sqlalchemy.ext.asyncio`. Expose `init_db()`, `close_db()`, and a `get_session()` async generator for dependency injection.

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
```

Configure the engine with `pool_pre_ping=True` and sensible pool size defaults. Use `AsyncSession` with `expire_on_commit=False`.

### config.py — Pydantic BaseSettings

Import from `pydantic_settings`, not `pydantic`. Use `SettingsConfigDict` for configuration:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "FastAPI App"
    version: str = "0.1.0"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/dbname"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

Provide a `get_settings()` function with `@lru_cache` for singleton behavior.

### models/base.py — SQLAlchemy Base and Mixins

Define a `TimestampMixin` class with:
- `id`: UUID primary key using `uuid4` as default
- `created_at`: datetime with `server_default=func.now()`
- `updated_at`: datetime with `onupdate=func.now()`

Create the declarative `Base` class using `DeclarativeBase` from SQLAlchemy 2.0.

### repositories/base.py — Generic Base Repository

Implement a `BaseRepository[T]` generic class with these async CRUD methods:
- `get_by_id(id)` — Fetch a single record by primary key
- `get_all(skip, limit)` — Paginated list query
- `create(obj_in)` — Insert a new record
- `update(id, obj_in)` — Partial update by primary key
- `delete(id)` — Delete by primary key

Accept `AsyncSession` via constructor injection.

### core/exceptions.py — Exception Handling

Define custom exception classes: `NotFoundError`, `ConflictError`, `ValidationError`. Provide FastAPI exception handler functions that return consistent JSON error responses with `status_code`, `detail`, and `error_code` fields.

### core/middleware.py — Request Logging

Implement a middleware that logs request method, path, status code, and duration using `structlog`. Use the `BaseHTTPMiddleware` pattern or the raw ASGI middleware approach as appropriate per Context7 results.

### core/security.py — Auth Placeholder

Generate a placeholder module with a `get_current_user` dependency stub that raises `NotImplementedError`. Include comments indicating where to add JWT validation or OAuth2 flows.

### domains/health/router.py — Health Check

Create a `/health` endpoint returning `{"status": "healthy", "version": settings.version}`. Add a `/health/ready` endpoint that also verifies database connectivity.

### tests/conftest.py — Test Fixtures

Configure async test fixtures using `pytest-asyncio`. Create an in-memory SQLite async database for tests using `aiosqlite`. Provide:
- `engine` fixture — async SQLite engine
- `session` fixture — async session bound to test engine
- `client` fixture — `httpx.AsyncClient` with `ASGITransport` pointing at the app

Override the `get_session` dependency in the app to use the test session.

### tests/test_health.py — Health Tests

Write tests for the health check endpoints. Use `@pytest.mark.anyio` or `@pytest.mark.asyncio` as appropriate. Verify status codes and response shapes.

### pyproject.toml — Dependencies

Use uv as the package manager. Include these dependencies:

**Runtime:**
- `fastapi>=0.115.0`
- `uvicorn[standard]`
- `pydantic>=2.5.0`
- `pydantic-settings>=2.1.0`
- `sqlalchemy[asyncio]>=2.0.0`
- `asyncpg`
- `alembic>=1.13.0`
- `structlog`
- `httpx`

**Dev dependencies:**
- `pytest`
- `pytest-asyncio`
- `httpx`
- `aiosqlite`
- `ruff`
- `mypy`

### alembic/env.py — Async Migrations

Configure Alembic to use async engine. Import the project `Base.metadata` for autogenerate support. Use `run_async` with `connectable.connect()` pattern for async migration execution.

### .env.example

Include all environment variables from `Settings` with placeholder values and inline comments.

### .gitignore

Include standard Python ignores: `__pycache__/`, `*.pyc`, `.venv/`, `.env`, `*.egg-info/`, `dist/`, `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/`.

### README.md

Generate a brief README with: project name, description placeholder, quickstart commands (`uv sync`, `uv run uvicorn app.main:app --reload`), and links to project structure documentation.

### Microservice-Specific Files

For microservice projects, also generate:

- **Dockerfile** per service — Multi-stage build with `python:3.12-slim`, copy `common/` and `services/{service_name}/`, install deps with uv, run with uvicorn.
- **docker-compose.yml** at root — Service definition, PostgreSQL container, network configuration, volume mounts, environment variable references.
- **Root pyproject.toml** — Workspace configuration referencing `services/` and `common/`.

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
