---
name: config
description: "This skill should be used when the user asks to \"set up environment config\", \"add CORS\", \"configure logging\", \"create settings class\", \"fastapi config\", \"add structured logging\", or mentions configuration, CORS middleware, logging, or environment variables for a FastAPI application."
argument-hint: "env | cors | logging"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# Configure FastAPI Application

Set up environment configuration, CORS middleware, or structured logging for a FastAPI application. This skill supports three sub-commands: `env`, `cors`, and `logging`. If no argument is provided, prompt the user to choose one.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Look up documentation for:
- **FastAPI** — middleware configuration, application lifecycle
- **pydantic-settings** — BaseSettings usage, SettingsConfigDict
- **structlog** — processor chains, configuration patterns

## Sub-command: `env`

Scaffold a Pydantic BaseSettings configuration module following the zhanymkanov best-practices pattern of splitting settings by domain.

### Steps

1. **Scan the project** — Read `pyproject.toml` to confirm `pydantic-settings` is a dependency. If missing, add it.

2. **Create `app/config.py`** — Generate the settings module with:

   - A base `Settings` class using `pydantic_settings.BaseSettings` with `SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")`.
   - Domain-specific settings groups as separate classes:
     - `AppSettings` — `app_name`, `debug`, `environment` (dev/staging/production)
     - `DatabaseSettings` — `database_url`, `db_echo`, `db_pool_size`
     - `RedisSettings` (if Redis dependencies exist) — `redis_url`
     - `AuthSettings` (if auth dependencies exist) — `secret_key`, `algorithm`, `access_token_expire_minutes`
   - A combined `Settings` class that inherits from all domain classes.
   - A `get_settings()` function decorated with `@lru_cache` for singleton access.

3. **Create `.env.example`** — Generate a template with all settings keys and placeholder values. Add a comment header explaining the file's purpose. Never include real secrets.

4. **Wire into the app** — If `app/main.py` exists, add a `Settings` dependency or import so the app can access configuration at startup.

### Output Pattern

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "FastAPI App"
    debug: bool = False
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/dbname"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

## Sub-command: `cors`

Add CORS middleware to the FastAPI application.

### Steps

1. **Read `app/main.py`** — Locate the FastAPI app instance.

2. **Add CORSMiddleware** — Insert the middleware registration after the app instantiation:
   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.cors_origins,
       allow_credentials=True,
       allow_methods=settings.cors_methods,
       allow_headers=settings.cors_headers,
   )
   ```

3. **Add CORS settings** — Edit the Settings class (or create one if `env` has not been run) to include:
   - `cors_origins: list[str]` — Default: `["http://localhost:3000", "http://localhost:5173"]`
   - `cors_methods: list[str]` — Default: `["*"]`
   - `cors_headers: list[str]` — Default: `["*"]`

4. **Update `.env.example`** — Add CORS variables with sensible defaults.

### Notes

- In production, never set `allow_origins=["*"]`. The skill defaults to common local development origins.
- If the settings module does not exist, create a minimal one before adding CORS fields.

## Sub-command: `logging`

Set up structured logging with structlog for both development and production environments.

### Steps

1. **Check dependencies** — Verify `structlog` is in `pyproject.toml`. If missing, add it.

2. **Create `app/core/logging.py`** — Generate the structlog configuration module:

   - Configure processor chain: add log level, timestamp, caller info, and format (JSON in production, console/colored in development).
   - Integrate with stdlib logging so third-party libraries (uvicorn, SQLAlchemy) also produce structured output.
   - Export a `setup_logging(environment: str)` function.

   ```python
   import structlog

   def setup_logging(environment: str = "development") -> None:
       shared_processors = [
           structlog.contextvars.merge_contextvars,
           structlog.stdlib.add_log_level,
           structlog.stdlib.add_logger_name,
           structlog.processors.TimeStamper(fmt="iso"),
           structlog.processors.StackInfoRenderer(),
       ]

       if environment == "production":
           renderer = structlog.processors.JSONRenderer()
       else:
           renderer = structlog.dev.ConsoleRenderer()

       structlog.configure(
           processors=[*shared_processors, renderer],
           wrapper_class=structlog.stdlib.BoundLogger,
           logger_factory=structlog.stdlib.LoggerFactory(),
           cache_logger_on_first_use=True,
       )
   ```

3. **Create `app/core/middleware.py`** — Generate a `RequestLoggingMiddleware` that logs each request:

   - Capture: HTTP method, path, status code, duration in milliseconds.
   - Skip health-check endpoints (`/health`, `/readyz`) to reduce noise.
   - Use `structlog.get_logger()` for all log calls.

   ```python
   import time
   import structlog
   from starlette.middleware.base import BaseHTTPMiddleware
   from starlette.requests import Request

   logger = structlog.get_logger()

   class RequestLoggingMiddleware(BaseHTTPMiddleware):
       async def dispatch(self, request: Request, call_next):
           if request.url.path in ("/health", "/readyz"):
               return await call_next(request)

           start = time.perf_counter()
           response = await call_next(request)
           duration_ms = round((time.perf_counter() - start) * 1000, 2)

           logger.info(
               "request_completed",
               method=request.method,
               path=request.url.path,
               status_code=response.status_code,
               duration_ms=duration_ms,
           )
           return response
   ```

4. **Wire into the app** — Edit `app/main.py` to call `setup_logging()` at startup and register `RequestLoggingMiddleware`.

### Post-Generation Summary

After completing any sub-command, list all files created or modified and note any manual steps required (such as creating a `.env` file from `.env.example`).
