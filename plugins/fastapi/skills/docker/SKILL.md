---
name: docker
description: "This skill should be used when the user asks to \"create a Dockerfile\", \"set up Docker\", \"generate docker-compose\", \"dockerize FastAPI\", \"fastapi docker\", \"containerize the app\", or mentions Docker, containers, or docker-compose for a FastAPI application."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# Dockerize FastAPI Application

Generate production-ready Docker configuration for a FastAPI application, including a multi-stage Dockerfile, docker-compose.yml with supporting services, and a .dockerignore file.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Look up documentation for:
- **FastAPI** — deployment recommendations, uvicorn worker configuration
- **Docker** — multi-stage build best practices, Python base image guidance
- **uv** — lock file installation, dependency resolution in containers

## Workflow

### 1. Analyze the Project

Scan the project root to determine the application structure:

- Read `pyproject.toml` to identify dependencies and the project name.
- Check for `app/main.py` or similar entry point to determine the uvicorn target.
- Look for existing `alembic.ini`, `celery.py`, or worker configurations.
- Detect whether the project is a **monolith** (single `app/` directory) or a **microservice** (multiple service directories). If microservice, generate per-service Dockerfiles under each service directory.
- Check for Redis-related dependencies (redis, aioredis, fastapi-cache) to decide whether to include a Redis service.

### 2. Generate Dockerfile

Create a multi-stage Dockerfile at the project root.

**Stage 1 — builder:**
```dockerfile
FROM python:3.12-slim AS builder
```

- Install `uv` via pip.
- Set `WORKDIR /app`.
- Copy `pyproject.toml` and `uv.lock` (if present).
- Run `uv sync --frozen --no-dev` to install production dependencies only.
- Copy the application source code.

**Stage 2 — runner:**
```dockerfile
FROM python:3.12-slim AS runner
```

- Copy the virtual environment and application code from the builder stage.
- Create a non-root user (`appuser`) and switch to it.
- Set environment variables: `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`.
- Expose port 8000.
- Set the CMD to run uvicorn with the detected application entry point:
  ```
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```
- For production, include a comment suggesting `--workers` flag based on CPU cores.

### 3. Generate docker-compose.yml

Create `docker-compose.yml` at the project root with the following services:

**app service:**
- Build from the local Dockerfile.
- Map ports `8000:8000`.
- Set `depends_on` with health check conditions for `db` (and `redis` if applicable).
- Load environment from `.env` via `env_file`.
- Mount the app directory as a volume for development (include a comment noting this should be removed in production).

**db service:**
- Use `postgres:16-alpine` image.
- Set environment variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (reference `.env`).
- Mount a named volume `postgres_data` to `/var/lib/postgresql/data`.
- Add a healthcheck:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 5s
    timeout: 5s
    retries: 5
  ```

**redis service (conditional):**
Include only if the project has Redis-related dependencies. Use `redis:7-alpine` with a healthcheck:
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 5s
  retries: 5
```

**Volumes section:**
Declare `postgres_data` as a named volume.

### 4. Generate .dockerignore

Create `.dockerignore` at the project root with standard Python and project ignores:

```
__pycache__
*.pyc
*.pyo
.git
.gitignore
.env
.env.*
.venv
venv
*.egg-info
dist
build
.mypy_cache
.pytest_cache
.ruff_cache
node_modules
docs
tests
*.md
docker-compose.yml
Dockerfile
.dockerignore
```

### 5. Microservice Adjustments

If the project uses a microservice layout (multiple service directories each with their own `main.py`):

- Generate a Dockerfile inside each service directory instead of one at the root.
- Generate a single `docker-compose.yml` at the root that builds each service from its respective directory.
- Add a shared network so services can communicate by service name.
- Include a gateway/proxy service comment if an API gateway pattern is detected.

### 6. Post-Generation Summary

After writing all files, print a summary:

- List all files created or modified.
- Provide the commands to build and run:
  ```
  docker compose up --build
  docker compose up -d  # detached mode
  ```
- Remind to create a `.env` file if one does not exist (reference `.env.example` if the config skill has been run).
- Note any production hardening steps: remove volume mounts, add `--workers`, set resource limits, use secrets management instead of env_file.
