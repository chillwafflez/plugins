---
name: generate
description: "This skill should be used when the user asks to \"generate a domain\", \"generate a router\", \"generate a model\", \"generate a schema\", \"generate an endpoint\", \"generate a dependency\", \"generate a middleware\", \"scaffold a new domain\", \"create a new router\", \"add a model\", \"add an endpoint\", or mentions code generation for FastAPI components."
argument-hint: "domain|router|model|schema|endpoint|dependency|middleware <name> [options]"
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

# Generate FastAPI Components

Generate production-ready code components for an existing FastAPI project. Each sub-command scaffolds files that follow domain-driven structure, async-first patterns, and full type safety. All generated code adheres to best practices from zhanymkanov/fastapi-best-practices.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, fetch current API references from Context7 to ensure generated code matches the latest library versions. Never skip this step, even for seemingly simple generations.

### Procedure

1. Call `resolve-library-id` for each relevant library. At minimum, resolve IDs for:
   - **FastAPI** -- always required for any generation task
   - **SQLAlchemy** -- required when generating models, repositories, or domains
   - **Pydantic** -- required when generating schemas, models, or any component with validation
   - **Starlette** -- required when generating middleware

2. Call `query-docs` with a specific topic relevant to the sub-command being executed. Examples:
   - For domain generation: query FastAPI routing, SQLAlchemy model definition, and Pydantic model_config
   - For router generation: query FastAPI APIRouter and dependency injection
   - For model generation: query SQLAlchemy 2.0 mapped_column and DeclarativeBase
   - For schema generation: query Pydantic v2 ConfigDict and Field
   - For endpoint generation: query FastAPI path operations and status codes
   - For dependency generation: query FastAPI Depends and dependency injection
   - For middleware generation: query Starlette BaseHTTPMiddleware

3. Use the returned documentation to verify:
   - Import paths are correct for the installed version
   - Decorator syntax matches the current API
   - Configuration patterns follow current recommendations
   - Deprecated patterns are avoided

## Sub-Commands

Parse the first positional argument to determine which sub-command to execute. The second argument is always the name (except for `endpoint`, which takes a method and path).

### `domain <name>` -- Full Domain Scaffolding

Generate a complete domain with all layers. This is the most comprehensive sub-command and produces a fully functional CRUD module.

#### Files Created

Create the following directory structure under `app/domains/{name}/`:

- **`__init__.py`** -- Empty init file to make the directory a Python package.

- **`router.py`** -- FastAPI APIRouter with five CRUD endpoints:
  - `GET /` -- List all resources with pagination (`skip`, `limit` query params). Return `list[{Name}Response]`.
  - `GET /{id}` -- Get a single resource by UUID. Return `{Name}Response`. Raise 404 if not found.
  - `POST /` -- Create a new resource. Accept `{Name}Create` body. Return `{Name}Response` with status 201.
  - `PUT /{id}` -- Full update of a resource. Accept `{Name}Update` body. Return `{Name}Response`. Raise 404 if not found.
  - `DELETE /{id}` -- Delete a resource by UUID. Return status 204 with no content. Raise 404 if not found.
  - All endpoints must be `async def`.
  - Inject the service layer via `Depends()`.
  - Apply appropriate `response_model`, `status_code`, and `summary` to each route.

- **`schemas.py`** -- Pydantic v2 schemas (see `schema` sub-command for full specification).

- **`models.py`** -- SQLAlchemy 2.0 model (see `model` sub-command for full specification).

- **`service.py`** -- Business logic layer:
  - Define a `{Name}Service` class that accepts the repository as a constructor argument.
  - Implement `list`, `get_by_id`, `create`, `update`, and `delete` methods.
  - All methods must be `async def`.
  - Raise domain-specific exceptions (e.g., `{Name}NotFoundError`) instead of returning None.
  - Keep business rules here, never in the router or repository.

- **`dependencies.py`** -- Dependency injection functions:
  - `get_{name}_repository` -- Return an instance of the repository, injecting the database session.
  - `get_{name}_service` -- Return an instance of the service, injecting the repository via `Depends()`.

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

After creating all files, auto-register the router in `app/main.py` (see Auto-Registration section).

### `router <name>` -- Single Router File

Generate only the router file at `app/domains/{name}/router.py`.

#### Specification

- Create `app/domains/{name}/` directory and `__init__.py` if they do not exist.
- Define an `APIRouter` with `prefix="/{name}"` and `tags=["{Name}"]`.
- Include five CRUD endpoint stubs (GET list, GET by id, POST, PUT, DELETE).
- Mark each endpoint as `async def`.
- Include TODO comments indicating where to inject the service layer.
- Apply `response_model`, `status_code`, and `summary` to each route decorator.
- Auto-register the router in `app/main.py` (see Auto-Registration section).

### `model <name>` -- SQLAlchemy Model

Generate a SQLAlchemy 2.0 model file.

#### File Location

- If the project uses domain-driven structure: `app/domains/{name}/models.py`
- If the project uses flat structure (detected by presence of `app/models/` directory): `app/models/{name}.py`
- Scan existing project files to determine which pattern is in use. Default to domain-driven if ambiguous.

#### Specification

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

### `schema <name>` -- Pydantic Schemas

Generate Pydantic v2 schema definitions.

#### File Location

- Domain-driven: `app/domains/{name}/schemas.py`
- Flat: `app/schemas/{name}.py`

#### Classes Generated

- **`{Name}Base`** -- Shared fields used across create and update schemas. Use `Field()` with constraints (e.g., `min_length`, `max_length`, `ge`, `le`) where appropriate.

- **`{Name}Create({Name}Base)`** -- Fields required to create a resource. Inherit from Base and add any creation-specific fields.

- **`{Name}Update`** -- All fields from Base but wrapped in `Optional[...]`. Do NOT inherit from Base; redefine each field as optional so partial updates work correctly. Set `default=None` on every field.

- **`{Name}Response({Name}Base)`** -- Fields returned to the client. Include `id` (UUID), `created_at` (datetime), `updated_at` (datetime). Configure with:
  ```python
  model_config = ConfigDict(from_attributes=True)
  ```

- All schemas must use Pydantic v2 syntax. Never use the Pydantic v1 `class Config` pattern. Always use `model_config = ConfigDict(...)`.
- Import `ConfigDict` from `pydantic`.
- Add docstrings to each schema class.

### `endpoint <method> <path>` -- Single Endpoint

Add a single endpoint to an existing router file.

#### Procedure

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

### `dependency <name>` -- Reusable Dependency

Generate a dependency function following FastAPI's `Depends()` pattern.

#### File Location

- Domain-driven: `app/domains/{name}/dependencies.py`
- Flat: `app/dependencies/{name}.py`

#### Specification

- Generate an `async def` function by default. Include a sync alternative only if the user explicitly requests it.
- Include proper type hints for parameters and return type.
- Add a docstring explaining what the dependency provides.
- If the dependency requires database access, inject `AsyncSession` via `Depends(get_session)` or whatever session dependency exists in the project.
- If the dependency is for authentication or authorization, follow the `OAuth2PasswordBearer` pattern and include token validation logic.
- Provide a usage example as a comment at the top of the file showing how to inject it in a route.

### `middleware <name>` -- Custom Middleware

Generate a custom middleware class.

#### File Location

- `app/core/middleware/{name}.py`
- Create the `app/core/middleware/` directory if it does not exist.

#### Specification

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

## Code Patterns

Apply these patterns consistently across all generated code.

### Project Structure

Follow domain-driven structure. Each domain is a self-contained package:

```
app/
  domains/
    {name}/
      __init__.py
      router.py
      schemas.py
      models.py
      service.py
      dependencies.py
  repositories/
    {name}_repository.py
  core/
    middleware/
    exceptions.py
    config.py
  main.py
```

### Import Style

Use explicit imports only. Never use wildcard imports (`from module import *`). Group imports in standard order: stdlib, third-party, local. Use absolute imports from the `app` package root.

### Async by Default

Make every function `async def` unless there is a specific reason not to. Use `await` for all database operations, HTTP calls, and I/O. Use `AsyncSession` for SQLAlchemy sessions.

### Service Layer

Place all business logic in the service layer. Routers handle HTTP concerns only (parsing requests, returning responses). Services orchestrate repositories and enforce business rules. Repositories handle raw data access only.

### Repository Pattern

Repositories provide a clean abstraction over database queries. Each repository maps to one SQLAlchemy model. Use SQLAlchemy 2.0 `select()` syntax exclusively. Return model instances from repositories, not raw rows.

### Pydantic v2

Use `model_config = ConfigDict(...)` instead of inner `class Config`. Use `Field()` for validation constraints. Use `model_validator` and `field_validator` decorators for custom validation. Always set `from_attributes=True` on response schemas.

### SQLAlchemy 2.0

Use `mapped_column()` instead of `Column()`. Use `Mapped[type]` for attribute type hints. Use `select()` instead of `session.query()`. Use `DeclarativeBase` or `MappedAsDataclass` for the base class.

### Exception Handling

Define domain-specific exception classes. Raise exceptions in the service layer, catch them in the router with exception handlers. Never return None to signal "not found" -- raise a `{Name}NotFoundError`.

### Type Hints

Annotate every function parameter and return type. Use `UUID` for ID fields. Use `list[T]` over `List[T]` (Python 3.9+ lowercase generics). Use `T | None` over `Optional[T]` when targeting Python 3.10+. Check the project's minimum Python version before choosing syntax.

## Auto-Registration

When generating a domain or router, automatically register it in `app/main.py`.

### Procedure

1. Read the existing `app/main.py` file using the Read tool.
2. Scan for the pattern used to register existing routers (e.g., `app.include_router(...)` calls).
3. Find the last `include_router` call to determine the insertion point.
4. Add the import and registration:
   ```python
   from app.domains.{name}.router import router as {name}_router
   app.include_router({name}_router, prefix="/api/v1/{name_plural}", tags=["{Name}"])
   ```
5. If no existing `include_router` calls are found, add the registration after the `app = FastAPI(...)` instantiation line.
6. Use the Edit tool to make the change. Never overwrite the entire `main.py` file.
7. Verify the edit was applied by reading the file again.

Match the prefix and tag style of existing router registrations. If existing routers use `/api/v1`, follow that convention. If they use a different prefix pattern, match it.

## Generation Workflow

Execute these steps in order for every invocation of this skill.

1. **Parse arguments.** Extract the sub-command, name, and any additional options from the user's input. Validate that the sub-command is one of: `domain`, `router`, `model`, `schema`, `endpoint`, `dependency`, `middleware`. If the sub-command is not recognized, list the available sub-commands and exit.

2. **Fetch documentation from Context7.** Call `resolve-library-id` for FastAPI and any other relevant libraries (SQLAlchemy, Pydantic, Starlette). Then call `query-docs` for the specific topic being generated. Use the returned documentation throughout the generation process.

3. **Scan the existing project.** Use Glob and Read to examine:
   - The top-level project structure (`app/` layout).
   - Existing domains and their file patterns.
   - The base model class and mixins in use.
   - The existing `main.py` router registration style.
   - The Python version and dependency versions in `pyproject.toml` or `requirements.txt`.
   Match all conventions already established in the codebase.

4. **Generate files.** Create each file using the Write tool. Follow the patterns documented in this skill. Use consistent naming: snake_case for files and variables, PascalCase for classes. Pluralize table names. Singularize domain names.

5. **Auto-register.** If the sub-command is `domain` or `router`, edit `app/main.py` to register the new router (see Auto-Registration section).

6. **Print summary.** After generation is complete, output a summary listing:
   - Each file created, with its absolute path.
   - Each file modified (e.g., `main.py`), with a description of the change.
   - Next steps the user should take (e.g., run migrations, add fields, implement business logic).
