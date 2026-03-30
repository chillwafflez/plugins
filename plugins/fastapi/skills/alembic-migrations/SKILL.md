---
name: Alembic Migration Patterns
description: "This skill provides reference patterns and best practices for Alembic migrations. It activates automatically when the user asks conceptual questions about migration strategies, revision workflows, autogenerate behavior, data migrations, or common Alembic pitfalls — without requesting migration creation. For creating or running migrations, use the /fastapi:db command instead."
version: 0.1.0
---

# Alembic Migration Patterns

Before implementing any Alembic pattern, resolve the latest Alembic documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "alembic" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current API references. Alembic configuration details change across versions — always verify against current docs.

## Async Alembic Setup

Alembic requires special configuration to work with async SQLAlchemy engines. The key is the `env.py` file, which must bridge Alembic's synchronous migration runner with the async engine.

### Project structure

```
alembic/
├── env.py              # Migration environment configuration
├── script.py.mako      # Migration file template
└── versions/           # Auto-generated migration files
    ├── 001_create_users_table.py
    └── 002_add_posts_table.py
alembic.ini             # Alembic configuration
```

### alembic.ini configuration

```ini
[alembic]
script_location = alembic
# Use async PostgreSQL URL
sqlalchemy.url = postgresql+asyncpg://user:password@localhost:5432/dbname

# Use file-based versioning with descriptive names
file_template = %%(rev)s_%%(slug)s
# Truncate long slugs
truncate_slug_length = 40
```

Override the database URL from environment variables rather than hardcoding it in `alembic.ini`. The `env.py` file handles this by reading from the application's settings and calling `config.set_main_option()`. This ensures the same connection string is used by both the application and Alembic, eliminating configuration drift. The `file_template` setting controls migration file naming — including the revision hash and a slug derived from the message makes files easy to identify in the filesystem.

### env.py with async migrations

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import get_settings
from app.core.database import Base

# Import ALL models so Alembic can detect them
from app.domains.users.models import User  # noqa: F401
from app.domains.posts.models import Post  # noqa: F401
from app.domains.tags.models import Tag  # noqa: F401

config = context.config
settings = get_settings()

# Override sqlalchemy.url from environment
config.set_main_option("sqlalchemy.url", settings.db.url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL script without connecting."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using an async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

Critical details:
- Use `pool.NullPool` for migration connections — pooling is unnecessary for one-off migration runs.
- Import every ORM model at the top of `env.py`. If a model is not imported, Alembic cannot detect it and will not generate migrations for it.
- Use `connection.run_sync(do_run_migrations)` to bridge async connection to Alembic's synchronous runner.

## Creating Migrations

### Autogenerate from model changes

After modifying SQLAlchemy models, generate a migration:

```bash
alembic revision --autogenerate -m "add posts table"
```

This produces a migration file in `alembic/versions/`. Always review the generated code — autogenerate does not detect everything.

### What autogenerate detects

- Table creation and deletion
- Column additions, removals, and type changes
- Nullable changes
- Index and unique constraint changes
- Foreign key additions and removals

### What autogenerate does NOT detect

- Table renames (generates drop + create instead)
- Column renames (generates drop + create instead)
- Changes to `CheckConstraint`, `Enum` values
- Data migrations
- Changes to column defaults (in some cases)

Always review autogenerated migrations and adjust manually when needed. Autogenerate is a convenience tool, not a replacement for understanding what the migration does. Blindly applying autogenerated migrations in production can lead to data loss — for example, when a column rename is detected as a drop followed by an add, destroying all existing data in that column.

When making changes that autogenerate cannot handle (renames, complex type changes, enum value additions), write the migration manually using `alembic revision -m "description"` without the `--autogenerate` flag, then implement the `upgrade()` and `downgrade()` functions by hand.

## Running Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade one step
alembic upgrade +1

# Downgrade one step
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade abc123

# Show current revision
alembic current

# Show migration history
alembic history --verbose

# Generate SQL without running (for review)
alembic upgrade head --sql
```

## Migration Best Practices

### Descriptive names

Use clear, action-oriented names that describe what the migration does:

```bash
# Good
alembic revision --autogenerate -m "create users table"
alembic revision --autogenerate -m "add email index to users"
alembic revision --autogenerate -m "add posts table with author foreign key"

# Bad
alembic revision --autogenerate -m "update"
alembic revision --autogenerate -m "fix"
alembic revision --autogenerate -m "changes"
```

### Review autogenerated code

Open every generated migration and verify:
- The `upgrade()` function creates the expected schema changes.
- The `downgrade()` function correctly reverses them.
- No unexpected drops or renames appear.
- Index names are sensible.

### Test both directions

Run both upgrade and downgrade for every migration before committing:

```bash
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

This confirms the migration is reversible and idempotent. Include migration testing in the CI pipeline — run `alembic upgrade head` and `alembic downgrade base` against a disposable test database to catch issues before they reach production.

### Never edit a deployed migration

Once a migration has been applied in staging or production, treat it as immutable. Create a new migration to fix issues. Editing deployed migrations causes checksum mismatches and breaks the migration chain. Alembic tracks applied migrations by their revision ID in the `alembic_version` table — if the content of a migration changes after it has been applied, the schema will be in an inconsistent state that is difficult to recover from.

### Keep migrations small and focused

Each migration should do one thing: add a table, add a column, create an index. Avoid bundling unrelated schema changes into a single migration. Small migrations are easier to review, easier to debug when something goes wrong, and easier to roll back individually. If a deployment fails halfway through a large migration, identifying and fixing the problem is much harder than with a focused one.

## Handling Data Migrations

Some changes require moving data, not just altering schema. Write these as explicit operations within the migration.

```python
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # Step 1: Add new column with nullable=True
    op.add_column("users", sa.Column("full_name", sa.String(200), nullable=True))

    # Step 2: Populate from existing data
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE users SET full_name = first_name || ' ' || last_name")
    )

    # Step 3: Make non-nullable after population
    op.alter_column("users", "full_name", nullable=False)

    # Step 4: Drop old columns
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")


def downgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))

    connection = op.get_bind()
    connection.execute(
        sa.text("""
            UPDATE users SET
                first_name = split_part(full_name, ' ', 1),
                last_name = split_part(full_name, ' ', 2)
        """)
    )

    op.alter_column("users", "first_name", nullable=False)
    op.alter_column("users", "last_name", nullable=False)
    op.drop_column("users", "full_name")
```

For large tables, consider batched updates to avoid long-running transactions:

```python
connection = op.get_bind()
batch_size = 1000
while True:
    result = connection.execute(
        sa.text("UPDATE users SET full_name = first_name || ' ' || last_name WHERE full_name IS NULL LIMIT :batch"),
        {"batch": batch_size},
    )
    if result.rowcount == 0:
        break
```

## Common Pitfalls

### Circular imports

If `env.py` imports models that import from `database.py` which imports settings, circular dependency chains can form. Solve this by:
- Keeping model files free of runtime imports from the database module.
- Using `TYPE_CHECKING` guards for type-only imports.
- Importing models at the bottom of `env.py` or in a dedicated `models/__init__.py` barrel file.

### Missing model imports in env.py

The most common cause of "empty" autogenerated migrations is forgetting to import new models in `env.py`. Create a barrel import file:

```python
# app/domains/__init__.py — import all models here
from app.domains.users.models import User  # noqa: F401
from app.domains.posts.models import Post  # noqa: F401
from app.domains.tags.models import Tag    # noqa: F401
```

Then in `env.py`:

```python
import app.domains  # noqa: F401 — triggers all model imports
```

### Naming conventions

Apply SQLAlchemy naming conventions to `Base.metadata` so Alembic generates consistent constraint names:

```python
from sqlalchemy import MetaData

convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)
```

This prevents Alembic from generating unnamed constraints, which cause issues when downgrading across databases.

## Key Rules Summary

1. Configure `env.py` with `run_async_migrations` using `async_engine_from_config` and `NullPool`.
2. Import every ORM model in `env.py` — unimported models produce empty migrations.
3. Always review autogenerated migrations before committing.
4. Use descriptive migration names (`"add posts table"`, not `"update"`).
5. Test both `upgrade` and `downgrade` for every migration.
6. Never edit a migration that has been deployed — create a new one instead.
7. Apply naming conventions to `Base.metadata` for consistent constraint names.
8. Consult Context7 for the latest Alembic documentation before implementing any pattern.
