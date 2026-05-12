---
name: SQLAlchemy Async Patterns
description: "This skill provides reference patterns and best practices for SQLAlchemy async in FastAPI. It activates automatically when the user asks conceptual questions about SQLAlchemy models, relationships, query patterns, session management, or mapped_column — without requesting database setup or repository scaffolding. For initializing database infrastructure or scaffolding repositories, use the /fastapi:db command instead."
version: 0.1.0
---

# SQLAlchemy Async Patterns

Before implementing any SQLAlchemy pattern, resolve the latest SQLAlchemy documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "sqlalchemy" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current API references. SQLAlchemy 2.0 introduced significant API changes — never use legacy 1.x patterns.

## Async Engine Setup

Configure the async engine with `asyncpg` as the PostgreSQL driver. Place this in `app/core/database.py`.

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

engine = create_async_engine(
    settings.database_url,  # "postgresql+asyncpg://user:pass@host:5432/dbname"
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```

Set `expire_on_commit=False` to prevent lazy-load attempts on detached objects after commit. This is critical in async contexts where implicit I/O is forbidden.

The `pool_pre_ping=True` setting issues a lightweight `SELECT 1` before reusing a connection from the pool. This detects stale connections that the database server has closed (due to timeouts, restarts, or network interruptions) and replaces them transparently. The `pool_recycle=300` setting forces connections to be replaced every 5 minutes, which prevents issues with databases that enforce maximum connection lifetimes.

For production deployments behind a connection pooler like PgBouncer, set `pool_size=5` and `max_overflow=0` since PgBouncer manages the actual pool. Tune these values based on load testing — the optimal pool size depends on the number of concurrent requests and the average query duration.

## Session Dependency

Provide the session as an async generator dependency that ensures proper cleanup.

```python
from collections.abc import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

This pattern commits on success and rolls back on any unhandled exception. Inject it via `Depends(get_session)` in routes or downstream dependencies. The session is scoped to a single request — it opens when the dependency is first resolved and closes when the request completes. This ensures that each request operates in its own transaction boundary and no state leaks between requests.

An alternative approach is to omit the auto-commit from the dependency and let the service layer manage transactions explicitly. This gives finer control for complex operations that require multiple commit points or savepoints, but it increases the risk of forgetting to commit. Choose the pattern that matches the project's complexity — auto-commit in the dependency works well for straightforward CRUD applications.

## DeclarativeBase with Mixins

Use SQLAlchemy 2.0 declarative style with `Mapped` type annotations and `mapped_column`.

```python
import uuid
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
    )
```

Apply `TimestampMixin` to all domain models:

```python
class User(TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    is_active: Mapped[bool] = mapped_column(default=True)
```

Never use the legacy `Column()` syntax. Always annotate with `Mapped[T]` and use `mapped_column()`.

The `TimestampMixin` provides a UUID primary key and automatic timestamps for every model. Using `server_default=func.gen_random_uuid()` ensures the database generates the UUID if the application does not provide one, which is useful for bulk inserts and database-level operations. The `onupdate=func.now()` on `updated_at` triggers automatically when SQLAlchemy issues an UPDATE statement.

For nullable columns, annotate with `Mapped[str | None]` to communicate optionality at both the Python type level and the database schema level. SQLAlchemy infers `nullable=True` from the `| None` annotation, so there is no need to pass `nullable` explicitly in most cases.

## Relationships, Loading, Repository, and Query Patterns

For detailed code examples of all patterns below, see `references/patterns.md`.

### Relationship Patterns
- **One-to-many**: Use `relationship(back_populates=...)` with `ForeignKey`. Always specify `back_populates` on both sides — avoid `backref`.
- **Many-to-many**: Use an association `Table` with `secondary=` parameter. For extra columns, promote to an association object model.

### Eager vs Lazy Loading (Async)
Async SQLAlchemy forbids implicit lazy loading (`MissingGreenlet` error). Always load explicitly:
- **`selectinload`** — Preferred for collections (one-to-many, many-to-many). Fires a second `SELECT ... WHERE id IN (...)`.
- **`joinedload`** — Preferred for single objects (many-to-one). Uses a JOIN. Call `.unique()` with collections.
- **Nested loading** — Chain strategies: `selectinload(User.posts).selectinload(Post.tags)`.

### Repository Pattern
Generic `BaseRepository[T]` with async CRUD: `get_by_id`, `get_all`, `create`, `delete`. Uses `flush()` + `refresh()` within the transaction. Extend for domain-specific queries (e.g., `get_by_email`).

### Query Patterns (2.0 Style)
Always use `select()` — never `session.query()`. Covers: basic select, multi-condition filtering with `and_`/`or_`, aggregation with `func.count()`, pagination with `offset`/`limit`, and bulk operations with `insert().values([...])`.

## Key Rules Summary

1. Use `create_async_engine` with `asyncpg` — never use synchronous engines in async FastAPI.
2. Set `expire_on_commit=False` on the session factory.
3. Provide sessions via an async generator dependency with commit/rollback handling.
4. Use `Mapped[T]` + `mapped_column()` exclusively — no legacy `Column()` syntax.
5. Always use explicit eager loading (`selectinload`, `joinedload`) — implicit lazy loading is forbidden in async.
6. Use `select()` statements — never `session.query()`.
7. Implement the repository pattern to keep data access logic out of routes and services.
8. Apply naming conventions to `Base.metadata` for consistent constraint names across migrations.
9. Use `pool_pre_ping=True` and `pool_recycle` to handle stale connections gracefully.
10. Consult Context7 for the latest SQLAlchemy documentation before implementing any pattern.
