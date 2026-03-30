---
name: FastAPI Docker Patterns
description: "This skill provides reference patterns and best practices for Docker in FastAPI projects. It activates automatically when the user asks conceptual questions about Docker patterns, container optimization, base image selection, or deployment strategies — without requesting file generation. For generating Dockerfile and docker-compose files, use the /fastapi:docker command instead."
version: 0.1.0
---

# FastAPI Docker Patterns

Before implementing any Docker or deployment pattern, resolve the latest documentation via Context7. Use `mcp__plugin_context7_context7__resolve-library-id` with query "uvicorn" to get the library ID, then `mcp__plugin_context7_context7__query-docs` with that ID to fetch current configuration options. Also resolve "docker" for any Docker-specific API changes. Container best practices evolve — verify base image tags and configuration options against current docs.

## Patterns Overview

This skill covers multi-stage Dockerfiles, development and production compose files, .dockerignore, environment variable management, health check endpoints, and migration strategies. See `references/examples.md` for complete code examples of every pattern below.

### Multi-Stage Dockerfile
Use a two-stage build: builder (install deps with `uv sync --frozen`) and runner (minimal runtime with non-root user). Produces images under 200MB with no build tools or source control artifacts.

### docker-compose.yml — Development
Volume-mount `./app` for hot reload, target the builder stage for dev deps, use `depends_on` with `condition: service_healthy` for PostgreSQL and Redis readiness.

### docker-compose.prod.yml — Production Override
Target the runner stage, remove volume mounts, set resource limits, add `restart: unless-stopped`, configure replicas.

### .dockerignore
Exclude `.git`, `.venv`, `__pycache__`, `.env`, `tests/`, `docs/` to speed up builds and prevent secrets from entering images.

### Environment Variable Management
Never bake secrets into images. Use `.env` files for local dev, compose `environment` for non-sensitive config, and secrets management (Docker secrets, Vault) for production.

### Health Check Endpoint
Implement `/health` that checks database and Redis connectivity. Register at root (no `/api/v1` prefix). Keep lightweight — under one second.

### Running Migrations
Run Alembic migrations as a separate `docker compose run --rm migrate` step before starting the app. Never run migrations on app startup in production.

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
