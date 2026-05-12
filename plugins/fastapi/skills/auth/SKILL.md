---
name: auth
description: "This skill should be used when the user asks to \"set up authentication\", \"add JWT auth\", \"add API key auth\", \"implement role-based access\", \"create auth middleware\", \"add login\", \"secure endpoints\", \"fastapi auth\", or mentions authentication, authorization, JWT tokens, API keys, or RBAC for a FastAPI application."
argument-hint: "jwt | apikey | roles"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# FastAPI Authentication Skill

This skill generates authentication and authorization components for FastAPI applications. It supports JWT token-based auth, API key auth, and role-based access control (RBAC). Each sub-command produces production-ready code that integrates with FastAPI's dependency injection system.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:
1. Call `resolve-library-id` for the relevant library
2. Call `query-docs` with the specific topic
3. Use returned documentation to ensure generated code follows current API patterns

Perform lookups for:
- `fastapi` — security utilities, `Depends`, `OAuth2PasswordBearer`, `APIKeyHeader`
- `pyjwt` — token creation and decoding
- `pwdlib` — password hashing with bcrypt

## Sub-command: `jwt`

Set up JWT authentication with password hashing, token creation, and a current-user dependency.

### Steps

1. **Read the project layout.** Scan the project root for `pyproject.toml`, `app/config.py`, and `.env.example` so generated code aligns with existing structure.

2. **Create `app/core/security.py`.** Include the following functions and dependencies:

   - `hash_password(password: str) -> str` — Hash a plaintext password using `pwdlib` with the bcrypt hasher.
   - `verify_password(plain: str, hashed: str) -> bool` — Verify a plaintext password against a bcrypt hash.
   - `create_access_token(data: dict, expires_delta: timedelta | None = None) -> str` — Build a JWT with an `exp` claim. Read `JWT_SECRET_KEY`, `JWT_ALGORITHM`, and `JWT_EXPIRATION_MINUTES` from settings.
   - `decode_access_token(token: str) -> dict` — Decode and validate a JWT. Raise `HTTPException(401)` on failure.
   - `get_current_user` — An async FastAPI dependency that extracts the token via `OAuth2PasswordBearer(tokenUrl="/auth/login")`, decodes it, and returns the user object or raises 401.

   Use `from pwdlib.hashers.bcrypt import BcryptHasher` for the password hasher instance.

3. **Create `app/core/auth_schemas.py`.** Define Pydantic v2 models:

   - `Token` — Fields: `access_token: str`, `token_type: str = "bearer"`.
   - `TokenData` — Fields: `sub: str | None = None`, `roles: list[str] = []`.
   - `LoginRequest` — Fields: `username: str`, `password: str`.

4. **Update `.env.example`.** Append these variables if they do not already exist:

   ```
   JWT_SECRET_KEY=change-me-to-a-random-secret
   JWT_ALGORITHM=HS256
   JWT_EXPIRATION_MINUTES=30
   ```

5. **Update `pyproject.toml`.** Add `pyjwt` and `pwdlib[bcrypt]` to the `[project.dependencies]` list. Do not duplicate entries that already exist.

6. **Print a summary** listing every file created or modified and a short usage example showing how to protect an endpoint with `Depends(get_current_user)`.

### Generated Code Conventions

- Import settings through the project's existing config module (e.g., `from app.config import settings`).
- Raise `HTTPException` with `status_code=401` and `WWW-Authenticate: Bearer` header on token errors.
- Type-annotate all function signatures.
- Keep the module self-contained; do not import from router files.

---

## Sub-command: `apikey`

Set up API key authentication using FastAPI's `APIKeyHeader` security scheme.

### Steps

1. **Read the project layout.** Locate `app/config.py` and `.env.example`.

2. **Create `app/core/apikey.py`.** Include:

   - An `APIKeyHeader` instance with a configurable header name read from `settings.API_KEY_HEADER_NAME` (default `X-API-Key`).
   - `validate_api_key(api_key: str = Security(api_key_header)) -> str` — An async dependency that compares the provided key against `settings.API_KEYS` (a comma-separated list in the environment). Raise `HTTPException(403)` if the key is missing or invalid.
   - Support both a static list from environment variables and an optional database lookup path (commented out, with instructions).

3. **Update `.env.example`.** Append:

   ```
   API_KEY_HEADER_NAME=X-API-Key
   API_KEYS=your-api-key-here
   ```

4. **Update `app/config.py`.** Add `api_key_header_name` and `api_keys` fields to the settings model if they do not already exist. Parse `api_keys` as a comma-separated string into a list.

5. **Print a summary** with a usage example showing `Depends(validate_api_key)` on a route.

### Generated Code Conventions

- Use `fastapi.security.APIKeyHeader` from FastAPI's security module.
- Use `Security()` instead of `Depends()` for security dependencies so they appear in the OpenAPI security scheme.
- Return the validated API key string from the dependency so downstream code can identify the caller.

---

## Sub-command: `roles`

Add role-based access control on top of an existing authentication setup. This sub-command assumes `get_current_user` (from the `jwt` sub-command or equivalent) is already available.

### Steps

1. **Verify auth exists.** Check for `app/core/security.py` or an equivalent file that exports `get_current_user`. If not found, warn the user and suggest running the `jwt` sub-command first.

2. **Create `app/core/permissions.py`.** Include:

   - `Role` — A `StrEnum` with common roles: `ADMIN`, `EDITOR`, `VIEWER`. Add a comment explaining how to extend it.
   - `require_roles(*roles: str)` — A dependency factory that returns an async dependency. The inner function calls `get_current_user`, reads the user's roles, and raises `HTTPException(403)` if the user does not possess **all** of the required roles.
   - `require_any_role(*roles: str)` — Same pattern but passes if the user has **at least one** of the listed roles.

   Both factories must return a proper FastAPI dependency (a callable, not a coroutine object).

3. **Print a usage example** showing how to protect a route:

   ```python
   from app.core.permissions import require_roles, require_any_role

   @router.get("/admin", dependencies=[Depends(require_roles("admin"))])
   async def admin_dashboard(): ...

   @router.get("/content", dependencies=[Depends(require_any_role("admin", "editor"))])
   async def manage_content(): ...
   ```

4. **Document the role contract.** The user object returned by `get_current_user` must have a `roles` attribute (a list of strings). If the existing user model does not include this field, print instructions for adding it.

### Generated Code Conventions

- Dependency factories return inner async functions, not classes.
- Use `functools.wraps` or clear docstrings on inner functions so OpenAPI docs remain readable.
- Raise 403 Forbidden (not 401) for authorization failures — the user is authenticated but lacks permission.

---

## General Guidelines

- **Idempotency.** Before creating or modifying any file, read its current contents. Do not overwrite existing logic. Append or merge where appropriate.
- **Configuration.** Always read secrets and tunables from environment variables through the project's settings module. Never hard-code secrets.
- **Error handling.** Authentication failures must return proper HTTP status codes (401 for unauthenticated, 403 for unauthorized) with descriptive messages.
- **Type safety.** All public functions must include full type annotations compatible with Python 3.11+.
- **Testing hooks.** Design dependencies so they can be overridden in tests via `app.dependency_overrides`.
- **No interactive prompts.** Do not ask the user for input during execution. Use the argument to determine which sub-command to run. If the argument is missing or unrecognized, print the list of available sub-commands and exit.

## Output Checklist

After completing any sub-command, verify:

- [ ] All created files use absolute imports rooted at `app`.
- [ ] No circular imports exist between new and existing modules.
- [ ] `.env.example` contains every new environment variable with a placeholder value.
- [ ] `pyproject.toml` dependencies are updated (if applicable).
- [ ] A brief usage example is printed to the console.
