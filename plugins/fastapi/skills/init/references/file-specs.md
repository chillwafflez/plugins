# Init — File Generation Specifications

Apply the following implementation details when generating each file.

## main.py — Application Factory with Lifespan

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

## database.py — Async SQLAlchemy

Use `create_async_engine` and `async_sessionmaker` from `sqlalchemy.ext.asyncio`. Expose `init_db()`, `close_db()`, and a `get_session()` async generator for dependency injection.

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
```

Configure the engine with `pool_pre_ping=True` and sensible pool size defaults. Use `AsyncSession` with `expire_on_commit=False`.

## config.py — Pydantic BaseSettings

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

## models/base.py — SQLAlchemy Base and Mixins

Define a `TimestampMixin` class with:
- `id`: UUID primary key using `uuid4` as default
- `created_at`: datetime with `server_default=func.now()`
- `updated_at`: datetime with `onupdate=func.now()`

Create the declarative `Base` class using `DeclarativeBase` from SQLAlchemy 2.0.

## repositories/base.py — Generic Base Repository

Implement a `BaseRepository[T]` generic class with these async CRUD methods:
- `get_by_id(id)` — Fetch a single record by primary key
- `get_all(skip, limit)` — Paginated list query
- `create(obj_in)` — Insert a new record
- `update(id, obj_in)` — Partial update by primary key
- `delete(id)` — Delete by primary key

Accept `AsyncSession` via constructor injection.

## core/exceptions.py — Exception Handling

Define custom exception classes: `NotFoundError`, `ConflictError`, `ValidationError`. Provide FastAPI exception handler functions that return consistent JSON error responses with `status_code`, `detail`, and `error_code` fields.

## core/middleware.py — Request Logging

Implement a middleware that logs request method, path, status code, and duration using `structlog`. Use the `BaseHTTPMiddleware` pattern or the raw ASGI middleware approach as appropriate per Context7 results.

## core/security.py — Auth Placeholder

Generate a placeholder module with a `get_current_user` dependency stub that raises `NotImplementedError`. Include comments indicating where to add JWT validation or OAuth2 flows.

## domains/health/router.py — Health Check

Create a `/health` endpoint returning `{"status": "healthy", "version": settings.version}`. Add a `/health/ready` endpoint that also verifies database connectivity.

## tests/conftest.py — Test Fixtures

Configure async test fixtures using `pytest-asyncio`. Create an in-memory SQLite async database for tests using `aiosqlite`. Provide:
- `engine` fixture — async SQLite engine
- `session` fixture — async session bound to test engine
- `client` fixture — `httpx.AsyncClient` with `ASGITransport` pointing at the app

Override the `get_session` dependency in the app to use the test session.

## tests/test_health.py — Health Tests

Write tests for the health check endpoints. Use `@pytest.mark.anyio` or `@pytest.mark.asyncio` as appropriate. Verify status codes and response shapes.

## pyproject.toml — Dependencies

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

## alembic/env.py — Async Migrations

Configure Alembic to use async engine. Import the project `Base.metadata` for autogenerate support. Use `run_async` with `connectable.connect()` pattern for async migration execution.

## .env.example

Include all environment variables from `Settings` with placeholder values and inline comments.

## .gitignore

Include standard Python ignores: `__pycache__/`, `*.pyc`, `.venv/`, `.env`, `*.egg-info/`, `dist/`, `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/`.

## README.md

Generate a brief README with: project name, description placeholder, quickstart commands (`uv sync`, `uv run uvicorn app.main:app --reload`), and links to project structure documentation.

## Microservice-Specific Files

For microservice projects, also generate:

- **Dockerfile** per service — Multi-stage build with `python:3.12-slim`, copy `common/` and `services/{service_name}/`, install deps with uv, run with uvicorn.
- **docker-compose.yml** at root — Service definition, PostgreSQL container, network configuration, volume mounts, environment variable references.
- **Root pyproject.toml** — Workspace configuration referencing `services/` and `common/`.
