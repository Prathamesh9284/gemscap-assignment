/**
 * Configuration Module
 * Loads environment variables
 */

const CONFIG = {
    API_URL: 'http://localhost:8000',
    DEFAULT_SYMBOLS: ['btcusdt', 'ethusdt'],
    DEFAULT_INTERVAL: '1min',
    REFRESH_INTERVAL: 5000, // ms
    CHART_COLORS: {
        primary: '#2563eb',
        secondary: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#06b6d4',
        dark: '#1f2937',
        light: '#f3f4f6'
    }
};

// Export for use in other modules
window.CONFIG = CONFIG;
