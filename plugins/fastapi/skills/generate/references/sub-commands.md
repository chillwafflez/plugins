# Generate Sub-Commands — Detailed Specifications

## `domain <name>` — Full Domain Scaffolding

Create the following directory structure under `app/domains/{name}/`:

- **`__init__.py`** — Empty init file to make the directory a Python package.

- **`router.py`** — FastAPI APIRouter with five CRUD endpoints:
  - `GET /` — List all resources with pagination (`skip`, `limit` query params). Return `list[{Name}Response]`.
  - `GET /{id}` — Get a single resource by UUID. Return `{Name}Response`. Raise 404 if not found.
  - `POST /` — Create a new resource. Accept `{Name}Create` body. Return `{Name}Response` with status 201.
  - `PUT /{id}` — Full update of a resource. Accept `{Name}Update` body. Return `{Name}Response`. Raise 404 if not found.
  - `DELETE /{id}` — Delete a resource by UUID. Return status 204 with no content. Raise 404 if not found.
  - All endpoints must be `async def`.
  - Inject the service layer via `Depends()`.
  - Apply appropriate `response_model`, `status_code`, and `summary` to each route.

- **`schemas.py`** — Pydantic v2 schemas (see `schema` sub-command below for full specification).

- **`models.py`** — SQLAlchemy 2.0 model (see `model` sub-command below for full specification).

- **`service.py`** — Business logic layer:
  - Define a `{Name}Service` class that accepts the repository as a constructor argument.
  - Implement `list`, `get_by_id`, `create`, `update`, and `delete` methods.
  - All methods must be `async def`.
  - Raise domain-specific exceptions (e.g., `{Name}NotFoundError`) instead of returning None.
  - Keep business rules here, never in the router or repository.

- **`dependencies.py`** — Dependency injection functions:
  - `get_{name}_repository` — Return an instance of the repository, injecting the database session.
  - `get_{name}_service` — Return an instance of the service, injecting the repository via `Depends()`.

Create the repository file at `app/repositories/{name}_repository.py`:

- Define `{Name}Repository` extending `BaseRepository` if one exists in the project, otherwise define a standalone repository class.
- Implement `get_all`, `get_by_id`, `create`, `update`, and `delete` methods.
- Use SQLAlchemy 2.0 `select()` statement style, not legacy `Query` API.
- All methods must be `async def` using `AsyncSession`.

Create the test file at `tests/domains/test_{name}.py`:

- Use `pytest` with `pytest-asyncio`.
- Include fixtures for the async client, mock service, and sample data.
- Test each CRUD endpoint: successful operations, 404 responses, and validation errors.
- Use `httpx.AsyncClient` with `ASGITransport` for async test client.

After creating all files, auto-register the router in `app/main.py` (see Auto-Registration section in SKILL.md).

## `router <name>` — Single Router File

Generate only the router file at `app/domains/{name}/router.py`.

- Create `app/domains/{name}/` directory and `__init__.py` if they do not exist.
- Define an `APIRouter` with `prefix="/{name}"` and `tags=["{Name}"]`.
- Include five CRUD endpoint stubs (GET list, GET by id, POST, PUT, DELETE).
- Mark each endpoint as `async def`.
- Include TODO comments indicating where to inject the service layer.
- Apply `response_model`, `status_code`, and `summary` to each route decorator.
- Auto-register the router in `app/main.py` (see Auto-Registration section in SKILL.md).

## `model <name>` — SQLAlchemy Model

Generate a SQLAlchemy 2.0 model file.

### File Location

- If the project uses domain-driven structure: `app/domains/{name}/models.py`
- If the project uses flat structure (detected by presence of `app/models/` directory): `app/models/{name}.py`
- Scan existing project files to determine which pattern is in use. Default to domain-driven if ambiguous.

### Specification

- Use SQLAlchemy 2.0 declarative style with `MappedAsDataclass` or `DeclarativeBase` depending on what the project already uses.
- Extend `TimestampMixin` if found in the codebase (search for it in `app/core/`, `app/models/`, or `app/db/`). If not found, define `created_at` and `updated_at` columns inline.
- Always include these columns:
  - `id`: UUID primary key, server-default using `uuid4` or `gen_random_uuid()`.
  - `created_at`: DateTime with timezone, server-default to `func.now()`.
  - `updated_at`: DateTime with timezone, server-default to `func.now()`, onupdate to `func.now()`.
- Use `mapped_column()` for all column definitions, not the legacy `Column()`.
- Set `__tablename__` to the plural snake_case form of the name.
- If the user provides field specifications (as `name:type` pairs), add those columns. Otherwise, ask the user for the fields, or infer from surrounding context if available (e.g., an existing schema file for the same domain).
- Add type hints to every attribute using `Mapped[type]`.
- Include a `__repr__` method.

## `schema <name>` — Pydantic Schemas

### File Location

- Domain-driven: `app/domains/{name}/schemas.py`
- Flat: `app/schemas/{name}.py`

### Classes Generated

- **`{Name}Base`** — Shared fields used across create and update schemas. Use `Field()` with constraints (e.g., `min_length`, `max_length`, `ge`, `le`) where appropriate.

- **`{Name}Create({Name}Base)`** — Fields required to create a resource. Inherit from Base and add any creation-specific fields.

- **`{Name}Update`** — All fields from Base but wrapped in `Optional[...]`. Do NOT inherit from Base; redefine each field as optional so partial updates work correctly. Set `default=None` on every field.

- **`{Name}Response({Name}Base)`** — Fields returned to the client. Include `id` (UUID), `created_at` (datetime), `updated_at` (datetime). Configure with:
  ```python
  model_config = ConfigDict(from_attributes=True)
  ```

- All schemas must use Pydantic v2 syntax. Never use the Pydantic v1 `class Config` pattern. Always use `model_config = ConfigDict(...)`.
- Import `ConfigDict` from `pydantic`.
- Add docstrings to each schema class.

## `endpoint <method> <path>` — Single Endpoint

1. Parse the HTTP method (GET, POST, PUT, PATCH, DELETE) and path from arguments.
2. Locate the relevant router file by inspecting the path prefix or by asking the user.
3. Read the existing router file.
4. Determine the correct insertion point (after the last existing endpoint).
5. Generate the endpoint function with:
   - The correct decorator (`@router.get`, `@router.post`, etc.)
   - Appropriate status code: GET=200, POST=201, PUT=200, PATCH=200, DELETE=204.
   - A `response_model` parameter if applicable (not for 204 responses).
   - Dependency injection for service or session as needed.
   - Proper path parameter types with `Path()` and query parameter types with `Query()`.
   - `async def` function body with a TODO comment for implementation.
   - A `summary` string in the decorator.
6. Use the Edit tool to insert the endpoint into the existing file. Do not overwrite the file.

## `dependency <name>` — Reusable Dependency

### File Location

- Domain-driven: `app/domains/{name}/dependencies.py`
- Flat: `app/dependencies/{name}.py`

### Specification

- Generate an `async def` function by default. Include a sync alternative only if the user explicitly requests it.
- Include proper type hints for parameters and return type.
- Add a docstring explaining what the dependency provides.
- If the dependency requires database access, inject `AsyncSession` via `Depends(get_session)` or whatever session dependency exists in the project.
- If the dependency is for authentication or authorization, follow the `OAuth2PasswordBearer` pattern and include token validation logic.
- Provide a usage example as a comment at the top of the file showing how to inject it in a route.

## `middleware <name>` — Custom Middleware

### File Location

- `app/core/middleware/{name}.py`
- Create the `app/core/middleware/` directory if it does not exist.

### Specification

- Use the Starlette `BaseHTTPMiddleware` pattern:
  ```python
  from starlette.middleware.base import BaseHTTPMiddleware
  from starlette.requests import Request
  from starlette.responses import Response
  ```
- Implement the `async def dispatch(self, request: Request, call_next)` method.
- Include pre-request and post-response hook points with descriptive comments.
- Add logging using Python's `logging` module with a named logger.
- Include `__init__` method that accepts `app` and any configuration parameters.
- Add a comment at the bottom of the file showing how to register the middleware in `main.py`:
  ```python
  # Registration: app.add_middleware({Name}Middleware, param=value)
  ```
