"""
WebSocket Route
Real-time analytics streaming via WebSocket
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json
from datetime import datetime
from utils.collector import collector
from .alerts import check_alerts

router = APIRouter(prefix="/ws", tags=["WebSocket"])


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.analytics_task = None
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        
        # Start analytics broadcast if not running
        if self.analytics_task is None or self.analytics_task.done():
            self.analytics_task = asyncio.create_task(self.broadcast_analytics())
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        # Remove disconnected clients
        self.active_connections -= disconnected
    
    async def broadcast_analytics(self):
        """Broadcast analytics updates every 500ms"""
        while self.active_connections:
            try:
                # Get stream status
                stream_status = {
                    "running": collector.running,
                    "symbols": collector.symbols,
                    "tick_count": collector.tick_count,
                    "buffer_size": len(collector.tick_buffer)
                }
                
                # Get latest ticks
                latest_ticks = {
                    symbol: {
                        "timestamp": tick["timestamp"],
                        "symbol": tick["symbol"],
                        "price": tick["price"],
                        "size": tick["size"],
                        "created_at": tick["created_at"]
                    }
                    for symbol, tick in collector.last_ticks.items()
                }
                
                # Check alerts (empty dict since no analytics)
                triggered_alerts = check_alerts({})
                    
                await self.broadcast({
                    "type": "analytics_update",
                    "analytics": {},  # No analytics calculated
                    "alerts": triggered_alerts,
                    "stream_status": stream_status,
                    "latest_ticks": latest_ticks,
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                await asyncio.sleep(0.5)  # 500ms update frequency
                
            except Exception as e:
                print(f"Analytics broadcast error: {e}")
                await asyncio.sleep(1)


manager = ConnectionManager()


@router.websocket("/analytics")
async def websocket_analytics(websocket: WebSocket):
    """WebSocket endpoint for real-time analytics streaming"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive messages from client (for configuration, etc.)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle client messages
            if message.get("type") == "ping":
                await manager.send_personal_message(
                    {"type": "pong", "timestamp": datetime.now().isoformat()},
                    websocket
                )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
