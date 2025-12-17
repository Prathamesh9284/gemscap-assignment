"""
Analytics Routes
Pair trading analytics and correlation analysis endpoints
"""

from fastapi import APIRouter, HTTPException
import pandas as pd
import math
from typing import Dict, Any
from models.schemas import PairAnalyticsRequest, PairAnalyticsResult
from utils.database import get_ticks, resample_data
from utils import analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def safe_float(value) -> float | None:
    """Convert value to float, returning None for NaN/inf"""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


@router.post("/pair", response_model=PairAnalyticsResult)
async def pair_analytics(request: PairAnalyticsRequest):
    """Perform pair trading analysis"""
    try:
        # Get data for both symbols
        symbol1_ticks = get_ticks(
            symbol=request.symbol1,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        symbol2_ticks = get_ticks(
            symbol=request.symbol2,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        if symbol1_ticks.empty or symbol2_ticks.empty:
            raise HTTPException(status_code=404, detail="Insufficient data for one or both symbols")
        
        # Resample to specified interval
        ohlcv1 = resample_data(symbol1_ticks, request.interval)
        ohlcv2 = resample_data(symbol2_ticks, request.interval)
        
        # Merge on timestamp
        merged = pd.merge(
            ohlcv1[['timestamp', 'close']],
            ohlcv2[['timestamp', 'close']],
            on='timestamp',
            suffixes=('_1', '_2')
        )
        
        if len(merged) < 5:
            raise HTTPException(status_code=400, detail=f"Not enough aligned data points. Got {len(merged)}, need at least 5. Try using a larger interval like 15min or 1h.")
        
        # Extract price series
        prices1 = merged['close_1']
        prices2 = merged['close_2']
        
        # Calculate returns
        returns1 = analytics.calculate_returns(prices1)
        returns2 = analytics.calculate_returns(prices2)
        
        # Align returns
        aligned_returns = pd.DataFrame({
            'r1': returns1,
            'r2': returns2
        }).dropna()
        
        # Correlation
        correlation = safe_float(aligned_returns['r1'].corr(aligned_returns['r2']))
        
        # Hedge ratio via OLS
        beta, alpha, r_squared, p_value = analytics.hedge_ratio_ols(prices1, prices2)
        
        # Calculate spread
        spread = analytics.calculate_spread(prices1, prices2, beta)
        
        # Z-score
        zscore_series = analytics.calculate_zscore(spread, window=20)
        current_zscore = safe_float(zscore_series.iloc[-1]) if not zscore_series.empty else None
        
        # ADF test on spread
        adf_stat, adf_pvalue, is_stationary = analytics.adf_test(spread)
        
        # Volatility
        vol1 = analytics.calculate_volatility(returns1, window=20)
        vol2 = analytics.calculate_volatility(returns2, window=20)
        
        current_vol1 = safe_float(vol1.iloc[-1]) if not vol1.empty else None
        current_vol2 = safe_float(vol2.iloc[-1]) if not vol2.empty else None
        
        # Half-life
        halflife = analytics.halflife_mean_reversion(spread)
        
        return PairAnalyticsResult(
            symbol1=request.symbol1,
            symbol2=request.symbol2,
            correlation=correlation,
            hedge_ratio=safe_float(beta),
            r_squared=safe_float(r_squared),
            p_value=safe_float(p_value),
            current_zscore=current_zscore,
            adf_statistic=safe_float(adf_stat),
            adf_pvalue=safe_float(adf_pvalue),
            is_stationary=is_stationary,
            volatility1=current_vol1,
            volatility2=current_vol2,
            halflife=safe_float(halflife),
            data_points=len(merged)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/correlation", response_model=Dict[str, Any])
async def calculate_correlation_matrix(symbols: list[str], interval: str = "1min"):
    """Calculate correlation matrix for multiple symbols"""
    try:
        if len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        # Get data for all symbols
        price_data = {}
        for symbol in symbols:
            ticks = get_ticks(symbol=symbol)
            if not ticks.empty:
                ohlcv = resample_data(ticks, interval)
                price_data[symbol] = ohlcv['close']
        
        if len(price_data) < 2:
            raise HTTPException(status_code=404, detail="Insufficient data for correlation")
        
        # Create DataFrame
        df = pd.DataFrame(price_data)
        
        # Calculate returns
        returns = df.pct_change().dropna()
        
        # Correlation matrix
        corr_matrix = returns.corr()
        
        return {
            "symbols": symbols,
            "correlation_matrix": corr_matrix.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
