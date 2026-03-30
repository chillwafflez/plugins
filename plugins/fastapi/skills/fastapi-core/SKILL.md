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

## Dependency Injection Patterns

FastAPI's `Depends()` system is the backbone of clean architecture. Structure dependencies as composable, cacheable units.

### Basic dependency chaining

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

async def get_user_repository(
    session: AsyncSession = Depends(get_session),
) -> UserRepository:
    return UserRepository(session)

async def get_user_service(
    repo: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(repo)
```

### Dependency caching within a request

FastAPI caches dependency results per-request by default. If the same `Depends(get_session)` appears in multiple places in one request's dependency chain, only one session is created. To disable caching and force a fresh call, use `Depends(get_session, use_cache=False)`.

### Async dependencies

Prefer `async def` for dependencies that perform I/O. Sync `def` dependencies run in a thread pool, adding overhead. Reserve sync dependencies for pure computation only.

### Class-based dependencies

For dependencies that need initialization parameters, use callable classes:

```python
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host
        # Check rate limit against Redis
        if await self._is_rate_limited(client_ip):
            raise AppException(status_code=429, detail="Rate limit exceeded")
```

Use this pattern for configurable dependencies like rate limiters, permission checkers, and feature flags. The class constructor accepts configuration; the `__call__` method receives request-scoped data via `Depends()`.

### Dependency scoping rules

Understand the scoping behavior: dependencies declared with `Depends()` are resolved per-request. To share state across requests, store it on `app.state` during lifespan and access it via `request.app.state` inside a dependency. Never use module-level mutable state — it is not safe across async workers and creates hidden coupling between requests.

## Custom Exception Handling

Define a base exception per domain and register global handlers in the factory.

```python
# app/core/exceptions.py
class AppException(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str | None = None):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code

# app/domains/users/exceptions.py
class UserNotFoundError(AppException):
    def __init__(self, user_id: str):
        super().__init__(status_code=404, detail=f"User {user_id} not found", error_code="USER_NOT_FOUND")

# In create_app():
from fastapi.responses import JSONResponse
from fastapi import Request

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": exc.error_code},
    )

app.add_exception_handler(AppException, app_exception_handler)
```

Never raise raw `HTTPException` from service layers. Keep HTTP concerns in routes; use domain exceptions in business logic. This separation ensures that service layer code remains testable without importing FastAPI, and the same business logic can be reused in CLI tools, background tasks, or other interfaces.

When building the error response format, include a machine-readable `error_code` alongside the human-readable `detail`. API consumers can switch on `error_code` for programmatic handling while displaying `detail` to end users. Consider adding a `context` field for validation errors that provides field-level details.

## Middleware Patterns

### BaseHTTPMiddleware (simple cases)

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{elapsed:.4f}"
        return response
```

### Pure ASGI middleware (performance-critical)

For high-throughput paths, use pure ASGI middleware to avoid the overhead of `BaseHTTPMiddleware` (which wraps the request/response body in memory).

```python
class PureASGITimingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        start = time.perf_counter()
        await self.app(scope, receive, send)
        elapsed = time.perf_counter() - start
        # Log timing — cannot modify response headers in pure ASGI easily
```

Register middleware in reverse order of desired execution (last registered runs first). Be aware that `BaseHTTPMiddleware` has a known limitation: it reads the entire response body into memory before the middleware can process it. For streaming responses or large payloads, this causes excessive memory usage. In those cases, always prefer the pure ASGI approach.

Common middleware use cases include: request ID injection (generate a UUID per request and attach it to logs and response headers), CORS configuration (use FastAPI's built-in `CORSMiddleware`), gzip compression, and authentication token validation. For CORS, always configure explicit allowed origins in production rather than using a wildcard `*`.

## API Versioning

Use prefix-based versioning with `APIRouter`:

```python
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(users_router, prefix="/users", tags=["users"])
v1_router.include_router(items_router, prefix="/items", tags=["items"])

app.include_router(v1_router)
```

When introducing v2, create a separate router tree. Do not attempt path-parameter-based versioning (`/api/{version}/`) — it complicates OpenAPI schema generation and client codegen. Header-based versioning (`Accept: application/vnd.myapp.v2+json`) is another option but makes API exploration harder since browsers and tools like curl default to unversioned requests.

For OpenAPI documentation, generate separate docs per version by mounting sub-applications or by using tags strategically. Each version should have its own clearly labeled schema set so consumers can generate typed clients without ambiguity.

## Async vs Sync Route Guidance

Follow these rules strictly:

- **I/O-bound operations** (database queries, HTTP calls, file reads): Use `async def` routes with `await`.
- **CPU-bound operations** (image processing, PDF generation, data crunching): Offload to a task queue (Celery, ARQ, Dramatiq). Do not run CPU-heavy work inside async routes — it blocks the event loop.
- **Mixed operations**: If a route must call a synchronous blocking library, use `run_in_executor` or declare the route as `def` (FastAPI runs sync routes in a thread pool automatically).

```python
# Good: async I/O
@router.get("/users/{user_id}")
async def get_user(user_id: UUID, service: UserService = Depends(get_user_service)):
    return await service.get_by_id(user_id)

# Good: CPU-bound offloaded
@router.post("/reports")
async def generate_report(params: ReportParams, task_queue: ArqRedis = Depends(get_task_queue)):
    job = await task_queue.enqueue_job("generate_report", params.dict())
    return {"job_id": job.job_id}
```

Never mix `async def` with blocking synchronous calls (e.g., `requests.get`, `time.sleep`). Use `httpx.AsyncClient` instead of `requests`. When calling external APIs, instantiate the `httpx.AsyncClient` once during lifespan and share it via `app.state` — creating a new client per request wastes connection pool resources.

For background tasks that are lightweight and do not need a full task queue, use FastAPI's built-in `BackgroundTasks` parameter. This is suitable for fire-and-forget operations like sending notification emails or writing audit logs. For anything that requires retries, scheduling, or progress tracking, use a proper task queue.

## Key Rules Summary

1. Always use the application factory pattern with `asynccontextmanager` lifespan.
2. Structure code by domain, not by layer.
3. Chain dependencies via `Depends()` — never instantiate services manually in routes.
4. Keep HTTP concerns (status codes, headers) in routes; use domain exceptions in services.
5. Prefer `async def` for all I/O; offload CPU work to task queues.
6. Use explicit imports only — no wildcards.
7. Version APIs via URL prefix (`/api/v1/`).
8. Consult Context7 for the latest FastAPI documentation before implementing any pattern.
