# 📊 Quantitative Trading Analytics Platform

A real-time cryptocurrency trading analytics platform with WebSocket streaming, OHLCV charting, and statistical analysis capabilities.

## 🎯 Features

- **Real-time Data Streaming**: Live cryptocurrency price data from Binance Futures WebSocket
- **Interactive Charts**: Dynamic candlestick charts with volume bars and live price tracking
- **OHLCV Analysis**: Multi-timeframe OHLCV (Open, High, Low, Close, Volume) data
- **Statistical Analytics**: Mean, standard deviation, min/max, Z-scores, and volatility metrics
- **Custom Alerts**: User-defined price alerts with multiple condition types
- **Data Export**: CSV export for OHLCV data and raw ticks
- **Multi-Symbol Support**: Track multiple cryptocurrencies simultaneously

## 🏗️ Architecture

![Architecture Diagram](assets/ad.png)

### Backend (FastAPI)
- **WebSocket Collector**: Connects to Binance Futures WebSocket streams
- **Database**: SQLite for tick data storage
- **REST API**: FastAPI endpoints for data retrieval and stream control
- **Real-time Broadcasting**: WebSocket server for pushing updates to frontend

### Frontend (Vanilla JavaScript)
- **Plotly.js Charts**: Interactive candlestick and volume charts
- **WebSocket Client**: Real-time data consumption
- **Responsive UI**: Modern, mobile-friendly interface
- **Live Updates**: Charts and statistics update dynamically

## 📋 Methodology

### Data Collection
1. **WebSocket Connection**: Establishes connections to Binance Futures (`wss://fstream.binance.com/ws/{symbol}@trade`)
2. **Trade Stream**: Receives real-time trade executions with price, size, and timestamp
3. **Data Normalization**: Converts Binance format to standardized tick format
4. **Buffer & Storage**: Batches ticks in memory buffer (10,000 capacity) and flushes to SQLite every 100 ticks

### Data Processing
1. **Tick Aggregation**: Raw tick data stored with microsecond precision
2. **OHLCV Resampling**: Pandas-based resampling to multiple timeframes (1s, 1min, 5min, 15min, 1h, 4h)
3. **Statistical Calculations**: Real-time computation of:
   - **Mean & Std Dev**: Rolling statistics for price distribution
   - **Z-Score**: Standardized score for anomaly detection
   - **Min/Max**: Price extremes within the selected period
   - **Volatility**: Standard deviation of returns (annualized)

### Chart Updates
1. **Initial Load**: Fetches historical OHLCV data on chart initialization
2. **Live Price Line**: Horizontal dotted line showing current market price
3. **Throttled Updates**: Chart updates throttled to 100ms to prevent performance issues
4. **Candlestick Preservation**: Historical bars remain stable while live data updates separately

### Analytics
- **Returns Calculation**: Log returns for price changes
- **Correlation Analysis**: Rolling correlation between trading pairs
- **OLS Regression**: Ordinary Least Squares for hedge ratio calculation
- **ADF Test**: Augmented Dickey-Fuller test for stationarity
- **Half-life**: Mean reversion half-life calculation

## 🚀 Setup Instructions

### Prerequisites
- Python 3.9+
- Modern web browser (Chrome, Firefox, Edge)
- Internet connection for Binance WebSocket

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Or use Python directly:
   ```bash
   python -m uvicorn main:app --reload
   ```

5. **Verify backend is running**:
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Start a simple HTTP server**:
   
   **Option 1 - Python**:
   ```bash
   python -m http.server 8080
   ```
   
   **Option 2 - Node.js (if installed)**:
   ```bash
   npx http-server -p 8080
   ```

3. **Open in browser**:
   ```
   http://localhost:8080
   ```

### Quick Start

1. **Start Backend**: Run `uvicorn main:app --reload` in `backend/` directory
2. **Start Frontend**: Run `python -m http.server 8080` in `frontend/` directory
3. **Open Browser**: Navigate to `http://localhost:8080`
4. **Auto-Start**: Platform automatically starts streaming default symbols (BTC, ETH, BNB, SOL, ADA, XRP, DOGE)
5. **Add Symbols**: Use the "Add Symbol" button to track additional cryptocurrencies
6. **Analyze Data**: Switch to "Data Analysis" tab and select a symbol to view charts

## 📦 Dependencies

### Backend
- **fastapi**: Modern async web framework
- **uvicorn**: ASGI server with WebSocket support
- **pandas**: Data manipulation and time-series analysis
- **numpy**: Numerical computing
- **scipy**: Scientific computing and statistics
- **statsmodels**: Statistical models (OLS, ADF test)
- **websocket-client**: Binance WebSocket client
- **pydantic**: Data validation
- **sqlite3**: Built-in database (no installation needed)

### Frontend
- **Plotly.js**: Charting library (loaded via CDN)
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: Responsive design

## 📊 Analytics Explained

### Real-time Metrics

1. **Current Price**: Latest trade price from Binance WebSocket
2. **% Change**: Percentage change from mean price
3. **Z-Score**: Number of standard deviations from mean (|Z| > 2 indicates anomaly)
4. **Distance from Mean**: Absolute price difference from average

### Summary Statistics

- **Mean Price**: Average price over selected period
- **Std Dev**: Standard deviation (volatility measure)
- **Min/Max Price**: Price extremes in the dataset

### OHLCV Components

- **Open**: First price in the time interval
- **High**: Highest price in the time interval
- **Low**: Lowest price in the time interval
- **Close**: Last price in the time interval
- **Volume**: Total trading volume (size) in the interval

### Chart Features

- **Candlestick Bars**: Green (price up) / Red (price down)
- **Volume Bars**: Trading volume with matching colors
- **Live Price Line**: Orange dotted line showing current market price
- **Zoom & Pan**: Interactive chart controls
- **Hover Details**: Price and volume information on hover

## 🔔 Alert System

Create custom alerts based on:
- **Price**: Absolute price thresholds
- **Z-Score**: Statistical anomaly detection
- **Volatility**: Standard deviation thresholds
- **Custom Metrics**: Extensible alert conditions

Operators: `>`, `<`, `>=`, `<=`, `==`

## 💾 Data Export

Export data in CSV format:
- **OHLCV Data**: Resampled candlestick data
- **Raw Ticks**: Individual trade executions
- **Time-Series Analytics**: Statistical metrics over time

## 🛠️ API Endpoints

### Stream Management
- `POST /stream/start` - Start WebSocket stream
- `POST /stream/stop` - Stop WebSocket stream
- `GET /stream/status` - Get stream status
- `GET /stream/latest` - Get latest ticks

### Data Retrieval
- `POST /data/ohlcv` - Get OHLCV data
- `POST /data/summary` - Get summary statistics
- `GET /data/debug` - Debug database info

### WebSocket
- `WS /ws/analytics` - Real-time analytics stream

### Alerts
- `POST /alerts/` - Create alert
- `GET /alerts/` - List all alerts
- `DELETE /alerts/{id}` - Delete alert
- `PATCH /alerts/{id}/toggle` - Toggle alert

### Export
- `GET /export/ohlcv` - Export OHLCV CSV
- `GET /export/ticks` - Export raw ticks CSV

## 📁 Project Structure

```
quant_developer/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── requirements.txt     # Python dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── stream.py        # Stream control endpoints
│   │   ├── data.py          # Data retrieval endpoints
│   │   ├── websocket.py     # WebSocket server
│   │   ├── alerts.py        # Alert management
│   │   ├── export.py        # Data export
│   │   └── analytics.py     # Advanced analytics
│   └── utils/
│       ├── __init__.py
│       ├── collector.py     # Binance WebSocket collector
│       ├── database.py      # SQLite operations
│       └── analytics.py     # Statistical functions
├── frontend/
│   ├── index.html           # Main HTML file
│   ├── css/
│   │   └── style.css        # Styles
│   └── js/
│       ├── config.js        # Frontend configuration
│       ├── api.js           # API client
│       ├── charts.js        # Plotly chart rendering
│       ├── websocket.js     # WebSocket client
│       └── app.js           # Main application logic
└── README.md                # This file
```

## 🔧 Configuration

### Backend Configuration (`backend/config.py`)
- `DB_PATH`: SQLite database file path
- `BUFFER_SIZE`: Tick buffer size (default: 10,000)
- `RESAMPLING_INTERVALS`: Available timeframes
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Frontend Configuration (`frontend/js/config.js`)
- `API_URL`: Backend API URL
- `DEFAULT_SYMBOLS`: Auto-start symbols
- `DEFAULT_INTERVAL`: Default chart timeframe
- `REFRESH_INTERVAL`: UI refresh rate
