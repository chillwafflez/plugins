# Generate — Code Patterns Reference

Apply these patterns consistently across all generated code.

## Project Structure

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

## Import Style

Use explicit imports only. Never use wildcard imports (`from module import *`). Group imports in standard order: stdlib, third-party, local. Use absolute imports from the `app` package root.

## Async by Default

Make every function `async def` unless there is a specific reason not to. Use `await` for all database operations, HTTP calls, and I/O. Use `AsyncSession` for SQLAlchemy sessions.

## Service Layer

Place all business logic in the service layer. Routers handle HTTP concerns only (parsing requests, returning responses). Services orchestrate repositories and enforce business rules. Repositories handle raw data access only.

## Repository Pattern

Repositories provide a clean abstraction over database queries. Each repository maps to one SQLAlchemy model. Use SQLAlchemy 2.0 `select()` syntax exclusively. Return model instances from repositories, not raw rows.

## Pydantic v2

Use `model_config = ConfigDict(...)` instead of inner `class Config`. Use `Field()` for validation constraints. Use `model_validator` and `field_validator` decorators for custom validation. Always set `from_attributes=True` on response schemas.

## SQLAlchemy 2.0

Use `mapped_column()` instead of `Column()`. Use `Mapped[type]` for attribute type hints. Use `select()` instead of `session.query()`. Use `DeclarativeBase` or `MappedAsDataclass` for the base class.

## Exception Handling

Define domain-specific exception classes. Raise exceptions in the service layer, catch them in the router with exception handlers. Never return None to signal "not found" — raise a `{Name}NotFoundError`.

## Type Hints

Annotate every function parameter and return type. Use `UUID` for ID fields. Use `list[T]` over `List[T]` (Python 3.9+ lowercase generics). Use `T | None` over `Optional[T]` when targeting Python 3.10+. Check the project's minimum Python version before choosing syntax.
