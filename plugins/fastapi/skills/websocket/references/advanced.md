# WebSocket Advanced Patterns

## ConnectionManager Implementation

```python
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections with optional room support."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        # Remove from all rooms
        for room_members in self.rooms.values():
            if websocket in room_members:
                room_members.remove(websocket)

    async def send_personal(self, message: dict, websocket: WebSocket) -> None:
        await websocket.send_json(message)

    async def broadcast(self, message: dict, exclude: WebSocket | None = None) -> None:
        for connection in self.active_connections:
            if connection != exclude:
                await connection.send_json(message)

    # Room-based broadcasting

    def join_room(self, websocket: WebSocket, room: str) -> None:
        if room not in self.rooms:
            self.rooms[room] = []
        if websocket not in self.rooms[room]:
            self.rooms[room].append(websocket)

    def leave_room(self, websocket: WebSocket, room: str) -> None:
        if room in self.rooms:
            self.rooms[room] = [ws for ws in self.rooms[room] if ws != websocket]
            if not self.rooms[room]:
                del self.rooms[room]

    async def broadcast_to_room(
        self, message: dict, room: str, exclude: WebSocket | None = None
    ) -> None:
        for connection in self.rooms.get(room, []):
            if connection != exclude:
                await connection.send_json(message)
```

## Lifespan Integration

Initialize the ConnectionManager in the application lifespan so it is shared across all WebSocket endpoints:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.ws_manager import ConnectionManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ws_manager = ConnectionManager()
    yield
    # Cleanup: close all active connections on shutdown
    for connection in app.state.ws_manager.active_connections:
        await connection.close(code=1001)  # Going away
```

Access the manager in endpoints via `websocket.app.state.ws_manager`:

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/chat/{room_id}")
async def chat_websocket(websocket: WebSocket, room_id: str):
    manager: ConnectionManager = websocket.app.state.ws_manager
    await manager.connect(websocket)
    manager.join_room(websocket, room_id)

    try:
        await manager.broadcast_to_room(
            {"type": "system", "payload": {"message": "A user joined"}},
            room=room_id,
            exclude=websocket,
        )
        while True:
            data = await websocket.receive_json()
            await manager.broadcast_to_room(
                {"type": "message", "payload": data.get("payload", {})},
                room=room_id,
                exclude=websocket,
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_to_room(
            {"type": "system", "payload": {"message": "A user left"}},
            room=room_id,
        )
```

## Authentication via Query Token

Use `WebSocketException` (not `HTTPException`) to reject unauthenticated connections:

```python
from typing import Annotated

from fastapi import Depends, WebSocket, WebSocketException, status
import jwt

from app.core.config import get_settings


async def get_ws_token(websocket: WebSocket) -> str:
    """Extract and validate token from query parameters."""
    token = websocket.query_params.get("token")
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    return token


async def get_ws_current_user(
    token: Annotated[str, Depends(get_ws_token)],
) -> dict:
    """Decode JWT token and return user data."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.auth_secret_key, algorithms=[settings.auth_algorithm]
        )
        return {"user_id": payload["sub"], "email": payload.get("email")}
    except jwt.InvalidTokenError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
```

Use in the WebSocket endpoint with `Annotated`:

```python
from typing import Annotated
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/secure")
async def authenticated_websocket(
    websocket: WebSocket,
    user: Annotated[dict, Depends(get_ws_current_user)],
):
    """WebSocket endpoint requiring valid JWT token."""
    await websocket.accept()
    await websocket.send_json({
        "type": "connected",
        "payload": {"user_id": user["user_id"]},
    })
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({
                "type": "message",
                "payload": {**data.get("payload", {}), "from": user["user_id"]},
            })
    except WebSocketDisconnect:
        pass
```

Client connects with: `ws://localhost:8000/ws/secure?token=<jwt-token>`

## Authentication via Cookie

```python
from typing import Annotated
from fastapi import Cookie, Depends, WebSocket, WebSocketException, status


async def get_ws_cookie_or_token(
    websocket: WebSocket,
    session: Annotated[str | None, Cookie()] = None,
    token: Annotated[str | None, Query()] = None,
) -> str:
    """Accept authentication via session cookie or query token."""
    if session is None and token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    return session or token
```

## Testing WebSocket Endpoints

Use `httpx.AsyncClient` with `ASGITransport` or FastAPI's `TestClient` for WebSocket testing:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.main import create_app


def test_websocket_basic():
    """Synchronous WebSocket test using Starlette TestClient."""
    app = create_app()
    client = TestClient(app)
    with client.websocket_connect("/ws/test-client") as ws:
        ws.send_json({"type": "ping", "payload": {}})
        response = ws.receive_json()
        assert response["type"] == "pong"


def test_websocket_authenticated():
    """Test WebSocket with authentication token."""
    app = create_app()
    client = TestClient(app)
    with client.websocket_connect("/ws/secure?token=valid-test-token") as ws:
        data = ws.receive_json()
        assert data["type"] == "connected"


def test_websocket_rejected_without_token():
    """Test WebSocket rejects unauthenticated connections."""
    app = create_app()
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/secure") as ws:
            pass  # Should not reach here


def test_websocket_broadcast():
    """Test broadcasting to multiple clients."""
    app = create_app()
    client = TestClient(app)
    with client.websocket_connect("/ws/chat/room1") as ws1:
        with client.websocket_connect("/ws/chat/room1") as ws2:
            # ws1 receives join notification for ws2
            join_msg = ws1.receive_json()
            assert join_msg["type"] == "system"

            # ws2 sends a message, ws1 receives the broadcast
            ws2.send_json({"type": "message", "payload": {"text": "hello"}})
            broadcast = ws1.receive_json()
            assert broadcast["type"] == "message"
            assert broadcast["payload"]["text"] == "hello"
```

Note: WebSocket testing uses `starlette.testclient.TestClient` (synchronous) rather than `httpx.AsyncClient`, because `httpx` does not natively support WebSocket connections. The `TestClient.websocket_connect()` method provides a synchronous context manager for WebSocket communication in tests.
