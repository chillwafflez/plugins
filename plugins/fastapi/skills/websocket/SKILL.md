---
name: websocket
description: "This skill should be used when the user asks to \"create a WebSocket endpoint\", \"add WebSocket support\", \"implement real-time communication\", \"WebSocket broadcasting\", \"WebSocket authentication\", \"fastapi websocket\", or mentions WebSocket, real-time, chat, live updates, or bidirectional communication in a FastAPI context."
argument-hint: "basic | broadcast | authenticated"
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

# Generate FastAPI WebSocket Endpoints

Generate production-ready WebSocket endpoints for real-time bidirectional communication. Each sub-command scaffolds files that follow async-first patterns, proper connection lifecycle management, and structured JSON message protocols.

## Context7 Documentation Lookup (Mandatory)

Before generating any code, use Context7 to fetch current API references:

1. Call `resolve-library-id` for:
   - **FastAPI** — always required (WebSocket class, WebSocketException, WebSocketDisconnect)
   - **Starlette** — required for low-level WebSocket API and status codes

2. Call `query-docs` with specific topics:
   - For basic endpoints: query "FastAPI WebSocket endpoint accept receive send"
   - For broadcast: query "FastAPI WebSocket connection manager broadcasting"
   - For authenticated: query "FastAPI WebSocket dependencies authentication WebSocketException"

3. If Context7 returns patterns different from those described below, prefer the Context7 results.

## Sub-Commands

Parse the first positional argument to determine which sub-command to execute. If no argument is provided, default to `basic`.

### `basic` — Single WebSocket Endpoint

Generate a WebSocket endpoint with JSON message handling, error handling, and graceful disconnection.

#### Files Created

- **`app/domains/{name}/ws.py`** — WebSocket endpoint with:
  - `@router.websocket("/ws")` decorator
  - `await websocket.accept()` on connection
  - Receive loop using `websocket.receive_json()` for structured messages
  - Send responses via `websocket.send_json()`
  - `try/except WebSocketDisconnect` for graceful disconnect handling
  - JSON message protocol: `{"type": "...", "payload": {...}}`

- **`app/domains/{name}/ws_schemas.py`** — Pydantic models for WebSocket messages:
  - `WSMessage` — Base message with `type: str` and `payload: dict`
  - `WSResponse` — Response message with `type`, `payload`, and `timestamp`

Auto-register the WebSocket router in `app/main.py`.

### `broadcast` — Connection Manager with Broadcasting

Generate a ConnectionManager class and a broadcast-capable WebSocket endpoint.

#### Files Created

- **`app/core/ws_manager.py`** — `ConnectionManager` class with:
  - `connect(websocket)` — Accept and track connection
  - `disconnect(websocket)` — Remove from active connections
  - `send_personal(message, websocket)` — Send to a single client
  - `broadcast(message)` — Send to all connected clients
  - Optional room support: `join_room(websocket, room)`, `leave_room(websocket, room)`, `broadcast_to_room(message, room)`

- **`app/domains/{name}/ws.py`** — WebSocket endpoint using the manager:
  - Inject `ConnectionManager` via `app.state` (initialized in lifespan)
  - Register connection on accept, unregister on disconnect
  - Route messages by `type` field to appropriate handlers
  - Broadcast messages to all or room-specific clients

- **`app/domains/{name}/ws_schemas.py`** — Message schemas (same as basic, plus room-related types)

Auto-register the WebSocket router and add `ConnectionManager` to lifespan.

### `authenticated` — WebSocket with Auth

Generate a WebSocket endpoint with dependency-based authentication.

#### Files Created

- **`app/domains/{name}/ws.py`** — Authenticated WebSocket endpoint with:
  - Dependency function extracting token from query parameter or cookie
  - Validation using `WebSocketException(code=status.WS_1008_POLICY_VIOLATION)` on auth failure
  - `Annotated` type hints for dependency injection: `token: Annotated[str, Depends(get_ws_token)]`
  - Connection accepted only after successful authentication

- **`app/domains/{name}/ws_deps.py`** — WebSocket-specific dependencies:
  - `get_ws_token(websocket: WebSocket)` — Extract token from `websocket.query_params` or `websocket.headers`
  - `get_ws_current_user(token: str)` — Validate token and return user

- **`app/domains/{name}/ws_schemas.py`** — Message schemas (same as basic)

Auto-register the WebSocket router in `app/main.py`.

## Key Patterns

### WebSocket Endpoint Signature

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "echo", "payload": data})
    except WebSocketDisconnect:
        pass  # Client disconnected gracefully
```

### JSON Message Protocol

Standardize all WebSocket messages with a consistent envelope:

```python
{"type": "message_type", "payload": {"key": "value"}}
```

Route incoming messages by `type` to handler functions. Return responses in the same format with an added `timestamp` field.

### Error Handling

- Catch `WebSocketDisconnect` for graceful client disconnection
- Use `WebSocketException` (not `HTTPException`) for rejecting connections
- Wrap the receive loop in try/except to handle malformed JSON and unexpected disconnects
- Clean up resources (remove from manager, close DB sessions) in the except/finally block

### Authentication

Use `WebSocketException` with WebSocket-specific close codes — never `HTTPException`:

```python
from fastapi import WebSocket, WebSocketException, status

async def get_ws_token(websocket: WebSocket) -> str:
    token = websocket.query_params.get("token")
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    return token
```

See `references/patterns.md` for complete code examples and `references/advanced.md` for ConnectionManager implementation, room-based broadcasting, auth patterns, and testing strategies.

## Auto-Registration

When generating a WebSocket endpoint, register it in `app/main.py`:

1. Read `app/main.py` and locate existing `include_router` calls.
2. Add the WebSocket router import and registration:
   ```python
   from app.domains.{name}.ws import router as {name}_ws_router
   app.include_router({name}_ws_router)
   ```
3. For broadcast sub-command, also add ConnectionManager to lifespan:
   ```python
   from app.core.ws_manager import ConnectionManager
   # In lifespan:
   app.state.ws_manager = ConnectionManager()
   ```
4. Use the Edit tool — never overwrite the entire `main.py`.

## Generation Workflow

1. **Parse arguments.** Extract sub-command (`basic`, `broadcast`, `authenticated`) and name. Default to `basic` if no sub-command given.
2. **Fetch documentation from Context7.** Resolve FastAPI and Starlette library IDs. Query docs for WebSocket patterns relevant to the sub-command.
3. **Scan the existing project.** Check for existing WebSocket endpoints, ConnectionManager, auth dependencies. Match existing conventions.
4. **Generate files.** Create each file using the Write tool.
5. **Auto-register.** Edit `app/main.py` to include the WebSocket router and any lifespan resources.
6. **Print summary.** List created/modified files and next steps (e.g., implement message handlers, add client-side WebSocket code, configure CORS for WebSocket).
