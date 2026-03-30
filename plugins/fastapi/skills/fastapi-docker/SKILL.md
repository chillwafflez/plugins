---
name: FastAPI Docker Patterns
description: "This skill provides reference patterns and best practices for Docker in FastAPI projects. It activates automatically when the user asks conceptual questions about Docker patterns, container optimization, base image selection, or deployment strategies — without requesting file generation. For generating Dockerfile and docker-compose files, use the /fastapi:docker command instead."
version: 0.1.0
---

# FastAPI Docker Patterns

Before implementing any Docker or deployment pattern, resolve the latest documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "uvicorn" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current configuration options. Also resolve "docker" for any Docker-specific API changes. Container best practices evolve — verify base image tags and configuration options against current docs.

## Multi-Stage Dockerfile

Use a multi-stage build to separate dependency installation from the runtime image. This produces a smaller, more secure final image.

```dockerfile
# ============================================
# Stage 1: Builder — install dependencies
# ============================================
FROM python:3.12-slim AS builder

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /build

# Copy dependency files first (Docker cache optimization)
COPY pyproject.toml uv.lock ./

# Install production dependencies only
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# ============================================
# Stage 2: Runner — minimal runtime image
# ============================================
FROM python:3.12-slim AS runner

# Install runtime system dependencies (if needed)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid 1000 --create-home appuser

WORKDIR /home/appuser

# Copy installed dependencies and application from builder
COPY --from=builder /build/.venv ./.venv
COPY --from=builder /build/app ./app
COPY --from=builder /build/alembic ./alembic
COPY --from=builder /build/alembic.ini ./

# Set PATH to use the virtual environment
ENV PATH="/home/appuser/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Key decisions in this Dockerfile:
- **uv over pip**: `uv sync` is significantly faster than `pip install` and respects the lockfile for reproducible builds.
- **Dependency layer caching**: Copy `pyproject.toml` and `uv.lock` before source code. Dependencies change less frequently than source, so Docker reuses the cached layer on most builds.
- **Non-root user**: Running as `appuser` (UID 1000) prevents privilege escalation attacks.
- **`PYTHONUNBUFFERED=1`**: Ensures logs appear immediately in `docker logs` without buffering.
- **`PYTHONDONTWRITEBYTECODE=1`**: Prevents `.pyc` files from being written in the container.
- **`--workers 4`**: Set worker count based on available CPU cores. For production, use `2 * CPU_CORES + 1` as a starting point. For containers with cgroup limits, read from `/sys/fs/cgroup` or use `--workers` dynamically.

The multi-stage build produces a final image that contains only the Python runtime, installed dependencies, and application code — no build tools, no `uv`, no source control artifacts. This minimizes attack surface and reduces image size significantly (typically from 1GB+ to under 200MB).

For applications that need system-level libraries at runtime (e.g., `libpq` for psycopg2, `libmagic` for file type detection), add those packages in the runner stage's `apt-get install` step. Keep the builder and runner dependency lists separate — the builder may need compilers and headers that the runner does not.

## docker-compose.yml — Development

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use builder stage for dev (includes dev deps)
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - APP_DEBUG=true
    volumes:
      - ./app:/home/appuser/app  # Hot reload via volume mount
    command: >
      uvicorn app.main:app
      --host 0.0.0.0
      --port 8000
      --reload
      --reload-dir /home/appuser/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-app_db}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

### Development-specific features

- **Volume mount** (`./app:/home/appuser/app`): Enables uvicorn's `--reload` to detect file changes without rebuilding the image.
- **`target: builder`**: Uses the builder stage, which includes dev dependencies (test tools, linters).
- **`depends_on` with `condition: service_healthy`**: The app waits for PostgreSQL and Redis to be ready before starting, preventing connection errors on startup. Without health checks, `depends_on` only waits for the container to start, not for the service inside it to be ready — PostgreSQL may take several seconds to initialize its data directory on first run.

## docker-compose.prod.yml — Production Override

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner  # Use runner stage (production, no dev deps)
    ports:
      - "8000:8000"
    env_file:
      - .env.production
    environment:
      - APP_DEBUG=false
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

Run production with:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production override removes volume mounts (no hot reload), uses the `runner` target, sets resource limits, and adds `restart: unless-stopped`. The `deploy.resources.limits` section caps CPU and memory usage per container, preventing a runaway process from consuming all host resources. The `replicas: 2` setting runs two instances of the app service for basic redundancy — a load balancer or reverse proxy (e.g., Traefik, nginx) sits in front to distribute traffic.

For real production deployments, consider using Kubernetes or a managed container service (ECS, Cloud Run) instead of docker-compose. Compose is excellent for development and simple single-host deployments, but it lacks the scheduling, auto-scaling, and self-healing capabilities that orchestration platforms provide.

## .dockerignore

Prevent unnecessary files from entering the Docker build context:

```
.git
.github
.venv
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
.env
.env.*
!.env.example
docker-compose*.yml
Dockerfile
*.md
tests/
docs/
.coverage
htmlcov/
node_modules/
```

A good `.dockerignore` speeds up builds and prevents secrets (`.env`) from being copied into images. The Docker build context includes every file in the build directory that is not excluded by `.dockerignore`. Without it, Docker sends the entire project directory (including `.git`, `node_modules`, virtual environments, and test artifacts) to the daemon, dramatically slowing down builds. The `.env` exclusion is especially critical — accidentally including secrets in a Docker image means they persist in every layer of the image history, even if deleted in a later step.

## Environment Variable Management

Never bake secrets into Docker images. Pass them at runtime via:

1. **`.env` files**: For local development only. Never commit `.env` to version control.
2. **`environment` in compose**: For non-sensitive configuration.
3. **Secrets management**: For production, use Docker secrets, Kubernetes secrets, or a vault (HashiCorp Vault, AWS Secrets Manager).

```yaml
# docker-compose.yml — environment variables reference .env file
env_file:
  - .env

# .env.example (committed to repo)
DB_USER=postgres
DB_PASSWORD=changeme
DB_NAME=app_db
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
AUTH_SECRET_KEY=changeme
```

## Health Check Endpoint

Implement a `/health` endpoint that checks all critical dependencies.

```python
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check(session: AsyncSession = Depends(get_session)):
    checks = {}

    # Check database connectivity
    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    # Check Redis connectivity
    try:
        redis = get_redis_client()  # From app state or dependency
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"

    all_healthy = all(v == "healthy" for v in checks.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
    }
```

Register this router without an API version prefix — health checks sit at the root:

```python
app.include_router(health_router)  # Accessible at /health
```

Docker and orchestrators (Kubernetes, ECS) poll this endpoint to determine container health. Return a non-200 status when critical dependencies fail, so the orchestrator can restart the container. Distinguish between liveness and readiness: a liveness check determines whether the process is alive (return 200 if the app can respond at all), while a readiness check determines whether the app can serve traffic (return 200 only if all dependencies are healthy). In Kubernetes, these map to separate probe endpoints; in Docker Compose, a single `/health` endpoint typically serves both purposes.

Keep the health check lightweight — it should complete in under one second. Avoid running expensive queries or operations in the health check path. A simple `SELECT 1` for the database and `PING` for Redis is sufficient to detect connectivity issues without adding load.

## Running Migrations in Docker

Run Alembic migrations as a separate step before starting the app:

```yaml
# docker-compose.yml
services:
  migrate:
    build:
      context: .
      dockerfile: Dockerfile
    command: ["alembic", "upgrade", "head"]
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
```

Run with:

```bash
docker compose run --rm migrate
docker compose up -d app
```

Never run migrations automatically on app startup in production. Separate the migration step to avoid race conditions with multiple app replicas. If two replicas start simultaneously and both attempt to run migrations, they may conflict or produce duplicate operations. Running migrations as a discrete step before scaling up the application ensures exactly-once execution and provides a clear point to verify success before routing traffic to the new version.

In CI/CD pipelines, structure the deployment as: (1) run migrations against the production database, (2) verify migration success, (3) deploy the new application version. If the migration fails, the old application version continues running unaffected.

## Key Rules Summary

1. Use multi-stage builds — builder for dependencies, runner for production runtime.
2. Install dependencies with `uv sync --frozen` for reproducible, fast builds.
3. Run containers as a non-root user.
4. Use `depends_on` with `condition: service_healthy` to ensure dependencies are ready.
5. Mount source code as a volume for hot reload in development only.
6. Never bake secrets into images — use `.env` files, compose environment, or secrets management.
7. Implement a `/health` endpoint that checks database and cache connectivity.
8. Run migrations as a separate step, not on app startup.
9. Consult Context7 for the latest Docker and uvicorn documentation before implementing any pattern.
