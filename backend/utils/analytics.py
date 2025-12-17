"""
Analytics Utilities
Statistical calculations for trading pairs
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.regression.linear_model import OLS
from statsmodels.tsa.stattools import adfuller
from typing import Tuple


def calculate_returns(prices: pd.Series) -> pd.Series:
    """Calculate log returns"""
    return np.log(prices / prices.shift(1)).dropna()


def calculate_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    """Calculate rolling volatility"""
    return returns.rolling(window=window).std() * np.sqrt(window)


def hedge_ratio_ols(y: pd.Series, x: pd.Series) -> Tuple[float, float, float, float]:
    """
    Calculate hedge ratio using OLS regression
    Returns: (beta, alpha, r_squared, p_value)
    """
    # Remove NaN values
    df = pd.DataFrame({'y': y, 'x': x}).dropna()
    
    if len(df) < 2:
        return 0.0, 0.0, 0.0, 1.0
    
    # Add constant for intercept
    x_with_const = pd.concat([pd.Series(1, index=df.index, name='const'), df['x']], axis=1)
    
    model = OLS(df['y'], x_with_const)
    results = model.fit()
    
    beta = results.params['x']
    alpha = results.params['const']
    r_squared = results.rsquared
    p_value = results.pvalues['x']
    
    return beta, alpha, r_squared, p_value


def calculate_zscore(spread: pd.Series, window: int = 20) -> pd.Series:
    """Calculate z-score of spread"""
    mean = spread.rolling(window=window).mean()
    std = spread.rolling(window=window).std()
    return (spread - mean) / std


def adf_test(series: pd.Series) -> Tuple[float, float, bool]:
    """
    Augmented Dickey-Fuller test for stationarity
    Returns: (adf_statistic, p_value, is_stationary)
    """
    clean_series = series.dropna()
    
    if len(clean_series) < 10:
        return 0.0, 1.0, False
    
    result = adfuller(clean_series, maxlag=1)
    adf_stat = result[0]
    p_value = result[1]
    is_stationary = p_value < 0.05
    
    return adf_stat, p_value, is_stationary


def calculate_correlation(series1: pd.Series, series2: pd.Series, window: int = 20) -> pd.Series:
    """Calculate rolling correlation"""
    return series1.rolling(window=window).corr(series2)


def calculate_spread(y: pd.Series, x: pd.Series, hedge_ratio: float) -> pd.Series:
    """Calculate spread based on hedge ratio"""
    return y - hedge_ratio * x


def halflife_mean_reversion(spread: pd.Series) -> float:
    """
    Calculate half-life of mean reversion
    """
    spread_lag = spread.shift(1).dropna()
    spread_delta = spread.diff().dropna()
    
    # Align series
    common_idx = spread_lag.index.intersection(spread_delta.index)
    spread_lag = spread_lag.loc[common_idx]
    spread_delta = spread_delta.loc[common_idx]
    
    if len(spread_lag) < 2:
        return np.nan
    
    # Add constant
    x_with_const = pd.concat([
        pd.Series(1, index=common_idx, name='const'),
        spread_lag
    ], axis=1)
    
    model = OLS(spread_delta, x_with_const)
    results = model.fit()
    
    theta = results.params.iloc[1]
    
    if theta >= 0:
        return np.nan
    
    halflife = -np.log(2) / theta
    return halflife


def sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """Calculate Sharpe ratio"""
    if len(returns) == 0 or returns.std() == 0:
        return 0.0
    
    excess_returns = returns - risk_free_rate
    return np.sqrt(252) * excess_returns.mean() / returns.std()
