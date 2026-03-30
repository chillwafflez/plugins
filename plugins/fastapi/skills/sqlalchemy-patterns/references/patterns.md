# SQLAlchemy — Advanced Patterns

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

For association tables needing extra columns (e.g., `created_at`), promote to a full ORM model (the "association object" pattern).

Always specify `back_populates` on both sides of a relationship. Avoid `backref` as it obscures the relationship definition.

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

Call `.unique()` when using `joinedload` with collections to deduplicate rows.

Choose the right loading strategy: `selectinload` for collections (avoids Cartesian products), `joinedload` for single-object relationships (avoids second query). Never use `lazy="select"` in async code.

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

The `flush()` call writes changes within the current transaction without committing. The `refresh()` call reloads server-generated defaults.

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

Always use the `select()` construct. Never use the legacy `session.query()` API.

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

For inserting or updating many rows at once, use bulk insert constructs rather than adding objects one by one:

```python
from sqlalchemy import insert

stmt = insert(User).values([
    {"email": "user1@example.com", "hashed_password": "hash1"},
    {"email": "user2@example.com", "hashed_password": "hash2"},
])
await session.execute(stmt)
await session.flush()
```

Bulk operations bypass the ORM's identity map and change tracking, so they are significantly faster for large datasets. Use them for seed scripts, data imports, and batch processing.
