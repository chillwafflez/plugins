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

## Auth Fixtures for Protected Endpoints

Create fixtures that provide authentication headers for testing protected routes.

```python
from datetime import datetime, timedelta, timezone
import jwt

from app.core.config import get_settings

settings = get_settings()


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Generate JWT auth headers for a standard test user."""
    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "testuser@example.com",
        "role": "viewer",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token = jwt.encode(payload, settings.auth.secret_key, algorithm=settings.auth.algorithm)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers() -> dict[str, str]:
    """Generate JWT auth headers for an admin test user."""
    payload = {
        "sub": "00000000-0000-0000-0000-000000000002",
        "email": "admin@example.com",
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token = jwt.encode(payload, settings.auth.secret_key, algorithm=settings.auth.algorithm)
    return {"Authorization": f"Bearer {token}"}
```

## Factory Fixtures for Test Data

Create reusable factories to generate test entities with sensible defaults.

```python
import uuid
from app.domains.users.models import User


@pytest.fixture
def user_factory(async_session: AsyncSession):
    """Factory fixture to create User instances in the test database."""
    async def _create_user(
        email: str | None = None,
        display_name: str = "Test User",
        is_active: bool = True,
    ) -> User:
        user = User(
            id=uuid.uuid4(),
            email=email or f"user-{uuid.uuid4().hex[:8]}@example.com",
            display_name=display_name,
            hashed_password="hashed_fake_password",
            is_active=is_active,
        )
        async_session.add(user)
        await async_session.flush()
        await async_session.refresh(user)
        return user

    return _create_user
```

Factory fixtures eliminate the fragility of hardcoded test data and make tests self-documenting — each test creates exactly the data it needs with explicit parameters, and uses sensible defaults for everything else. The random email generation (`user-{uuid}@example.com`) prevents unique constraint violations when multiple tests create users in the same session.

For complex domains with many related entities, consider using a library like `factory_boy` with its async support, or build a hierarchy of factory fixtures where one factory calls another (e.g., `post_factory` internally calls `user_factory` to create an author).

Use factory fixtures in tests to create only the data needed for each scenario:

```python
async def test_get_user(client: AsyncClient, user_factory, auth_headers):
    user = await user_factory(email="alice@example.com")
    response = await client.get(f"/api/v1/users/{user.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"
```

## Testing CRUD Operations

Structure tests to cover both happy paths and error cases.

### Happy path tests

```python
async def test_create_user(client: AsyncClient, auth_headers):
    payload = {
        "email": "new@example.com",
        "display_name": "New User",
        "password": "securepassword123",
    }
    response = await client.post("/api/v1/users", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert "id" in data
    assert "password" not in data  # Sensitive field excluded


async def test_list_users(client: AsyncClient, user_factory, auth_headers):
    await user_factory()
    await user_factory()
    response = await client.get("/api/v1/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()["items"]) >= 2


async def test_update_user(client: AsyncClient, user_factory, auth_headers):
    user = await user_factory()
    response = await client.patch(
        f"/api/v1/users/{user.id}",
        json={"display_name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


async def test_delete_user(client: AsyncClient, user_factory, admin_auth_headers):
    user = await user_factory()
    response = await client.delete(f"/api/v1/users/{user.id}", headers=admin_auth_headers)
    assert response.status_code == 204
```

### Error case tests

```python
async def test_get_nonexistent_user_returns_404(client: AsyncClient, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000099"
    response = await client.get(f"/api/v1/users/{fake_id}", headers=auth_headers)
    assert response.status_code == 404


async def test_create_user_invalid_email_returns_422(client: AsyncClient, auth_headers):
    payload = {"email": "not-an-email", "display_name": "X", "password": "pass1234"}
    response = await client.post("/api/v1/users", json=payload, headers=auth_headers)
    assert response.status_code == 422


async def test_unauthenticated_request_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/users")
    assert response.status_code == 401


async def test_viewer_cannot_delete_returns_403(client: AsyncClient, user_factory, auth_headers):
    user = await user_factory()
    response = await client.delete(f"/api/v1/users/{user.id}", headers=auth_headers)
    assert response.status_code == 403
```

## Dependency Override Pattern

Override any FastAPI dependency for testing using `app.dependency_overrides`.

```python
from app.core.dependencies import get_current_user

async def test_with_custom_user(async_session):
    app = create_app()

    fake_user = User(id=uuid.uuid4(), email="fake@test.com", role="admin")

    async def override_get_current_user():
        return fake_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/admin/dashboard")
        assert response.status_code == 200

    app.dependency_overrides.clear()
```

Always call `app.dependency_overrides.clear()` after each test (or in a fixture teardown) to prevent state leakage between tests. The dependency override mechanism is powerful but fragile — if one test overrides a dependency and fails to clean up, every subsequent test in the session sees the override. Using a fixture with `yield` and cleanup in the teardown phase (as shown in the `client` fixture above) is the safest approach.

For unit testing service and repository layers without HTTP, instantiate the class directly with the test session:

```python
async def test_user_service_get_by_email(async_session, user_factory):
    user = await user_factory(email="lookup@example.com")
    repo = UserRepository(async_session)
    service = UserService(repo)
    result = await service.get_by_email("lookup@example.com")
    assert result is not None
    assert result.id == user.id
```

This approach tests business logic in isolation from HTTP routing, making tests faster and easier to debug when they fail.

## Testing Background Tasks and Side Effects

For routes that trigger background tasks or side effects (sending emails, publishing events), mock those dependencies in tests to verify they were called without actually performing the operation.

```python
from unittest.mock import AsyncMock

async def test_create_user_sends_welcome_email(client, monkeypatch):
    mock_send = AsyncMock()
    monkeypatch.setattr("app.domains.users.service.send_welcome_email", mock_send)

    payload = {"email": "new@example.com", "display_name": "New", "password": "pass12345678"}
    response = await client.post("/api/v1/users", json=payload, headers=auth_headers)
    assert response.status_code == 201
    mock_send.assert_called_once_with("new@example.com")
```

Use `monkeypatch` for patching within a single test and `unittest.mock.patch` for broader mocking scenarios. Prefer patching at the point of use (where the function is imported) rather than where it is defined.

## Test Organization

```
tests/
├── conftest.py                  # Shared fixtures (engine, session, client, auth)
├── domains/
│   ├── users/
│   │   ├── conftest.py          # User-specific fixtures (user_factory)
│   │   ├── test_routes.py       # Endpoint integration tests
│   │   └── test_service.py      # Unit tests for UserService
│   └── items/
│       ├── conftest.py
│       ├── test_routes.py
│       └── test_service.py
└── core/
    └── test_dependencies.py     # Tests for shared dependencies
```

## Key Rules Summary

1. Use `httpx.AsyncClient` with `ASGITransport` — never use the deprecated `TestClient` for async apps.
2. Set `asyncio_mode = "auto"` in `pyproject.toml` to avoid repetitive `@pytest.mark.asyncio` decorators.
3. Use SQLite async in-memory (`aiosqlite`) for fast, isolated test databases.
4. Scope the engine to the session, scope the session to the function with automatic rollback.
5. Override dependencies via `app.dependency_overrides` — always clear overrides after each test.
6. Test all status code paths: 200/201 (success), 404 (not found), 422 (validation), 401 (unauthenticated), 403 (forbidden).
7. Use factory fixtures to create test data with sensible defaults.
8. Consult Context7 for the latest pytest-asyncio and httpx documentation before implementing any pattern.
