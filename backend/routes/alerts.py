"""
Alert Management Routes
User-defined custom alerts for trading signals
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime
import sqlite3
from config import DB_PATH

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# Alert Models
class AlertCondition(BaseModel):
    """Alert condition configuration"""
    metric: str  # zscore, correlation, spread, price, volatility
    operator: str  # gt, lt, gte, lte, eq
    threshold: float
    symbol: Optional[str] = None
    symbol2: Optional[str] = None


class AlertCreate(BaseModel):
    """Create new alert"""
    name: str
    condition: AlertCondition
    enabled: bool = True


class Alert(BaseModel):
    """Alert model"""
    id: int
    name: str
    condition: AlertCondition
    enabled: bool
    created_at: str
    triggered_count: int = 0
    last_triggered: Optional[str] = None


# Initialize alerts table
def init_alerts_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            metric TEXT NOT NULL,
            operator TEXT NOT NULL,
            threshold REAL NOT NULL,
            symbol TEXT,
            symbol2 TEXT,
            enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            triggered_count INTEGER DEFAULT 0,
            last_triggered TEXT
        )
    """)
    conn.commit()
    conn.close()


init_alerts_db()


@router.post("/", response_model=Alert)
async def create_alert(alert: AlertCreate):
    """Create a new alert"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO alerts (name, metric, operator, threshold, symbol, symbol2, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            alert.name,
            alert.condition.metric,
            alert.condition.operator,
            alert.condition.threshold,
            alert.condition.symbol,
            alert.condition.symbol2,
            1 if alert.enabled else 0,
            datetime.now().isoformat()
        ))
        
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return Alert(
            id=alert_id,
            name=alert.name,
            condition=alert.condition,
            enabled=alert.enabled,
            created_at=datetime.now().isoformat(),
            triggered_count=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Alert])
async def get_alerts():
    """Get all alerts"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Use row factory for dict-like access
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        alerts = []
        for row in rows:
            alerts.append(Alert(
                id=row['id'],
                name=row['name'],
                condition=AlertCondition(
                    metric=row['metric'],
                    operator=row['operator'],
                    threshold=row['threshold'],
                    symbol=row['symbol'],
                    symbol2=row['symbol2']
                ),
                enabled=bool(row['enabled']),
                created_at=row['created_at'],
                triggered_count=row['triggered_count'] if row['triggered_count'] else 0,
                last_triggered=row['last_triggered']
            ))
        
        return alerts
    except Exception as e:
        print(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int):
    """Delete an alert"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Alert {alert_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{alert_id}/toggle")
async def toggle_alert(alert_id: int):
    """Toggle alert enabled status"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET enabled = NOT enabled WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Alert {alert_id} toggled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def check_alerts(analytics_data: Dict) -> List[Dict]:
    """Check if any alerts should trigger based on current analytics"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE enabled = 1")
        alerts = cursor.fetchall()
        
        triggered = []
        
        for alert in alerts:
            alert_id, name, metric, operator, threshold = alert[0:5]
            
            # Get metric value from analytics data
            value = analytics_data.get('analytics', {}).get(metric)
            if value is None:
                continue
            
            # Check condition
            should_trigger = False
            if operator == 'gt' and value > threshold:
                should_trigger = True
            elif operator == 'lt' and value < threshold:
                should_trigger = True
            elif operator == 'gte' and value >= threshold:
                should_trigger = True
            elif operator == 'lte' and value <= threshold:
                should_trigger = True
            elif operator == 'eq' and abs(value - threshold) < 0.0001:
                should_trigger = True
            
            if should_trigger:
                # Update trigger count
                cursor.execute("""
                    UPDATE alerts 
                    SET triggered_count = triggered_count + 1,
                        last_triggered = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), alert_id))
                
                triggered.append({
                    "alert_id": alert_id,
                    "name": name,
                    "metric": metric,
                    "value": value,
                    "threshold": threshold,
                    "operator": operator
                })
        
        conn.commit()
        conn.close()
        return triggered
        
    except Exception as e:
        print(f"Error checking alerts: {e}")
        return []
