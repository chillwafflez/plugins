# Testing Patterns — Code Examples

## Auth Fixtures for Protected Endpoints

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

Factory fixtures eliminate fragile hardcoded test data. Random email generation prevents unique constraint violations. For complex domains, consider `factory_boy` with async support.

Usage example:

```python
async def test_get_user(client: AsyncClient, user_factory, auth_headers):
    user = await user_factory(email="alice@example.com")
    response = await client.get(f"/api/v1/users/{user.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"
```

## Testing CRUD Operations

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

Always call `app.dependency_overrides.clear()` after each test. Using a fixture with `yield` and cleanup in teardown is the safest approach.

For unit testing service and repository layers without HTTP:

```python
async def test_user_service_get_by_email(async_session, user_factory):
    user = await user_factory(email="lookup@example.com")
    repo = UserRepository(async_session)
    service = UserService(repo)
    result = await service.get_by_email("lookup@example.com")
    assert result is not None
    assert result.id == user.id
```

## Testing Background Tasks and Side Effects

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

Use `monkeypatch` for patching within a single test. Prefer patching at the point of use (where the function is imported) rather than where it is defined.

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
