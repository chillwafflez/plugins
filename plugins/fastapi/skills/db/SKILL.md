---
name: db
description: "This skill should be used when the user asks to \"initialize the database\", \"set up SQLAlchemy\", \"create a migration\", \"scaffold a repository\", \"fastapi db\", \"add database support\", \"create alembic migration\", or mentions database setup, migrations, or repository patterns for a FastAPI application."
argument-hint: "init | migration <name> | repository <name>"
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

# FastAPI Database Skill

This skill scaffolds async SQLAlchemy database infrastructure, manages Alembic migrations, and generates repository classes for FastAPI applications. It produces code that follows the repository pattern with full async/await support via asyncpg.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Perform lookups for:
- `sqlalchemy` — async engine creation, `AsyncSession`, `async_sessionmaker`, `DeclarativeBase`
- `alembic` — async migration environment configuration, autogenerate
- `fastapi` — dependency injection with `Depends`, lifespan events

## Sub-command: `init`

Set up SQLAlchemy async engine, session management, base models, a generic repository, and Alembic migrations from scratch.

### Steps

1. **Read the project layout.** Scan for `pyproject.toml`, `app/config.py`, `app/main.py`, and any existing `app/database.py` or `alembic.ini`. Adapt to whatever structure already exists rather than overwriting it.

2. **Create `app/database.py`.** Include:

   - `engine` — Created with `create_async_engine` using the database URL from settings. Set `echo=False` for production and `pool_pre_ping=True` for connection health checks.
   - `async_session_factory` — An `async_sessionmaker` bound to the engine, with `class_=AsyncSession` and `expire_on_commit=False`.
   - `get_session` — An async generator dependency that yields an `AsyncSession` and ensures cleanup:
     ```python
     async def get_session() -> AsyncGenerator[AsyncSession, None]:
         async with async_session_factory() as session:
             try:
                 yield session
                 await session.commit()
             except Exception:
                 await session.rollback()
                 raise
     ```
   - `init_db()` — An async function that optionally creates tables (useful for development). Import `Base.metadata.create_all` with the async engine's `begin` context.
   - `close_db()` — An async function that calls `await engine.dispose()`.

3. **Create `app/models/base.py`.** Include:

   - `Base` — A `DeclarativeBase` subclass that all models inherit from.
   - `TimestampMixin` — A mixin class providing:
     - `id: Mapped[uuid.UUID]` — Primary key with `server_default=text("gen_random_uuid()")` for PostgreSQL.
     - `created_at: Mapped[datetime]` — Defaults to `func.now()`.
     - `updated_at: Mapped[datetime]` — Defaults to `func.now()` with `onupdate=func.now()`.
   - Use `mapped_column` with `Mapped[]` type annotations (SQLAlchemy 2.0 style).

4. **Create `app/repositories/base.py`.** Implement a generic base repository:

   - `BaseRepository[T]` — A generic class parameterized by the model type `T`.
   - Constructor accepts an `AsyncSession`.
   - Methods:
     - `async get(self, id: UUID) -> T | None` — Fetch a single record by primary key.
     - `async get_all(self, skip: int = 0, limit: int = 100) -> list[T]` — Fetch a paginated list using `select().offset().limit()`.
     - `async create(self, data: dict) -> T` — Instantiate the model from a dict, add to session, flush, and refresh.
     - `async update(self, id: UUID, data: dict) -> T | None` — Fetch by ID, apply updates from dict, flush, and refresh. Return `None` if not found.
     - `async delete(self, id: UUID) -> bool` — Fetch by ID, delete, and return `True`. Return `False` if not found.
   - Use `__class_getitem__` or a class variable `model` to resolve the generic type at runtime. A common pattern:
     ```python
     class BaseRepository(Generic[T]):
         model: type[T]

         def __init_subclass__(cls, **kwargs):
             for base in cls.__orig_bases__:
                 args = get_args(base)
                 if args:
                     cls.model = args[0]
     ```

5. **Create `app/repositories/__init__.py`.** Export `BaseRepository`.

6. **Initialize Alembic.** Run `alembic init -t async alembic` in the project root to scaffold the async migration template. Then modify the generated files:

   - **`alembic.ini`** — Set `sqlalchemy.url` to an empty string (it will be overridden in `env.py`).
   - **`alembic/env.py`** — Configure it to:
     - Import `Base.metadata` as the target metadata.
     - Read the database URL from the application's settings module.
     - Use `run_async_migrations` with `async_engine_from_config` or create the engine directly.
     - Import all model modules so autogenerate detects them.

7. **Update `app/config.py`.** Add a `database_url: str` field to the settings model with a sensible default (e.g., `postgresql+asyncpg://postgres:postgres@localhost:5432/app`).

8. **Update `pyproject.toml`.** Add `sqlalchemy[asyncio]`, `asyncpg`, and `alembic` to dependencies. Do not duplicate existing entries.

9. **Wire into the application lifespan.** If `app/main.py` exists and uses a lifespan context manager, add `init_db` and `close_db` calls. If there is no lifespan, create one:
   ```python
   @asynccontextmanager
   async def lifespan(app: FastAPI):
       await init_db()
       yield
       await close_db()
   ```

10. **Print a summary** listing all created and modified files, plus a reminder to run `alembic revision --autogenerate -m "initial"` after defining models.

### Generated Code Conventions

- Use SQLAlchemy 2.0 style throughout (`Mapped[]`, `mapped_column`, `select()`).
- All database operations must be async.
- The session dependency uses `yield` for proper cleanup within FastAPI's dependency injection lifecycle.
- Keep `Base` and `TimestampMixin` in a separate module from `database.py` to avoid circular imports when models import the base.

---

## Sub-command: `migration <name>`

Create a new Alembic migration with autogenerate.

### Steps

1. **Verify Alembic is initialized.** Check for `alembic.ini` and `alembic/` directory. If not found, instruct the user to run `db init` first.

2. **Discover model modules.** Glob for `app/models/*.py` and `app/domains/*/models.py`. Ensure all model modules are imported in `alembic/env.py` so autogenerate picks up every table.

3. **Run the migration command.** Execute:
   ```bash
   alembic revision --autogenerate -m "<name>"
   ```

4. **Read and display the generated migration file.** Show the file path and its contents so the user can review the `upgrade()` and `downgrade()` functions.

5. **Print a reminder** to review the migration before applying it with `alembic upgrade head`.

### Error Handling

- If the database is unreachable, print a clear message explaining that autogenerate requires a running database and suggest checking `DATABASE_URL`.
- If no changes are detected, inform the user that the migration file is empty and can be deleted.

---

## Sub-command: `repository <name>`

Scaffold a typed repository class for a specific domain model.

### Steps

1. **Resolve the model.** Search for a model class matching `<name>` (case-insensitive) in `app/models/` and `app/domains/*/models.py`. If not found, warn the user and generate the repository with a placeholder import and a TODO comment.

2. **Create `app/repositories/{name}_repository.py`.** Include:

   - Import the model class and `BaseRepository`.
   - A repository class extending `BaseRepository[{Name}]`:
     ```python
     from app.models.{name} import {Name}
     from app.repositories.base import BaseRepository

     class {Name}Repository(BaseRepository[{Name}]):
         """Repository for {Name} model."""

         async def find_by_name(self, name: str) -> {Name} | None:
             """Example custom query. Modify or remove as needed."""
             stmt = select(self.model).where(self.model.name == name)
             result = await self.session.execute(stmt)
             return result.scalar_one_or_none()
     ```
   - Include a placeholder custom query method with a docstring explaining how to add more.

3. **Update `app/repositories/__init__.py`.** Add the new repository to the exports.

4. **Print a usage example** showing how to inject the repository as a dependency:
   ```python
   from app.repositories.{name}_repository import {Name}Repository

   async def get_{name}_repo(session: AsyncSession = Depends(get_session)):
       return {Name}Repository(session)

   @router.get("/{name}s/{id}")
   async def get_{name}(id: UUID, repo: {Name}Repository = Depends(get_{name}_repo)):
       return await repo.get(id)
   ```

### Generated Code Conventions

- Repository file names use snake_case matching the model name.
- Class names use PascalCase with a `Repository` suffix.
- Custom query methods use `select()` statements, never raw SQL.
- All methods are async and use the session passed at construction time.

---

## General Guidelines

- **Idempotency.** Before creating or modifying any file, read its current contents. Merge new code with existing code rather than overwriting.
- **Import management.** When modifying `alembic/env.py`, append new model imports without disturbing existing ones. Maintain a comment block indicating where model imports belong.
- **Configuration.** All connection strings and database settings flow through the project's settings module. Never hard-code credentials.
- **Type safety.** All public functions and methods must include full type annotations compatible with Python 3.11+.
- **No interactive prompts.** Parse the argument to determine the sub-command. If the argument is missing or unrecognized, print available sub-commands and exit.

## Output Checklist

After completing any sub-command, verify:

- [ ] All created files use absolute imports rooted at `app`.
- [ ] No circular imports exist between `database.py`, `models/base.py`, and repositories.
- [ ] `pyproject.toml` dependencies are updated (if applicable).
- [ ] `alembic/env.py` imports all model modules for autogenerate.
- [ ] `.env.example` contains `DATABASE_URL` with a placeholder value.
- [ ] A brief usage example is printed to the console.
