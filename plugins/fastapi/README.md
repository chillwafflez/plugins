# FastAPI Plugin for Claude Code

A comprehensive FastAPI development toolkit for scaffolding projects, generating code, managing auth/database/testing/Docker, and learning best practices — all backed by live documentation via Context7.

## Features

### Slash Commands (User-Invoked Skills)

| Command | Description |
|---------|-------------|
| `/fastapi:init` | Scaffold a new FastAPI project (monolith or microservice) |
| `/fastapi:generate` | Generate domain, router, model, schema, endpoint, dependency, or middleware |
| `/fastapi:auth` | Set up JWT, API key, or role-based authentication |
| `/fastapi:db` | Initialize SQLAlchemy async, create Alembic migrations, scaffold repositories |
| `/fastapi:test` | Generate test stubs for endpoints or common pytest fixtures |
| `/fastapi:docker` | Generate Dockerfile (multi-stage) and docker-compose.yml |
| `/fastapi:config` | Set up environment config, CORS middleware, or structured logging |
| `/fastapi:lint` | Set up ruff, mypy, and pre-commit hooks |
| `/fastapi:docs` | Preview Swagger UI or export OpenAPI spec |
| `/fastapi:explain` | Break down and explain any endpoint or FastAPI code |

### Auto-Activating Skills (Knowledge)

These activate automatically when relevant context is detected:

| Skill | Covers |
|-------|--------|
| FastAPI Core Patterns | App factory, DI, middleware, exceptions, async routes |
| SQLAlchemy Async Patterns | Async engine/session, models, relationships, repository pattern |
| Pydantic V2 Schema Patterns | BaseModel, Field validation, custom validators, modular settings |
| Alembic Migration Patterns | Async migrations, autogenerate, data migrations |
| FastAPI Testing Patterns | httpx AsyncClient, pytest-asyncio, fixtures, dependency overrides |
| FastAPI Docker Patterns | Multi-stage builds, docker-compose, health checks |

### Agents

| Agent | Purpose |
|-------|---------|
| api-architect | Design API structure, review architecture, plan domain boundaries |
| security-reviewer | OWASP vulnerability review, auth/authz audit |
| test-generator | Generate comprehensive test suites autonomously |

## Tech Stack

- **Framework:** FastAPI 0.115+
- **Database:** PostgreSQL + SQLAlchemy 2.0 (async)
- **Migrations:** Alembic (async)
- **Validation:** Pydantic v2
- **Auth:** PyJWT + pwdlib[bcrypt]
- **Testing:** pytest + pytest-asyncio + httpx
- **Package Manager:** uv
- **Docker:** Multi-stage builds + docker-compose
- **Documentation:** Context7 for live API references

## Prerequisites

- Python 3.12+
- uv package manager
- Docker (for containerization commands)
- PostgreSQL (or Docker for local dev)

## Installation

```bash
# Test locally
claude --plugin-dir /path/to/fastapi

# Or add to your Claude Code plugins
```

## Quick Start

```
/fastapi:init monolith
/fastapi:generate domain users
/fastapi:auth jwt
/fastapi:db init
/fastapi:test fixtures
/fastapi:docker
```

## Context7 Integration

All code generation commands use Context7 to fetch current API references before generating code. This ensures generated patterns are up-to-date with the latest FastAPI, SQLAlchemy, Pydantic, Alembic, and Starlette documentation.

Requires Context7 MCP server to be configured. If Context7 quota is exceeded, skills fall back to built-in knowledge.

## Best Practices

This plugin follows patterns from [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices):

- Domain-driven project structure (`app/domains/`)
- Modular settings (per-domain BaseSettings)
- Explicit imports (no wildcards)
- Async-first design
- Service layer for business logic
- Repository pattern for data access
- Custom exception classes per domain

## Author

Justin Nguyen

## License

MIT
