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

## Relationship Patterns

### One-to-Many

```python
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy import ForeignKey
import uuid

class User(TimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(unique=True, index=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author", cascade="all, delete-orphan")

class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    title: Mapped[str]
    content: Mapped[str]
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    author: Mapped["User"] = relationship(back_populates="posts")
```

### Many-to-Many with Association Table

```python
from sqlalchemy import Table, Column, ForeignKey

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)

class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    title: Mapped[str]
    tags: Mapped[list["Tag"]] = relationship(secondary=post_tags, back_populates="posts")

class Tag(TimestampMixin, Base):
    __tablename__ = "tags"
    name: Mapped[str] = mapped_column(unique=True)
    posts: Mapped[list["Post"]] = relationship(secondary=post_tags, back_populates="tags")
```

For association tables that need extra columns (e.g., `created_at`), promote the table to a full ORM model with its own class. This is called the "association object" pattern and it allows storing metadata about the relationship itself — for example, a `UserRole` association model that records when a user was assigned a particular role and who assigned it.

Always specify `back_populates` on both sides of a relationship. This ensures bidirectional consistency — modifying one side of the relationship automatically updates the other side within the same session. Avoid `backref` as it obscures the relationship definition by hiding one side.

## Eager vs Lazy Loading in Async Context

Async SQLAlchemy forbids implicit lazy loading. Accessing an unloaded relationship raises `MissingGreenlet`. Always load relationships explicitly.

### selectinload (preferred for collections)

Fires a second `SELECT ... WHERE id IN (...)` query. Best for one-to-many and many-to-many relationships.

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload

stmt = select(User).options(selectinload(User.posts)).where(User.id == user_id)
result = await session.execute(stmt)
user = result.scalar_one_or_none()
```

### joinedload (preferred for single objects)

Uses a `JOIN` to load the related object in one query. Best for many-to-one and one-to-one relationships.

```python
from sqlalchemy.orm import joinedload

stmt = select(Post).options(joinedload(Post.author)).where(Post.id == post_id)
result = await session.execute(stmt)
post = result.unique().scalar_one_or_none()
```

Call `.unique()` when using `joinedload` with collections to deduplicate rows created by the JOIN.

Choose the right loading strategy based on the access pattern: use `selectinload` when loading a collection (e.g., all posts for a user) because it avoids the Cartesian product problem that JOINs create with multiple rows. Use `joinedload` for single-object relationships (e.g., loading the author of a post) because it adds minimal overhead and avoids a second query. Never use `lazy="select"` (the default) in async code — it triggers implicit I/O that raises `MissingGreenlet`.

### Nested loading

Chain load strategies for deep relationships:

```python
stmt = select(User).options(
    selectinload(User.posts).selectinload(Post.tags),
)
```

## Repository Pattern

Implement a generic base repository to standardize data access.

```python
from typing import Generic, TypeVar, Type
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: UUID) -> T | None:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self, offset: int = 0, limit: int = 100) -> list[T]:
        stmt = select(self.model).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, obj: T) -> T:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: T) -> None:
        await self.session.delete(obj)
        await self.session.flush()
```

The base repository encapsulates common data access patterns so domain repositories do not repeat boilerplate. The `flush()` call writes changes to the database within the current transaction without committing — the session dependency handles the final commit. The `refresh()` call reloads the object from the database to pick up server-generated defaults (like `created_at` timestamps and auto-incremented IDs).

Extend for domain-specific queries:

```python
class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

## Query Patterns (SQLAlchemy 2.0 Style)

Always use the `select()` construct. Never use the legacy `session.query()` API. The 2.0-style `select()` is the only approach that works consistently with async sessions, produces clear and composable query objects, and aligns with SQLAlchemy's long-term direction. The legacy `session.query()` API still works in synchronous contexts but is considered deprecated and will not receive new features.

```python
from sqlalchemy import select, and_, or_, func

# Basic select
stmt = select(User).where(User.is_active == True)
result = await session.execute(stmt)
users = result.scalars().all()

# Filtering with multiple conditions
stmt = select(Post).where(
    and_(
        Post.author_id == user_id,
        Post.created_at >= start_date,
    )
)

# Aggregation
stmt = select(func.count()).select_from(User).where(User.is_active == True)
result = await session.execute(stmt)
count = result.scalar_one()

# Pagination
stmt = (
    select(Post)
    .order_by(Post.created_at.desc())
    .offset(skip)
    .limit(limit)
)
result = await session.execute(stmt)
posts = result.scalars().all()
```

### Bulk operations

For inserting or updating many rows at once, use `session.execute()` with bulk insert constructs rather than adding objects one by one:

```python
from sqlalchemy import insert

stmt = insert(User).values([
    {"email": "user1@example.com", "hashed_password": "hash1"},
    {"email": "user2@example.com", "hashed_password": "hash2"},
])
await session.execute(stmt)
await session.flush()
```

Bulk operations bypass the ORM's identity map and change tracking, so they are significantly faster for large datasets. Use them for seed scripts, data imports, and batch processing. For operations that need ORM features (relationships, events, validators), stick with `session.add()` and `session.add_all()`.

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
