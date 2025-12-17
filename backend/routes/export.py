"""
Export Routes
Data export endpoints for CSV downloads
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import io
from utils.database import get_ticks, resample_data

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/ohlcv")
async def export_ohlcv(
    symbol: str,
    interval: str = "1min",
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
):
    """Export OHLCV data as CSV"""
    try:
        ticks = get_ticks(symbol=symbol, start_time=start_time, end_time=end_time)
        
        if ticks.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        ohlcv = resample_data(ticks, interval)
        
        # Convert to CSV
        stream = io.StringIO()
        ohlcv.to_csv(stream, index=False)
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={symbol}_{interval}_ohlcv.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ohlcv")
async def export_ohlcv(
    symbol: str,
    interval: str = "1min",
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
):
    """Export OHLCV data as CSV"""
    try:
        ticks = get_ticks(symbol=symbol, start_time=start_time, end_time=end_time)
        
        if ticks.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        ohlcv = resample_data(ticks, interval)
        
        # Convert to CSV
        stream = io.StringIO()
        ohlcv.to_csv(stream, index=False)
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={symbol}_{interval}_ohlcv.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ticks")
async def export_ticks(
    symbol: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 10000
):
    """Export raw tick data as CSV"""
    try:
        ticks = get_ticks(symbol=symbol, start_time=start_time, end_time=end_time, limit=limit)
        
        if ticks.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Reset index to include timestamp
        ticks_export = ticks.reset_index()
        
        stream = io.StringIO()
        ticks_export.to_csv(stream, index=False)
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={symbol}_ticks.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics-timeseries")
async def export_analytics_timeseries(
    symbol1: str,
    symbol2: str,
    interval: str = "1min",
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
):
    """Export time-series analytics as CSV"""
    try:
        # Get data for both symbols
        ticks1 = get_ticks(symbol=symbol1, start_time=start_time, end_time=end_time)
        ticks2 = get_ticks(symbol=symbol2, start_time=start_time, end_time=end_time)
        
        if ticks1.empty or ticks2.empty:
            raise HTTPException(status_code=404, detail="Insufficient data")
        
        # Resample
        ohlcv1 = resample_data(ticks1, interval)
        ohlcv2 = resample_data(ticks2, interval)
        
        # Merge
        merged = pd.merge(
            ohlcv1[['timestamp', 'close']],
            ohlcv2[['timestamp', 'close']],
            on='timestamp',
            suffixes=('_1', '_2')
        )
        
        if len(merged) < 5:
            raise HTTPException(status_code=400, detail="Not enough aligned data")
        
        # Calculate analytics for each row
        results = []
        
        for i in range(20, len(merged)):  # Start from 20 to have enough history
            window_data = merged.iloc[max(0, i-20):i+1]
            
            prices1 = window_data['close_1']
            prices2 = window_data['close_2']
            
            # Hedge ratio
            beta, alpha, r_squared, p_value = analytics.hedge_ratio_ols(prices1, prices2)
            
            # Spread
            spread = analytics.calculate_spread(prices1, prices2, beta)
            
            # Z-score
            zscore_series = analytics.calculate_zscore(spread, window=min(10, len(spread)))
            current_zscore = float(zscore_series.iloc[-1]) if not zscore_series.empty else None
            
            # Returns and correlation
            returns1 = analytics.calculate_returns(prices1)
            returns2 = analytics.calculate_returns(prices2)
            
            correlation = None
            if len(returns1) > 1 and len(returns2) > 1:
                aligned = pd.DataFrame({'r1': returns1, 'r2': returns2}).dropna()
                if len(aligned) > 1:
                    correlation = float(aligned['r1'].corr(aligned['r2']))
            
            # Volatility
            vol1 = analytics.calculate_volatility(returns1, window=min(10, len(returns1)))
            vol2 = analytics.calculate_volatility(returns2, window=min(10, len(returns2)))
            
            results.append({
                'timestamp': window_data['timestamp'].iloc[-1],
                f'{symbol1}_price': prices1.iloc[-1],
                f'{symbol2}_price': prices2.iloc[-1],
                'hedge_ratio': beta,
                'r_squared': r_squared,
                'spread': spread.iloc[-1] if not spread.empty else None,
                'zscore': current_zscore,
                'correlation': correlation,
                f'{symbol1}_volatility': float(vol1.iloc[-1]) if not vol1.empty else None,
                f'{symbol2}_volatility': float(vol2.iloc[-1]) if not vol2.empty else None
            })
        
        df_export = pd.DataFrame(results)
        
        stream = io.StringIO()
        df_export.to_csv(stream, index=False)
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={symbol1}_{symbol2}_analytics_timeseries.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
