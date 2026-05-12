---
name: FastAPI Core Patterns
description: "This skill should be used when the user asks about FastAPI project structure, application factory pattern, dependency injection, middleware, exception handling, lifespan events, or mentions FastAPI patterns, async routes, APIRouter, Depends, or request lifecycle."
version: 0.1.0
---

# FastAPI Core Patterns

Before implementing any FastAPI pattern, resolve the latest FastAPI documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "fastapi" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current API references. FastAPI evolves frequently — never rely on memorized signatures or deprecated patterns.

## Application Factory Pattern with Lifespan

Structure the application using a factory function that returns a configured `FastAPI` instance. Use the `asynccontextmanager`-based lifespan to manage startup and shutdown resources.

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB pools, caches, ML models
    app.state.db_pool = await create_db_pool()
    app.state.redis = await create_redis_client()
    yield
    # Shutdown: close connections, flush buffers
    await app.state.db_pool.close()
    await app.state.redis.close()

def create_app() -> FastAPI:
    app = FastAPI(
        title="My Service",
        version="0.1.0",
        lifespan=lifespan,
    )
    _register_routers(app)
    _register_exception_handlers(app)
    _register_middleware(app)
    return app

def _register_routers(app: FastAPI) -> None:
    from app.domains.users.routes import router as users_router
    from app.domains.items.routes import router as items_router
    app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
    app.include_router(items_router, prefix="/api/v1/items", tags=["items"])
```

Never use the deprecated `@app.on_event("startup")` / `@app.on_event("shutdown")` decorators. The lifespan context manager is the only supported approach in modern FastAPI. The factory pattern provides several advantages: it enables testing with different configurations, allows multiple app instances in the same process, and centralizes all initialization in one discoverable location. Store shared resources on `app.state` rather than module-level globals to ensure proper lifecycle management and testability.

The `_register_routers`, `_register_exception_handlers`, and `_register_middleware` helper functions keep the factory clean and make each registration step independently testable. Import routers lazily inside these helpers to avoid circular imports at module load time.

## Domain-Driven Project Structure

Organize the project by business domain, not by technical layer. Each domain contains its own routes, schemas, models, service logic, and dependencies.

```
app/
├── main.py                  # create_app() factory
├── core/
│   ├── config.py            # Settings via pydantic-settings
│   ├── database.py          # Engine, session factory
│   ├── exceptions.py        # Base exception classes
│   └── dependencies.py      # Shared dependencies (get_session, get_current_user)
├── domains/
│   ├── users/
│   │   ├── __init__.py
│   │   ├── routes.py        # APIRouter endpoints
│   │   ├── schemas.py       # Pydantic models
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── service.py       # Business logic
│   │   ├── repository.py    # Data access layer
│   │   ├── dependencies.py  # Domain-specific deps
│   │   └── exceptions.py    # Domain-specific errors
│   └── items/
│       └── ...
├── middleware/
│   └── timing.py
└── tests/
    ├── conftest.py
    └── domains/
        ├── users/
        └── items/
```

Use explicit imports everywhere. Never use wildcard imports (`from module import *`). This makes dependencies traceable and avoids namespace collisions. The domain-driven structure scales well because adding a new domain means creating a new folder with the same internal structure, without touching existing code. Each domain is self-contained — its routes, schemas, models, services, and exceptions all live together. This colocation principle makes it trivial to find all code related to a business concept.

The `core/` directory holds cross-cutting concerns shared across all domains: database configuration, authentication dependencies, base exception classes, and application settings. Keep this layer thin — if a "core" module grows large, it likely belongs in its own domain.

Avoid placing a `utils.py` or `helpers.py` catch-all at the project root. These files attract unrelated code and become maintenance burdens. Instead, place utility functions in the domain that uses them, or in `core/` if truly shared across multiple domains.

## Dependency Injection, Middleware, Exceptions, and More

For detailed code examples and advanced patterns, see `references/patterns.md`. That reference covers:

- **Dependency injection** — Basic chaining, per-request caching, async vs sync, class-based dependencies (RateLimiter), scoping rules (`app.state` for cross-request state)
- **Custom exception handling** — Base `AppException` class, domain-specific errors, global handlers, machine-readable `error_code` field
- **Middleware** — `BaseHTTPMiddleware` for simple cases, pure ASGI middleware for performance-critical paths, registration order
- **API versioning** — Prefix-based versioning with `APIRouter`, separate router trees per version
- **Async vs sync route guidance** — `async def` for I/O, task queues for CPU-bound, `BackgroundTasks` for lightweight fire-and-forget

## Key Rules Summary

1. Always use the application factory pattern with `asynccontextmanager` lifespan.
2. Structure code by domain, not by layer.
3. Chain dependencies via `Depends()` — never instantiate services manually in routes.
4. Keep HTTP concerns (status codes, headers) in routes; use domain exceptions in services.
5. Prefer `async def` for all I/O; offload CPU work to task queues.
6. Use explicit imports only — no wildcards.
7. Version APIs via URL prefix (`/api/v1/`).
8. Consult Context7 for the latest FastAPI documentation before implementing any pattern.
