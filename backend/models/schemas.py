"""
Pydantic Models for Request/Response Validation
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class SymbolsRequest(BaseModel):
    """Request model for symbol list"""
    symbols: List[str]


class DataRequest(BaseModel):
    """Request model for OHLCV data"""
    symbol: str
    interval: str = "1min"
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class TickData(BaseModel):
    """Tick data model"""
    timestamp: str
    symbol: str
    price: float
    size: float
    created_at: float


class OHLCVData(BaseModel):
    """OHLCV data model"""
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class StreamStatus(BaseModel):
    """Streaming status model"""
    running: bool
    symbols: List[str]
    tick_count: int
    buffer_size: int


class AnalyticsSummary(BaseModel):
    """Analytics summary model"""
    symbol: str
    count: int
    mean: float
    std: float
    min: float
    max: float
    start_time: str
    end_time: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: Optional[str] = None
    version: Optional[str] = None


class APIResponse(BaseModel):
    """Generic API response"""
    status: str
    message: Optional[str] = None
    timestamp: str
