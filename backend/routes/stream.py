"""
Stream Management Routes
WebSocket stream control endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from models.schemas import SymbolsRequest, StreamStatus, TickData
from utils.collector import collector
from utils.database import init_database

router = APIRouter(prefix="/stream", tags=["Stream"])


@router.post("/start", response_model=Dict[str, Any])
async def start_stream(request: SymbolsRequest):
    """Start WebSocket stream for symbols"""
    try:
        if collector.running:
            raise HTTPException(status_code=400, detail="Stream already running")
        
        if not request.symbols:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        # Initialize database
        init_database()
        
        # Start collector
        collector.start(request.symbols)
        
        return {
            "status": "success",
            "message": f"Stream started for {len(request.symbols)} symbols",
            "symbols": request.symbols
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop", response_model=Dict[str, Any])
async def stop_stream():
    """Stop WebSocket stream"""
    try:
        if not collector.running:
            raise HTTPException(status_code=400, detail="Stream not running")
        
        collector.stop()
        
        return {
            "status": "success",
            "message": "Stream stopped successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=StreamStatus)
async def stream_status():
    """Get current stream status"""
    return StreamStatus(
        running=collector.running,
        symbols=collector.symbols,
        tick_count=collector.tick_count,
        buffer_size=len(collector.tick_buffer)
    )


@router.get("/latest", response_model=Dict[str, TickData])
async def latest_ticks():
    """Get latest tick for each symbol"""
    if not collector.last_ticks:
        return {}
    
    return {
        symbol: TickData(**tick)
        for symbol, tick in collector.last_ticks.items()
    }
