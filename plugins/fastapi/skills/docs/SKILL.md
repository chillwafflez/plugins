---
name: docs
description: "This skill should be used when the user asks to \"preview API docs\", \"open Swagger UI\", \"generate API documentation\", \"fastapi docs\", \"view docs\", \"show OpenAPI spec\", or mentions API documentation, Swagger, ReDoc, or OpenAPI for a FastAPI application."
argument-hint: "preview | generate"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# FastAPI API Documentation

Preview the interactive API documentation or export the OpenAPI specification. This skill supports two sub-commands: `preview` and `generate`. If no argument is provided, prompt the user to choose one.

## Sub-command: `preview`

Open the FastAPI interactive documentation (Swagger UI) in a browser.

### Steps

1. **Detect the application entry point** — Scan for the FastAPI app instance by reading `app/main.py`, `main.py`, or similar. Identify the import path (e.g., `app.main:app`).

2. **Check for a running server** — Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs` to test if a server is already running on port 8000.

3. **Start the server if needed** — If no server is running, start one in the background:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000 &
   ```
   Wait briefly and verify the server is responding before proceeding.

4. **Open the documentation** — Use the appropriate command for the platform:
   ```bash
   # Windows
   start http://localhost:8000/docs

   # macOS
   open http://localhost:8000/docs

   # Linux
   xdg-open http://localhost:8000/docs
   ```

5. **Report available endpoints** — Print a summary:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - Raw OpenAPI JSON: `http://localhost:8000/openapi.json`

### Notes

- If the server fails to start, read the error output and report the issue (missing dependencies, import errors, database connection failures).
- If the app uses a custom docs URL (set via `docs_url` parameter in `FastAPI()`), detect and use that instead.

## Sub-command: `generate`

Export the OpenAPI specification to a file and optionally generate markdown documentation.

### Steps

1. **Detect the application entry point** — Same as the preview sub-command: locate the FastAPI app instance and its import path.

2. **Extract the OpenAPI spec** — Run a Python script that imports the app and dumps its OpenAPI schema:

   ```bash
   uv run python -c "
   import json
   from app.main import app
   spec = app.openapi()
   print(json.dumps(spec, indent=2))
   " > docs/openapi.json
   ```

   Create the `docs/` directory if it does not exist.

3. **Validate the output** — Read the generated file and verify it contains valid JSON with the expected OpenAPI structure (check for `openapi`, `info`, and `paths` keys).

4. **Generate markdown documentation (optional)** — If the user requests markdown docs, generate a `docs/API.md` file from the spec:

   - Extract the API title, version, and description from `info`.
   - Group endpoints by tag.
   - For each endpoint, document:
     - HTTP method and path
     - Summary and description
     - Request parameters (path, query, header)
     - Request body schema (if applicable)
     - Response status codes and schemas
   - Include example request/response bodies where the spec defines them.

   Structure the markdown as:
   ```
   # API Reference — {title}

   Version: {version}

   ## {Tag Name}

   ### {METHOD} {path}

   {description}

   **Parameters:**
   | Name | In | Type | Required | Description |
   |------|----|------|----------|-------------|

   **Request Body:** `{schema_name}`

   **Responses:**
   | Status | Description |
   |--------|-------------|
   ```

5. **Report results** — Print a summary of generated files and their locations:
   - `docs/openapi.json` — Raw OpenAPI specification
   - `docs/API.md` — Markdown API reference (if generated)

### Notes

- If the app has import-time side effects (database connections, external service calls), the extraction script may fail. In that case, fall back to fetching from a running server:
  ```bash
  curl -s http://localhost:8000/openapi.json > docs/openapi.json
  ```
- Suggest the user add `docs/openapi.json` to version control so API changes are visible in pull request diffs.
- Note that FastAPI automatically generates OpenAPI 3.1 specs; verify compatibility if the user needs OpenAPI 3.0.
