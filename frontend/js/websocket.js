/**
 * WebSocket Client Module
 * Real-time analytics streaming
 */

class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.reconnectAttempts = 0;
        this.handlers = {
            analytics: [],
            alerts: [],
            connection: []
        };
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.triggerHandlers('connection', { status: 'connected' });
                
                // Send ping every 30 seconds
                this.pingInterval = setInterval(() => {
                    if (this.ws.readyState === WebSocket.OPEN) {
                        this.send({ type: 'ping' });
                    }
                }, 30000);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.triggerHandlers('connection', { status: 'error', error });
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket closed');
                clearInterval(this.pingInterval);
                this.triggerHandlers('connection', { status: 'disconnected' });
                this.reconnect();
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.reconnect();
        }
    }

    handleMessage(message) {
        console.log('📨 WebSocket message received:', message.type);
        switch (message.type) {
            case 'analytics_update':
                console.log('📊 Analytics update:', {
                    stream_running: message.stream_status?.running,
                    symbols: message.stream_status?.symbols,
                    tick_count: Object.keys(message.latest_ticks || {}).length
                });
                this.triggerHandlers('analytics', {
                    analytics: message.analytics,
                    stream_status: message.stream_status,
                    latest_ticks: message.latest_ticks,
                    timestamp: message.timestamp
                });
                if (message.alerts && message.alerts.length > 0) {
                    this.triggerHandlers('alerts', message.alerts);
                }
                break;
            case 'pong':
                // Keep-alive response
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    reconnect() {
        if (this.reconnectAttempts < 10) {
            setTimeout(() => {
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts + 1})`);
                this.reconnectAttempts++;
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
                this.connect();
            }, this.reconnectDelay);
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    on(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event].push(handler);
        }
    }

    off(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event] = this.handlers[event].filter(h => h !== handler);
        }
    }

    triggerHandlers(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => handler(data));
        }
    }

    disconnect() {
        if (this.ws) {
            clearInterval(this.pingInterval);
            this.ws.close();
            this.ws = null;
        }
    }
}

// Create global WebSocket client
window.wsClient = new WebSocketClient('ws://localhost:8000/ws/analytics');
