"""
Database Utilities
SQLite database operations
"""

import sqlite3
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from config import DB_PATH, RESAMPLING_INTERVALS


def init_database():
    """Initialize SQLite database for tick storage"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ticks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            symbol TEXT NOT NULL,
            price REAL NOT NULL,
            size REAL NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_symbol_timestamp 
        ON ticks(symbol, timestamp)
    """)
    
    conn.commit()
    conn.close()


def get_ticks(
    symbol: str, 
    start_time: Optional[str] = None, 
    end_time: Optional[str] = None, 
    limit: Optional[int] = None
) -> pd.DataFrame:
    """Retrieve ticks from database"""
    conn = sqlite3.connect(DB_PATH)
    
    # Use UPPER for case-insensitive matching and filter out invalid prices
    query = "SELECT timestamp, symbol, price, size FROM ticks WHERE UPPER(symbol) = UPPER(?) AND price > 0"
    params = [symbol]
    
    if start_time:
        query += " AND timestamp >= ?"
        params.append(start_time)
    
    if end_time:
        query += " AND timestamp <= ?"
        params.append(end_time)
    
    query += " ORDER BY timestamp DESC"
    
    if limit:
        query += f" LIMIT {limit}"
    
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    
    if not df.empty:
        df['timestamp'] = pd.to_datetime(df['timestamp'], format='ISO8601')
        df = df.sort_values('timestamp')
        df.set_index('timestamp', inplace=True)
    
    return df


def resample_data(df: pd.DataFrame, interval: str = '1min') -> pd.DataFrame:
    """Resample tick data to OHLCV"""
    if df.empty:
        return pd.DataFrame()
    
    # Get pandas resample rule
    resample_rule = RESAMPLING_INTERVALS.get(interval, '1T')
    
    # Create OHLCV DataFrame
    resampled = pd.DataFrame()
    resampled['open'] = df['price'].resample(resample_rule).first()
    resampled['high'] = df['price'].resample(resample_rule).max()
    resampled['low'] = df['price'].resample(resample_rule).min()
    resampled['close'] = df['price'].resample(resample_rule).last()
    resampled['volume'] = df['size'].resample(resample_rule).sum()
    
    # Drop rows where any OHLC value is missing (empty periods)
    resampled = resampled.dropna(subset=['open', 'high', 'low', 'close'])
    
    # Reset index to get timestamp as column
    resampled = resampled.reset_index()
    resampled['timestamp'] = resampled['timestamp'].astype(str)
    
    return resampled


def clear_database():
    """Clear all tick data from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ticks")
    conn.commit()
    conn.close()
