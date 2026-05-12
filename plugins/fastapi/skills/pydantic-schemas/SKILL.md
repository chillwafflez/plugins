---
name: Pydantic V2 Schema Patterns
description: "This skill should be used when the user asks about Pydantic models, request/response schemas, data validation, serialization, BaseModel, Field, or mentions Pydantic, schemas, validators, model_config, or ConfigDict in a FastAPI context."
version: 0.1.0
---

# Pydantic V2 Schema Patterns

Before implementing any Pydantic pattern, resolve the latest Pydantic documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "pydantic" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current API references. Pydantic v2 is a complete rewrite — never use v1 patterns (`class Config`, `@validator`, `orm_mode`).

## Base Model and ConfigDict

Use `BaseModel` with `ConfigDict` for all schema configuration. Define a project-wide custom base model to enforce consistent serialization behavior.

```python
from pydantic import BaseModel, ConfigDict

class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        use_enum_values=True,
    )
```

`from_attributes=True` replaces the legacy `orm_mode = True` and enables constructing schemas from ORM model instances via `Model.model_validate(orm_obj)`. All domain schemas should inherit from `AppBaseModel`.

The `populate_by_name=True` setting allows fields to be set by their Python attribute name even when an alias is defined. The `str_strip_whitespace=True` setting automatically strips leading and trailing whitespace from all string fields, preventing issues where users accidentally submit padded input. The `use_enum_values=True` setting serializes enum fields to their primitive values rather than the enum member, producing cleaner JSON output.

## Schema Inheritance Pattern

Structure schemas using an inheritance chain: Base defines shared fields, Create adds write-only fields, Update makes everything optional, and Response adds read-only fields.

```python
from datetime import datetime
from uuid import UUID
from pydantic import Field, EmailStr

class UserBase(AppBaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

class UserUpdate(AppBaseModel):
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=128)

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

Key design decisions:
- `UserUpdate` inherits from `AppBaseModel` (not `UserBase`) so all fields are independently optional. This avoids the problem where inheriting from `UserBase` would require all base fields on every partial update.
- `UserResponse` never includes `password` — the write-only field exists only in `UserCreate` and `UserUpdate`. This is a security boundary enforced by the schema layer.
- `UserCreate` extends `UserBase` to get all required fields plus the password.

This inheritance pattern reduces duplication while keeping each schema focused on its use case. The route handler specifies the schema in its signature — `UserCreate` for POST, `UserUpdate` for PATCH, `UserResponse` for the return type. FastAPI automatically validates incoming data against the input schema and serializes outgoing data against the response schema, so sensitive fields are never accidentally leaked.

For PATCH endpoints that support partial updates, check which fields were explicitly sent by the client using `model.model_fields_set`. This distinguishes between "the client sent `null`" and "the client did not include this field at all" — an important distinction when `None` is a valid value.

## Field Validation

Use `Field()` for declarative constraints. Combine with type annotations for maximum clarity.

```python
from pydantic import Field

class ItemCreate(AppBaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    price: float = Field(ge=0, description="Price in USD, must be non-negative")
    quantity: int = Field(ge=0, le=10000)
    sku: str = Field(pattern=r"^[A-Z]{2,4}-\d{4,8}$")
    tags: list[str] = Field(default_factory=list, max_length=10)
```

Common constraint parameters:
- Strings: `min_length`, `max_length`, `pattern` (regex)
- Numbers: `ge` (>=), `gt` (>), `le` (<=), `lt` (<), `multiple_of`
- Collections: `min_length`, `max_length` (number of items)

## Custom Validators

### Field validators

Use `@field_validator` to validate or transform individual fields.

```python
from pydantic import field_validator

class UserCreate(AppBaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must contain only alphanumeric characters, hyphens, and underscores")
        return v.lower()
```

### Model validators

Use `@model_validator` for cross-field validation.

```python
from pydantic import model_validator

class DateRangeFilter(AppBaseModel):
    start_date: datetime
    end_date: datetime

    @model_validator(mode="after")
    def validate_date_range(self) -> "DateRangeFilter":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self
```

Use `mode="before"` for validators that need to transform raw input before field parsing, and `mode="after"` for validators that work with already-parsed field values.

Field validators always receive the field value as the first positional argument and must return the (possibly transformed) value. Model validators in `mode="after"` receive the fully constructed model instance and must return it. In `mode="before"`, model validators receive the raw input data as a dictionary, which is useful for normalizing input formats or injecting computed fields before standard parsing occurs.

Avoid using validators for complex business logic. Validators should enforce data integrity constraints (format, range, cross-field consistency). Business rules like "a user cannot have more than 5 active subscriptions" belong in the service layer, not the schema.

## Enum Fields for Constrained Choices

Use Python enums for fields with a fixed set of valid values.

```python
from enum import StrEnum

class UserRole(StrEnum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class OrderStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class UserCreate(AppBaseModel):
    email: EmailStr
    role: UserRole = UserRole.VIEWER

class OrderUpdate(AppBaseModel):
    status: OrderStatus | None = None
```

Prefer `StrEnum` over `str, Enum` for cleaner serialization. With `use_enum_values=True` in `ConfigDict`, enum fields serialize to their string values automatically. Python's `StrEnum` (available from 3.11+) ensures each member is a string, so comparisons like `role == "admin"` work naturally without accessing `.value`. For integer-based choices, use `IntEnum` with the same pattern.

Define enums in a shared location within the domain (e.g., `app/domains/users/enums.py`) so both schemas and models can import them. This prevents circular dependencies and keeps the enum definition as the single source of truth for valid values.

## Custom Base Model with Standardized Serialization

Following zhanymkanov/fastapi-best-practices, define a custom base model that enforces project-wide conventions.

```python
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, model_serializer

class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        use_enum_values=True,
    )

class TimestampSchema(AppBaseModel):
    """Mixin for schemas that include timestamps."""
    created_at: datetime
    updated_at: datetime
```

Apply `TimestampSchema` as a base for response schemas that expose audit fields.

## Settings Management with pydantic-settings

Use `pydantic-settings` for configuration. Split settings by domain instead of maintaining one monolithic `Settings` class.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_")

    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str
    name: str = "app_db"

    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class RedisSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="REDIS_")

    host: str = "localhost"
    port: int = 6379
    db: int = 0

class AuthSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AUTH_")

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    debug: bool = False
    title: str = "My Service"
    version: str = "0.1.0"

    db: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
    auth: AuthSettings = AuthSettings()
```

This approach uses env prefixes (`DB_HOST`, `REDIS_PORT`, `AUTH_SECRET_KEY`) and keeps each concern isolated. Each settings class reads from environment variables automatically, with the `env_prefix` ensuring no naming collisions between domains. The `@property` method on `DatabaseSettings` constructs the connection URL from its components, avoiding the need to store a full URL as a single environment variable (though that approach also works).

Splitting settings by domain follows the same principle as the domain-driven project structure: each concern is self-contained and independently configurable. Adding a new integration (e.g., email, S3) means adding a new settings class without modifying existing ones.

Access settings via a cached dependency:

```python
from functools import lru_cache

@lru_cache
def get_settings() -> AppSettings:
    return AppSettings()
```

## Nested Response Schemas

For responses that include related entities, create dedicated nested schemas rather than reusing the full response schema. This prevents over-fetching and circular serialization issues.

```python
class PostAuthorResponse(AppBaseModel):
    id: UUID
    display_name: str

class PostResponse(AppBaseModel):
    id: UUID
    title: str
    content: str
    author: PostAuthorResponse
    tags: list[str]
    created_at: datetime
```

The `PostAuthorResponse` includes only the fields needed when displaying an author within a post — not the full `UserResponse` with all user details. This keeps response payloads lean and avoids accidentally exposing sensitive user fields in nested contexts. Apply the same principle to all nested relationships: define a minimal schema for each embedding context.

## Pagination and List Response Schemas

Standardize paginated responses with a generic wrapper.

```python
from typing import Generic, TypeVar
from pydantic import Field

T = TypeVar("T")

class PaginatedResponse(AppBaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int = Field(ge=1)
    per_page: int = Field(ge=1, le=100)
    pages: int

# Usage in routes:
@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_users(page: int = 1, per_page: int = 20):
    ...
```

## Key Rules Summary

1. Always use Pydantic v2 API — `ConfigDict`, `@field_validator`, `@model_validator`, `from_attributes`.
2. Define a project-wide `AppBaseModel` with standardized `ConfigDict` settings.
3. Follow the Base → Create → Update → Response inheritance pattern.
4. Use `Field()` constraints for declarative validation; use validators for complex logic.
5. Use `StrEnum` for constrained choices with `use_enum_values=True`.
6. Split settings into domain-specific classes using `pydantic-settings` with env prefixes.
7. Never expose sensitive fields (passwords, tokens) in response schemas.
8. Use nested schemas with minimal fields for embedded relationships to keep payloads lean.
9. Use `model_fields_set` to distinguish between "not sent" and "sent as null" in partial updates.
10. Consult Context7 for the latest Pydantic v2 documentation before implementing any pattern.
