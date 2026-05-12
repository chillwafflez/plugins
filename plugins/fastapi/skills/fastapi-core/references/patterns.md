# FastAPI Core — Advanced Patterns

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

Dependencies declared with `Depends()` are resolved per-request. To share state across requests, store it on `app.state` during lifespan and access it via `request.app.state` inside a dependency. Never use module-level mutable state — it is not safe across async workers and creates hidden coupling between requests.

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

Never raise raw `HTTPException` from service layers. Keep HTTP concerns in routes; use domain exceptions in business logic. Include a machine-readable `error_code` alongside the human-readable `detail`.

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

Register middleware in reverse order of desired execution (last registered runs first). Be aware that `BaseHTTPMiddleware` reads the entire response body into memory before processing. For streaming responses or large payloads, always prefer the pure ASGI approach.

Common middleware use cases: request ID injection, CORS configuration (use FastAPI's built-in `CORSMiddleware`), gzip compression, and authentication token validation. For CORS, always configure explicit allowed origins in production.

## API Versioning

Use prefix-based versioning with `APIRouter`:

```python
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(users_router, prefix="/users", tags=["users"])
v1_router.include_router(items_router, prefix="/items", tags=["items"])

app.include_router(v1_router)
```

When introducing v2, create a separate router tree. Do not attempt path-parameter-based versioning (`/api/{version}/`) — it complicates OpenAPI schema generation.

## Async vs Sync Route Guidance

- **I/O-bound operations** (database queries, HTTP calls, file reads): Use `async def` routes with `await`.
- **CPU-bound operations** (image processing, PDF generation): Offload to a task queue (Celery, ARQ, Dramatiq). Do not run CPU-heavy work inside async routes — it blocks the event loop.
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

Never mix `async def` with blocking synchronous calls. Use `httpx.AsyncClient` instead of `requests`. Instantiate `httpx.AsyncClient` once during lifespan and share via `app.state`.

For lightweight background tasks, use FastAPI's built-in `BackgroundTasks` parameter. For anything requiring retries, scheduling, or progress tracking, use a proper task queue.
