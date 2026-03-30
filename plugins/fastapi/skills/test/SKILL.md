---
name: test
description: "This skill should be used when the user asks to \"generate tests\", \"create test stubs\", \"scaffold test fixtures\", \"add tests for an endpoint\", \"fastapi test\", \"write pytest tests\", or mentions testing, pytest, test generation, or test fixtures for a FastAPI application."
argument-hint: "stub <router_name> | fixtures"
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

# FastAPI Test Generation Skill

This skill generates pytest test suites and fixtures for FastAPI applications. It produces async test stubs derived from actual router definitions and scaffolds reusable fixtures for database sessions, HTTP clients, and authentication headers.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Perform lookups for:
- `fastapi` — `TestClient`, dependency overrides, app lifespan in tests
- `httpx` — `AsyncClient` usage with ASGI transport
- `pytest-asyncio` — `@pytest_asyncio.fixture`, `pytest.mark.asyncio` configuration
- `sqlalchemy` — async SQLite engine for test isolation

## Sub-command: `stub <router_name>`

Generate test stubs for every endpoint defined in a domain router.

### Steps

1. **Locate the router file.** Search for the router module at these paths in order:
   - `app/domains/{router_name}/router.py`
   - `app/routers/{router_name}.py`
   - `app/api/{router_name}.py`

   If the router file is not found at any location, print an error listing the paths checked and exit.

2. **Parse the router.** Read the router file and extract every endpoint definition. For each endpoint, collect:
   - HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
   - Path (e.g., `/{router_name}s/`, `/{router_name}s/{id}`)
   - Function name
   - Dependencies (look for `Depends(...)` in the signature and route decorator)
   - Request body model (if any)
   - Response model (if specified in the decorator)

3. **Create the test directory.** Ensure `tests/domains/` exists. Create `tests/__init__.py` and `tests/domains/__init__.py` if missing.

4. **Generate `tests/domains/test_{router_name}.py`.** For each endpoint, produce test functions covering:

   **Happy path:**
   - A test that calls the endpoint with valid data and asserts a successful status code (200, 201, or 204 as appropriate).
   - Assert the response body structure matches the expected schema.

   **Error cases:**
   - `test_{func}_not_found` — For endpoints that accept an ID parameter, call with a non-existent UUID and assert 404.
   - `test_{func}_validation_error` — For endpoints that accept a request body, send malformed data and assert 422.
   - `test_{func}_unauthorized` — If the endpoint has an auth dependency, call without credentials and assert 401.

   Each test function must:
   - Be an `async def` function decorated with `@pytest.mark.asyncio`.
   - Accept the `client` fixture (an `httpx.AsyncClient`).
   - Accept `auth_headers` if the endpoint requires authentication.
   - Use descriptive names: `test_{method}_{path_description}_{scenario}`.
   - Include a docstring explaining what is being tested.
   - Contain a `# TODO: Replace with actual test data` comment where fixture data is needed.

   Example structure for a POST endpoint:
   ```python
   @pytest.mark.asyncio
   async def test_create_item_success(client: AsyncClient, auth_headers: dict):
       """Create an item with valid data and receive 201."""
       payload = {
           "name": "Test Item",
           # TODO: Replace with actual test data
       }
       response = await client.post("/items/", json=payload, headers=auth_headers)
       assert response.status_code == 201
       data = response.json()
       assert "id" in data
       assert data["name"] == payload["name"]

   @pytest.mark.asyncio
   async def test_create_item_validation_error(client: AsyncClient, auth_headers: dict):
       """Send invalid payload and receive 422."""
       response = await client.post("/items/", json={}, headers=auth_headers)
       assert response.status_code == 422
   ```

5. **Handle pagination endpoints.** If a `GET` list endpoint includes `skip` and `limit` parameters, generate an additional test that verifies pagination query parameters work correctly.

6. **Print a summary** listing the generated file, the number of test functions created, and a command to run the tests: `pytest tests/domains/test_{router_name}.py -v`.

### Generated Code Conventions

- Import `httpx.AsyncClient` for the client type hint.
- Import `pytest` and use `pytest.mark.asyncio` on every async test.
- Group related tests with comments or class-based grouping (prefer top-level functions for simplicity).
- Use relative paths in endpoint calls (e.g., `/items/` not `http://localhost/items/`).
- Never import the FastAPI app directly in test files; rely on the `client` fixture from `conftest.py`.

---

## Sub-command: `fixtures`

Generate common pytest fixtures for async FastAPI testing.

### Steps

1. **Read the project layout.** Locate `app/main.py` (for the FastAPI app instance), `app/database.py` (for `get_session`), and `app/core/security.py` (for `get_current_user`). Note which components exist to determine which fixtures to generate.

2. **Create or update `tests/conftest.py`.** If the file exists, read it first and merge new fixtures without duplicating existing ones. Generate these fixtures:

   **`async_engine`** — An async SQLAlchemy engine for test isolation:
   ```python
   @pytest_asyncio.fixture(scope="session")
   async def async_engine():
       """Create an async test engine. Uses SQLite by default, override with TEST_DATABASE_URL."""
       url = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite:///")
       engine = create_async_engine(url, echo=False)
       async with engine.begin() as conn:
           await conn.run_sync(Base.metadata.create_all)
       yield engine
       async with engine.begin() as conn:
           await conn.run_sync(Base.metadata.drop_all)
       await engine.dispose()
   ```

   **`async_session`** — A session factory that rolls back after each test:
   ```python
   @pytest_asyncio.fixture
   async def async_session(async_engine):
       """Provide a transactional test session that rolls back after each test."""
       async with async_sessionmaker(
           async_engine, class_=AsyncSession, expire_on_commit=False
       )() as session:
           yield session
           await session.rollback()
   ```

   **`client`** — An `httpx.AsyncClient` wired to the FastAPI app with the database dependency overridden:
   ```python
   @pytest_asyncio.fixture
   async def client(async_session):
       """Async HTTP client with database dependency overridden."""
       async def override_get_session():
           yield async_session

       app.dependency_overrides[get_session] = override_get_session
       async with AsyncClient(
           transport=ASGITransport(app=app),
           base_url="http://testserver",
       ) as ac:
           yield ac
       app.dependency_overrides.clear()
   ```

   **`auth_headers`** (conditional) — Only generate this fixture if `app/core/security.py` exists and exports `get_current_user`:
   ```python
   @pytest_asyncio.fixture
   def auth_headers():
       """Mock authentication headers. Override get_current_user in the app."""
       mock_user = {"sub": "test-user-id", "roles": ["admin"]}
       token = create_access_token(data=mock_user)
       return {"Authorization": f"Bearer {token}"}
   ```

   If authentication is not set up, skip this fixture and add a comment explaining how to add it later.

3. **Create `tests/__init__.py`** if it does not exist.

4. **Create or update `pyproject.toml`** with test dependencies: `pytest`, `pytest-asyncio`, `httpx`, `aiosqlite`. Add a `[tool.pytest.ini_options]` section with:
   ```toml
   [tool.pytest.ini_options]
   asyncio_mode = "auto"
   testpaths = ["tests"]
   ```

5. **Create `pytest.ini` or update `pyproject.toml`** to configure `pytest-asyncio` mode. Prefer `pyproject.toml` if it already exists in the project.

6. **Print a summary** listing all created and modified files, and a command to verify the setup: `pytest --co -q` (collect-only).

### Generated Code Conventions

- Use `@pytest_asyncio.fixture` for all async fixtures (not `@pytest.fixture`).
- Use `scope="session"` for the engine fixture and default (function) scope for the session and client.
- The client fixture must override `get_session` to inject the test session, ensuring tests do not touch the real database.
- All database state is rolled back after each test for full isolation.
- Import the app instance from `app.main` — if the import path differs, adapt to the project's actual structure.

---

## General Guidelines

- **Idempotency.** Before creating or modifying any file, read its current contents. Merge new content with existing content rather than overwriting. If `conftest.py` already contains a `client` fixture, do not duplicate it.
- **Discoverability.** Place all test files under `tests/` following the same directory structure as the application. Mirror `app/domains/{name}/` with `tests/domains/test_{name}.py`.
- **Async everywhere.** All test functions and fixtures must be async. Use `pytest-asyncio` throughout.
- **No real database in CI.** The default test engine uses `sqlite+aiosqlite:///` (in-memory). Support overriding via the `TEST_DATABASE_URL` environment variable for integration tests against a real database.
- **Type safety.** Type-annotate fixture parameters and return values where practical.
- **No interactive prompts.** Parse the argument to determine the sub-command. If the argument is missing or unrecognized, print available sub-commands and exit.

## Output Checklist

After completing any sub-command, verify:

- [ ] All test files include the necessary `__init__.py` files in their directories.
- [ ] `conftest.py` fixtures do not duplicate existing fixtures.
- [ ] `pyproject.toml` includes test dependencies and pytest configuration.
- [ ] Generated test stubs cover happy path, 404, 422, and 401 scenarios where applicable.
- [ ] No test imports the database session or app directly — all access goes through fixtures.
- [ ] A brief summary with a run command is printed to the console.
