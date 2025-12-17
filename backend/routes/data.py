"""
Data Retrieval Routes
OHLCV data and summary statistics endpoints
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, Any, List
from models.schemas import DataRequest, OHLCVData, AnalyticsSummary
from utils.database import get_ticks, resample_data, clear_database
from config import RESAMPLING_INTERVALS

router = APIRouter(prefix="/data", tags=["Data"])


@router.post("/ohlcv", response_model=List[OHLCVData])
async def get_ohlcv(request: DataRequest):
    """Get OHLCV data for a symbol"""
    try:
        # Validate interval
        if request.interval not in RESAMPLING_INTERVALS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid interval. Must be one of {list(RESAMPLING_INTERVALS.keys())}"
            )
        
        # Get tick data
        ticks_df = get_ticks(
            symbol=request.symbol,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        if ticks_df.empty:
            return []
        
        # Resample to OHLCV
        ohlcv_df = resample_data(ticks_df, request.interval)
        
        # Convert to response model
        return [
            OHLCVData(
                timestamp=row['timestamp'],
                open=row['open'],
                high=row['high'],
                low=row['low'],
                close=row['close'],
                volume=row['volume']
            )
            for _, row in ohlcv_df.iterrows()
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary", response_model=AnalyticsSummary)
async def get_summary(request: DataRequest):
    """Get summary statistics for a symbol"""
    try:
        ticks_df = get_ticks(
            symbol=request.symbol,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        if ticks_df.empty:
            raise HTTPException(status_code=404, detail="No data found for symbol")
        
        prices = ticks_df['price']
        
        # Timestamp is the index, not a column
        return AnalyticsSummary(
            symbol=request.symbol,
            count=len(ticks_df),
            mean=float(prices.mean()),
            std=float(prices.std()),
            min=float(prices.min()),
            max=float(prices.max()),
            start_time=str(ticks_df.index.min()),
            end_time=str(ticks_df.index.max())
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug", response_model=Dict[str, Any])
async def debug_data():
    """Debug: Get database info"""
    try:
        import sqlite3
        from config import DB_PATH
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Count total ticks
        cursor.execute("SELECT COUNT(*) FROM ticks")
        total = cursor.fetchone()[0]
        
        # Count by symbol
        cursor.execute("SELECT symbol, COUNT(*) FROM ticks GROUP BY symbol")
        by_symbol = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get latest tick
        cursor.execute("SELECT * FROM ticks ORDER BY id DESC LIMIT 1")
        latest = cursor.fetchone()
        
        conn.close()
        
        return {
            "total_ticks": total,
            "by_symbol": by_symbol,
            "latest_tick": latest,
            "database_path": DB_PATH
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear", response_model=Dict[str, Any])
async def clear_data():
    """Clear all tick data"""
    try:
        clear_database()
        return {
            "status": "success",
            "message": "All tick data cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
