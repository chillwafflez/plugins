---
name: FastAPI Testing Patterns
description: "This skill provides reference patterns and best practices for testing FastAPI applications. It activates automatically when the user asks conceptual questions about testing strategies, fixture patterns, async test design, or dependency mocking — without requesting file generation. For generating test stubs or fixture files, use the /fastapi:test command instead."
version: 0.1.0
---

# FastAPI Testing Patterns

Before implementing any testing pattern, resolve the latest documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "pytest-asyncio" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current API references. Also resolve "httpx" for the latest `AsyncClient` API. Testing libraries evolve frequently — verify fixture modes and transport APIs against current docs.

## Core Test Dependencies

Install the test stack:

```
pytest
pytest-asyncio
httpx
aiosqlite          # SQLite async driver for test database
```

## pytest-asyncio Configuration

Configure async test mode in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

With `asyncio_mode = "auto"`, all `async def test_*` functions are automatically treated as async tests. No need to decorate each test with `@pytest.mark.asyncio`. This eliminates boilerplate and prevents the common mistake of forgetting the decorator on an async test, which causes it to silently pass without actually running the async code.

Add additional pytest configuration as needed:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
filterwarnings = [
    "ignore::DeprecationWarning",
]
```

## Test Database Setup

Use SQLite async in-memory for fast, isolated tests. Override the database session dependency to point tests at the in-memory database.

### conftest.py — Core Fixtures

```python
import pytest
from collections.abc import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.database import Base, get_session
from app.main import create_app


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def async_engine():
    """Create a test engine with SQLite async in-memory database."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a per-test session with automatic rollback."""
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest.fixture
async def client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an httpx AsyncClient with overridden database session."""
    app = create_app()

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield async_session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
```

Key design decisions:
- `async_engine` is session-scoped — tables are created once for the entire test session. This avoids the overhead of creating and dropping tables for every test, which significantly speeds up the test suite.
- `async_session` is function-scoped — each test gets a fresh session that rolls back after the test. The rollback ensures complete isolation between tests, so no test can pollute another's data.
- `client` overrides `get_session` so all route dependencies use the test session. This is the core dependency injection trick that makes integration testing work without a separate database server.
- `ASGITransport` connects `httpx.AsyncClient` directly to the ASGI app without starting a server. This is faster than spawning a real HTTP server and avoids port conflicts in CI environments.

The SQLite in-memory database is fast but has behavioral differences from PostgreSQL (no array types, different constraint handling, no `gen_random_uuid()`). For tests that rely on PostgreSQL-specific features, use a real PostgreSQL instance via Docker and configure the test database URL through an environment variable. The fixture structure remains the same — only the engine URL changes.

## Advanced Testing Patterns

For detailed code examples of all patterns below, see `references/examples.md`.

### Auth Fixtures
JWT auth header fixtures for `auth_headers` (viewer) and `admin_auth_headers` (admin) roles. Generate tokens with proper claims and expiry.

### Factory Fixtures
Reusable factory functions that create test entities with sensible defaults and random email generation to prevent unique constraint violations. Consider `factory_boy` for complex domains.

### Testing CRUD Operations
Cover both happy paths (201 create, 200 list/update, 204 delete) and error cases (404 not found, 422 validation, 401 unauthenticated, 403 forbidden).

### Dependency Override Pattern
Use `app.dependency_overrides[dep] = override_fn` to swap dependencies in tests. Always clear overrides after each test. For unit testing services without HTTP, instantiate directly with the test session.

### Testing Background Tasks
Mock side effects with `AsyncMock` and `monkeypatch.setattr`. Patch at the point of use, not where defined.

### Test Organization
Mirror domain structure: `tests/domains/{name}/conftest.py` for domain fixtures, `test_routes.py` for integration tests, `test_service.py` for unit tests.

## Key Rules Summary

1. Use `httpx.AsyncClient` with `ASGITransport` — never use the deprecated `TestClient` for async apps.
2. Set `asyncio_mode = "auto"` in `pyproject.toml` to avoid repetitive `@pytest.mark.asyncio` decorators.
3. Use SQLite async in-memory (`aiosqlite`) for fast, isolated test databases.
4. Scope the engine to the session, scope the session to the function with automatic rollback.
5. Override dependencies via `app.dependency_overrides` — always clear overrides after each test.
6. Test all status code paths: 200/201 (success), 404 (not found), 422 (validation), 401 (unauthenticated), 403 (forbidden).
7. Use factory fixtures to create test data with sensible defaults.
8. Consult Context7 for the latest pytest-asyncio and httpx documentation before implementing any pattern.
