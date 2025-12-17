"""
Configuration Module
Central configuration for the backend
"""

# Database Configuration
DB_PATH = "tick_data.db"
BUFFER_SIZE = 10000

# Resampling Intervals
RESAMPLING_INTERVALS = {
    "1s": "1S",
    "1min": "1min",
    "5min": "5min",
    "15min": "15min",
    "1h": "1H",
    "4h": "4H"
}

# API Configuration
API_TITLE = "Quant Trading Analytics API"
API_DESCRIPTION = "Real-time trading analytics backend"
API_VERSION = "1.0.0"

# Server Configuration
HOST = "0.0.0.0"
PORT = 8000
RELOAD = True
LOG_LEVEL = "info"
