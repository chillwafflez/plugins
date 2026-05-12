# WebSocket Patterns — Code Examples

## Basic WebSocket Endpoint with JSON Handling

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Basic WebSocket endpoint with structured JSON messaging."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type", "unknown")
            payload = data.get("payload", {})

            # Route by message type
            if message_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "payload": {},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            elif message_type == "echo":
                await websocket.send_json({
                    "type": "echo",
                    "payload": payload,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"detail": f"Unknown message type: {message_type}"},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except WebSocketDisconnect:
        pass  # Client disconnected gracefully
```

## Path Parameters and Query Parameters

WebSocket endpoints support path and query parameters like regular routes:

```python
from typing import Annotated
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/rooms/{room_id}")
async def room_websocket(
    websocket: WebSocket,
    room_id: str,
    client_name: Annotated[str | None, Query()] = None,
):
    """WebSocket endpoint with path and query parameters."""
    await websocket.accept()
    name = client_name or f"anonymous-{room_id}"
    await websocket.send_json({
        "type": "connected",
        "payload": {"room": room_id, "name": name},
    })
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({
                "type": "message",
                "payload": {"from": name, "content": data.get("payload", {})},
            })
    except WebSocketDisconnect:
        pass
```

## Error Handling and Graceful Disconnection

```python
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def robust_websocket(websocket: WebSocket):
    """WebSocket endpoint with comprehensive error handling."""
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"detail": "Invalid JSON"},
                })
                continue

            if "type" not in data:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"detail": "Missing 'type' field"},
                })
                continue

            # Process valid message
            await websocket.send_json({
                "type": "ack",
                "payload": {"received_type": data["type"]},
            })

    except WebSocketDisconnect as e:
        logger.info("Client disconnected with code %s", e.code)
    except Exception:
        logger.exception("Unexpected WebSocket error")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011)  # Internal error
```

## Pydantic Message Schemas

```python
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class WSMessage(BaseModel):
    """Incoming WebSocket message envelope."""
    type: str = Field(..., description="Message type identifier")
    payload: dict = Field(default_factory=dict, description="Message data")


class WSResponse(BaseModel):
    """Outgoing WebSocket response envelope."""
    type: str
    payload: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_json(self) -> dict:
        return self.model_dump(mode="json")
```

## Client-Side Connection Example (JavaScript)

For testing or frontend integration:

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/my-client-id");

ws.onopen = () => {
    console.log("Connected");
    ws.send(JSON.stringify({ type: "ping", payload: {} }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received:", data.type, data.payload);
};

ws.onclose = (event) => {
    console.log("Disconnected:", event.code, event.reason);
};

// For authenticated connections:
// const ws = new WebSocket("ws://localhost:8000/ws?token=your-jwt-token");
```
