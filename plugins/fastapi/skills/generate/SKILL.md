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

Generate a complete domain with all layers: router, schemas, models, service, dependencies, repository, and tests. This is the most comprehensive sub-command and produces a fully functional CRUD module. See `references/sub-commands.md` for the detailed file-by-file specification.

### `router <name>` -- Single Router File

Generate only the router file at `app/domains/{name}/router.py` with five CRUD endpoint stubs and auto-register in `main.py`. See `references/sub-commands.md` for full specification.

### `model <name>` -- SQLAlchemy Model

Generate a SQLAlchemy 2.0 model file using `mapped_column()`, `Mapped[T]` type hints, `TimestampMixin` (if found), and UUID primary key. Placed in domain-driven or flat structure based on project convention. See `references/sub-commands.md` for full specification.

### `schema <name>` -- Pydantic Schemas

Generate Pydantic v2 schema definitions: `{Name}Base`, `{Name}Create`, `{Name}Update` (all optional fields), and `{Name}Response` (with `from_attributes=True`). See `references/sub-commands.md` for full specification.

### `endpoint <method> <path>` -- Single Endpoint

Add a single endpoint to an existing router file with correct decorator, status code, response_model, and dependency injection. See `references/sub-commands.md` for the full procedure.

### `dependency <name>` -- Reusable Dependency

Generate an async dependency function following FastAPI's `Depends()` pattern. See `references/sub-commands.md` for full specification.

### `middleware <name>` -- Custom Middleware

Generate a custom middleware class using Starlette's `BaseHTTPMiddleware` pattern. See `references/sub-commands.md` for full specification.

## Code Patterns

Apply these patterns consistently across all generated code. See `references/patterns.md` for full details on each pattern.

- **Domain-driven structure** -- Each domain is a self-contained package under `app/domains/`.
- **Explicit imports only** -- No wildcard imports. Absolute imports from `app` root.
- **Async by default** -- All functions `async def`. Use `AsyncSession` for SQLAlchemy.
- **Service layer** -- Business logic in services, HTTP concerns in routers, data access in repositories.
- **Repository pattern** -- One repository per model, SQLAlchemy 2.0 `select()` syntax only.
- **Pydantic v2** -- `ConfigDict(...)` not `class Config`. `Field()` for constraints.
- **SQLAlchemy 2.0** -- `mapped_column()` not `Column()`. `Mapped[T]` for type hints.
- **Exception handling** -- Domain-specific exceptions, never return None for "not found".
- **Type hints** -- Every parameter and return type annotated. `list[T]` over `List[T]`.

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
