"""
WebSocket Data Collector
Handles real-time tick data ingestion from Binance
"""

import websocket
import json
import sqlite3
import threading
import time
from datetime import datetime
from collections import deque
from typing import List
from config import DB_PATH, BUFFER_SIZE


class BinanceTickCollector:
    """Real-time tick data collector from Binance WebSocket"""
    
    def __init__(self):
        self.symbols = []
        self.ws_connections = []
        self.running = False
        self.tick_buffer = deque(maxlen=BUFFER_SIZE)
        self.last_ticks = {}
        self.tick_count = 0
        self.db_lock = threading.Lock()
        
    def normalize_tick(self, raw_data: dict) -> dict:
        """Normalize Binance trade message to standard format"""
        try:
            return {
                'timestamp': datetime.fromtimestamp(raw_data['T'] / 1000).isoformat(),
                'symbol': raw_data['s'].upper(),
                'price': float(raw_data['p']),
                'size': float(raw_data['q']),
                'created_at': time.time()
            }
        except Exception as e:
            print(f"Error normalizing tick: {e}")
            return None
    
    def on_message(self, ws, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            if data.get('e') == 'trade':
                tick = self.normalize_tick(data)
                if tick:
                    self.tick_buffer.append(tick)
                    self.last_ticks[tick['symbol']] = tick
                    self.tick_count += 1
                    
                    # Batch insert every 100 ticks
                    if len(self.tick_buffer) >= 100:
                        self.flush_to_db()
        except Exception as e:
            print(f"WebSocket message error: {e}")
    
    def flush_to_db(self):
        """Flush tick buffer to database"""
        if not self.tick_buffer:
            return
            
        try:
            with self.db_lock:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                ticks_to_insert = list(self.tick_buffer)
                
                cursor.executemany(
                    """INSERT INTO ticks (timestamp, symbol, price, size, created_at)
                       VALUES (?, ?, ?, ?, ?)""",
                    [(t['timestamp'], t['symbol'], t['price'], t['size'], t['created_at']) 
                     for t in ticks_to_insert]
                )
                
                conn.commit()
                conn.close()
                self.tick_buffer.clear()
        except Exception as e:
            print(f"Database flush error: {e}")
    
    def on_error(self, ws, error):
        """Handle WebSocket error"""
        print(f"WebSocket error: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close"""
        pass
    
    def on_open(self, ws):
        """Handle WebSocket open"""
        pass
    
    def start(self, symbols: List[str]):
        """Start WebSocket connections for all symbols"""
        self.symbols = [s.lower().strip() for s in symbols]
        self.running = True
        
        for symbol in self.symbols:
            url = f"wss://fstream.binance.com/ws/{symbol}@trade"
            
            ws = websocket.WebSocketApp(
                url,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close,
                on_open=self.on_open
            )
            
            thread = threading.Thread(target=ws.run_forever, daemon=True)
            thread.start()
            self.ws_connections.append((ws, thread))
    
    def stop(self):
        """Stop all WebSocket connections"""
        self.running = False
        self.flush_to_db()  # Final flush
        
        for ws, _ in self.ws_connections:
            ws.close()
        
        self.ws_connections = []
        self.symbols = []
    
    def reset_stats(self):
        """Reset collector statistics"""
        self.tick_count = 0
        self.tick_buffer.clear()
        self.last_ticks.clear()


# Global collector instance
collector = BinanceTickCollector()
