/**
 * API Client Module
 * Handles all backend API calls
 */

class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL || CONFIG.API_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Health check
    async health() {
        return this.request('/health');
    }

    // Stream endpoints
    async startStream(symbols) {
        return this.request('/stream/start', {
            method: 'POST',
            body: JSON.stringify({ symbols })
        });
    }

    async stopStream() {
        return this.request('/stream/stop', {
            method: 'POST'
        });
    }

    async getStreamStatus() {
        return this.request('/stream/status');
    }

    async getLatestTicks() {
        return this.request('/stream/latest');
    }

    // Data endpoints
    async getOHLCV(symbol, interval, startTime = null, endTime = null, limit = null) {
        const body = {
            symbol,
            interval,
            start_time: startTime,
            end_time: endTime
        };
        
        if (limit !== null && limit !== 'all') {
            body.limit = parseInt(limit);
        }
        
        return this.request('/data/ohlcv', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async getSummary(symbol, startTime = null, endTime = null) {
        return this.request('/data/summary', {
            method: 'POST',
            body: JSON.stringify({
                symbol,
                interval: '1min',
                start_time: startTime,
                end_time: endTime
            })
        });
    }

    async clearData() {
        return this.request('/data/clear', {
            method: 'DELETE'
        });
    }

    // Analytics endpoints
    async analyzePair(symbol1, symbol2, interval, startTime = null, endTime = null) {
        return this.request('/analytics/pair', {
            method: 'POST',
            body: JSON.stringify({
                symbol1,
                symbol2,
                interval,
                start_time: startTime,
                end_time: endTime
            })
        });
    }

    async getCorrelation(symbols, interval = '1min') {
        return this.request('/analytics/correlation', {
            method: 'POST',
            body: JSON.stringify(symbols)
        });
    }

    // Alert endpoints
    async createAlert(alertData) {
        return this.request('/alerts/', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });
    }

    async getAlerts() {
        return this.request('/alerts/');
    }

    async deleteAlert(alertId) {
        return this.request(`/alerts/${alertId}`, {
            method: 'DELETE'
        });
    }

    async toggleAlert(alertId) {
        return this.request(`/alerts/${alertId}/toggle`, {
            method: 'PATCH'
        });
    }

    // Export endpoints
    downloadOHLCV(symbol, interval, startTime = null, endTime = null) {
        const params = new URLSearchParams({ symbol, interval });
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);
        window.open(`${this.baseURL}/export/ohlcv?${params}`, '_blank');
    }

    downloadTicks(symbol, startTime = null, endTime = null, limit = 10000) {
        const params = new URLSearchParams({ symbol, limit });
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);
        window.open(`${this.baseURL}/export/ticks?${params}`, '_blank');
    }

    downloadAnalyticsTimeSeries(symbol1, symbol2, interval, startTime = null, endTime = null) {
        const params = new URLSearchParams({ symbol1, symbol2, interval });
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);
        window.open(`${this.baseURL}/export/analytics-timeseries?${params}`, '_blank');
    }
}

// Create global API client instance
window.api = new APIClient();
