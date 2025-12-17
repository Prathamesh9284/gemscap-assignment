/**
 * Main Application
 * UI event handlers and state management
 */

class TradingApp {
    constructor() {
        this.streamInterval = null;
        this.ticksInterval = null;
        this.alerts = [];
        this.chartRefreshInterval = null;
        this.availableSymbols = [];
        this.dropdownsInitialized = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.checkAPIHealth();
        this.setupWebSocket();
        this.loadAlerts();
        this.autoStartStream();
    }

    // Auto-start stream with default symbols
    async autoStartStream() {
        // Wait a bit for backend to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const defaultSymbols = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'adausdt', 'xrpusdt', 'dogeusdt'];
        try {
            const status = await api.getStreamStatus();
            
            // Stop existing stream if running with different symbols
            if (status.running) {
                console.log('Stopping existing stream to restart with new symbols...');
                await api.stopStream();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Start stream with all default symbols
            await api.startStream(defaultSymbols);
            console.log('Stream started with 8 symbols:', defaultSymbols);
            
            // Immediately populate dropdowns with default symbols
            this.updateSymbolDropdowns(defaultSymbols);
            console.log('✅ Symbol dropdowns populated with:', defaultSymbols);
        } catch (error) {
            console.error('Failed to auto-start stream:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Export buttons
        const exportOHLCVBtn = document.getElementById('exportOHLCVBtn');
        if (exportOHLCVBtn) exportOHLCVBtn.addEventListener('click', () => this.exportOHLCV());
        
        // Add symbol button
        const addSymbolBtn = document.getElementById('addSymbolBtn');
        if (addSymbolBtn) addSymbolBtn.addEventListener('click', () => this.addSymbol());
        
        // Enter key on symbol input
        const newSymbolInput = document.getElementById('newSymbolInput');
        if (newSymbolInput) {
            newSymbolInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addSymbol();
            });
        }
        
        // Alert dialog buttons
        const viewAlertsBtn = document.getElementById('viewAlertsBtn');
        const createAlertBtn = document.getElementById('createAlertBtn');
        const saveAlertBtn = document.getElementById('saveAlertBtn');
        const closeViewAlertsBtn = document.getElementById('closeViewAlertsBtn');
        const cancelCreateAlertBtn = document.getElementById('cancelCreateAlertBtn');
        
        if (viewAlertsBtn) viewAlertsBtn.addEventListener('click', () => this.openViewAlertsDialog());
        if (createAlertBtn) createAlertBtn.addEventListener('click', () => this.openCreateAlertDialog());
        if (saveAlertBtn) saveAlertBtn.addEventListener('click', () => this.saveAlert());
        if (closeViewAlertsBtn) closeViewAlertsBtn.addEventListener('click', () => this.closeViewAlertsDialog());
        if (cancelCreateAlertBtn) cancelCreateAlertBtn.addEventListener('click', () => this.closeCreateAlertDialog());
        
        // Dropdown change listeners - auto-load chart when any dropdown changes
        const dataSymbol = document.getElementById('dataSymbol');
        const dataInterval = document.getElementById('dataInterval');
        
        if (dataSymbol) {
            dataSymbol.addEventListener('change', () => {
                if (dataSymbol.value) {
                    this.loadChartData();
                }
            });
        }
        
        if (dataInterval) {
            dataInterval.addEventListener('change', () => {
                const symbol = document.getElementById('dataSymbol');
                if (symbol && symbol.value) {
                    this.loadChartData();
                }
            });
        }
    }

    // Setup tab navigation
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Remove active class from all
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to selected
                btn.classList.add('active');
                document.getElementById(`${tabName}Tab`).classList.add('active');
            });
        });
    }

    // Check API health
    async checkAPIHealth() {
        try {
            const response = await api.health();
            this.updateAPIStatus(true);
            this.showToast('✅ Connected to backend', 'success');
        } catch (error) {
            this.updateAPIStatus(false);
            this.showToast('❌ Backend not available', 'error');
        }
    }

    // Update API status indicator
    updateAPIStatus(isOnline) {
        const statusDot = document.getElementById('apiStatus');
        const statusText = document.getElementById('apiStatusText');

        if (isOnline) {
            statusDot.classList.remove('offline');
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.remove('online');
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }

    // Polling removed - WebSocket handles real-time updates

    // Update stream statistics
    updateStreamStats(status) {
        // Safely update elements if they exist (they're commented out in HTML)
        const streamStatus = document.getElementById('streamStatus');
        const tickCount = document.getElementById('tickCount');
        const bufferSize = document.getElementById('bufferSize');
        const activeSymbols = document.getElementById('activeSymbols');
        
        if (streamStatus) streamStatus.textContent = status.running ? '🟢 Running' : '🔴 Stopped';
        if (tickCount) tickCount.textContent = status.tick_count.toLocaleString();
        if (bufferSize) bufferSize.textContent = status.buffer_size;
        if (activeSymbols) activeSymbols.textContent = status.symbols.join(', ') || '-';
        
        // Log to console instead
        console.log('📊 Stream Status:', {
            running: status.running,
            symbols: status.symbols,
            ticks: status.tick_count,
            buffer: status.buffer_size
        });
    }

    // Update latest ticks display
    updateLatestTicks(ticks) {
        const container = document.getElementById('latestTicksList');
        
        // Store ticks data for chart updates
        this.latestTicksData = ticks;
        
        // Debug logging
        console.log('📡 WebSocket tick update received:', Object.keys(ticks).length, 'symbols');
        
        if (Object.keys(ticks).length === 0) {
            container.innerHTML = '<p class="no-data">⏳ Waiting for tick data...</p>';
            return;
        }

        // Update live price line on chart if symbol matches
        const dataSymbol = document.getElementById('dataSymbol');
        if (dataSymbol && dataSymbol.value && Charts.currentSymbol) {
            // Match symbol case-insensitively
            const currentSymbolUpper = Charts.currentSymbol.toUpperCase();
            const tickData = ticks[currentSymbolUpper] || ticks[Charts.currentSymbol.toLowerCase()];
            
            if (tickData) {
                const livePrice = parseFloat(tickData.price);
                console.log(`📊 Updating chart for ${Charts.currentSymbol}: $${livePrice.toFixed(2)}`);
                
                // Update live price line
                Charts.updateLivePrice('ohlcvChart', livePrice);
                
                // Update live price in statistics
                this.updateLiveStatPrice(Charts.currentSymbol, livePrice);
                
                // Update the last candlestick bar with current price
                Charts.updateLastBar('ohlcvChart', livePrice);
            } else {
                console.log(`⚠️ No tick data for chart symbol ${Charts.currentSymbol}`);            
            }
        }

        container.innerHTML = Object.entries(ticks).map(([symbol, tick]) => {
            const price = parseFloat(tick.price);
            const priceChange = this.getPriceChange(symbol, price);
            const changeClass = priceChange > 0 ? 'price-up' : priceChange < 0 ? 'price-down' : '';
            const arrow = priceChange > 0 ? '▲' : priceChange < 0 ? '▼' : '';
            
            return `
                <div class="tick-card ${changeClass}">
                    <div class="tick-header">
                        <div class="tick-symbol">${symbol.toUpperCase()}</div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <div class="price-change">${arrow}</div>
                            <button onclick="app.removeSymbol('${symbol}')" class="remove-symbol-btn" title="Remove ${symbol.toUpperCase()}">×</button>
                        </div>
                    </div>
                    <div class="tick-price">$${price.toFixed(2)}</div>
                    <div class="tick-details">
                        <span>Vol: ${parseFloat(tick.size).toFixed(4)}</span>
                        <span class="tick-time">${new Date(tick.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Track price changes for visual feedback
    getPriceChange(symbol, currentPrice) {
        if (!this.lastPrices) this.lastPrices = {};
        const lastPrice = this.lastPrices[symbol] || currentPrice;
        this.lastPrices[symbol] = currentPrice;
        return currentPrice - lastPrice;
    }

    // Load chart data
    async loadChartData() {
        const symbol = document.getElementById('dataSymbol').value;
        const interval = document.getElementById('dataInterval').value;

        if (!symbol) {
            return;
        }

        try {
            this.showToast('⏳ Loading data...', 'info');

            const [ohlcvData, summaryData] = await Promise.all([
                api.getOHLCV(symbol, interval),
                api.getSummary(symbol)
            ]);

            if (ohlcvData.length === 0) {
                this.showToast('⚠️ No data available for this symbol', 'warning');
                Charts.clearChart('ohlcvChart');
                return;
            }

            // Get current live price from WebSocket if available, otherwise use last close
            let livePrice = null;
            if (this.latestTicksData && this.latestTicksData[symbol]) {
                livePrice = parseFloat(this.latestTicksData[symbol].price);
            } else if (ohlcvData.length > 0) {
                // Use the last close price if WebSocket data not available yet
                livePrice = ohlcvData[ohlcvData.length - 1].close;
            }

            // Render chart with live price
            Charts.currentSymbol = symbol;
            Charts.renderOHLCV('ohlcvChart', ohlcvData, livePrice);

            // Display summary and set initial live price
            this.displaySummary(summaryData);
            
            // Set initial current price in stats (always set it)
            if (livePrice !== null) {
                this.updateLiveStatPrice(symbol, livePrice);
            }
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Display summary statistics
    displaySummary(data) {
        const summarySection = document.getElementById('summarySection');
        const statsGrid = document.getElementById('statsGrid');
        
        // Store summary data for live calculations
        this.summaryData = data;

        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Current Price</div>
                <div class="stat-value" id="liveStatPrice" style="color: #f59e0b; font-weight: 600;">$0.00</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">% Change</div>
                <div class="stat-value" id="livePercentChange" style="font-weight: 600;">0.00%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Z-Score</div>
                <div class="stat-value" id="liveZScore">0.00</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Distance from Mean</div>
                <div class="stat-value" id="liveDistanceMean">$0.00</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Mean Price</div>
                <div class="stat-value" id="liveMeanPrice">$${data.mean.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Std Dev</div>
                <div class="stat-value" id="liveStdDev">${data.std.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Min Price</div>
                <div class="stat-value" id="liveMinPrice">$${data.min.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Max Price</div>
                <div class="stat-value" id="liveMaxPrice">$${data.max.toFixed(2)}</div>
            </div>
        `;

        summarySection.style.display = 'block';
    }

    // Update live price in statistics
    updateLiveStatPrice(symbol, price) {
        const liveStatPrice = document.getElementById('liveStatPrice');
        if (liveStatPrice) {
            liveStatPrice.textContent = `$${price.toFixed(2)}`;
        }
        
        // Recalculate all statistics from current chart data
        if (Charts.currentData && Charts.currentData.length > 0) {
            const prices = Charts.currentData.map(d => d.close);
            
            // Calculate mean
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            // Calculate standard deviation
            const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
            const std = Math.sqrt(variance);
            
            // Find min and max
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            
            // Update all stat displays
            const meanPriceEl = document.getElementById('liveMeanPrice');
            if (meanPriceEl) meanPriceEl.textContent = `$${mean.toFixed(2)}`;
            
            const stdDevEl = document.getElementById('liveStdDev');
            if (stdDevEl) stdDevEl.textContent = std.toFixed(2);
            
            const minPriceEl = document.getElementById('liveMinPrice');
            if (minPriceEl) minPriceEl.textContent = `$${min.toFixed(2)}`;
            
            const maxPriceEl = document.getElementById('liveMaxPrice');
            if (maxPriceEl) maxPriceEl.textContent = `$${max.toFixed(2)}`;
            
            // Calculate % change from mean
            const percentChange = ((price - mean) / mean) * 100;
            const percentChangeEl = document.getElementById('livePercentChange');
            if (percentChangeEl) {
                percentChangeEl.textContent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;
                percentChangeEl.style.color = percentChange >= 0 ? '#26a69a' : '#ef5350';
            }
            
            // Calculate Z-Score
            const zScore = (price - mean) / std;
            const zScoreEl = document.getElementById('liveZScore');
            if (zScoreEl) {
                zScoreEl.textContent = zScore.toFixed(3);
                zScoreEl.style.color = Math.abs(zScore) > 2 ? '#ef5350' : '#6b7280';
            }
            
            // Calculate distance from mean
            const distanceMean = price - mean;
            const distanceMeanEl = document.getElementById('liveDistanceMean');
            if (distanceMeanEl) {
                distanceMeanEl.textContent = `${distanceMean >= 0 ? '+' : ''}$${distanceMean.toFixed(2)}`;
                distanceMeanEl.style.color = distanceMean >= 0 ? '#26a69a' : '#ef5350';
            }
        }
    }

    // Setup WebSocket connection
    setupWebSocket() {
        if (!wsClient) return;
        
        wsClient.on('analytics', (data) => {
            // Update stream status from WebSocket
            if (data.stream_status) {
                this.updateStreamStats(data.stream_status);
                // Update symbol dropdowns
                if (data.stream_status.symbols) {
                    this.updateSymbolDropdowns(data.stream_status.symbols);
                }
            }
            // Update latest ticks from WebSocket
            if (data.latest_ticks) {
                this.updateLatestTicks(data.latest_ticks);
            }
        });
        wsClient.on('alerts', (alerts) => this.handleTriggeredAlerts(alerts));
        wsClient.on('connection', (status) => {
            const liveIndicator = document.getElementById('liveIndicator');
            if (status.status === 'connected' && liveIndicator) {
                liveIndicator.style.display = 'inline-flex';
            } else if (status.status === 'disconnected' && liveIndicator) {
                liveIndicator.style.display = 'none';
            }
        });
        
        wsClient.connect();
    }

    // Handle triggered alerts
    handleTriggeredAlerts(alerts) {
        const container = document.getElementById('triggeredAlerts');
        if (!container || alerts.length === 0) return;
        
        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'triggered-alert';
            alertDiv.innerHTML = `
                <strong>🔔 ${alert.name}</strong><br>
                ${alert.metric} = ${alert.value.toFixed(4)} (${alert.operator} ${alert.threshold})
            `;
            container.insertBefore(alertDiv, container.firstChild);
            
            // Show toast
            this.showToast(`⚠️ Alert: ${alert.name}`, 'warning');
            
            // Remove after 10 seconds
            setTimeout(() => alertDiv.remove(), 10000);
        });
    }

    // Create alert
    async createAlert() {
        const name = document.getElementById('alertName').value.trim();
        const symbol = document.getElementById('alertSymbol').value;
        const metric = document.getElementById('alertMetric').value;
        const operator = document.getElementById('alertOperator').value;
        const threshold = parseFloat(document.getElementById('alertThreshold').value);
        
        if (!name || !symbol || isNaN(threshold)) {
            this.showToast('⚠️ Please fill all required fields', 'warning');
            return;
        }
        
        try {
            const alert = await api.createAlert({
                name,
                condition: { 
                    metric, 
                    operator, 
                    threshold,
                    symbol,
                    symbol2: null
                },
                enabled: true
            });
            
            this.showToast('✅ Alert created', 'success');
            await this.loadAlerts();
            
            // Clear form
            document.getElementById('alertName').value = '';
            document.getElementById('alertSymbol').value = '';
            document.getElementById('alertThreshold').value = '';
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Load alerts
    async loadAlerts() {
        try {
            this.alerts = await api.getAlerts();
            console.log('📋 Loaded alerts:', this.alerts);
            this.renderAlerts();
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    }

    // Render alerts list
    renderAlerts() {
        const container = document.getElementById('alertsList');
        console.log('📋 Rendering alerts, container:', container, 'alerts:', this.alerts);
        if (!container) return;
        
        if (this.alerts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 24px;">No alerts configured</p>';
            return;
        }
        
        container.innerHTML = this.alerts.map(alert => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${alert.name}</h4>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">${alert.condition.metric} ${alert.condition.operator} ${alert.condition.threshold}</p>
                    <small style="font-size: 11px; color: #9ca3af;">Triggered ${alert.triggered_count} times</small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button style="background: none; border: none; cursor: pointer; font-size: 20px; padding: 4px;" onclick="app.toggleAlert(${alert.id})" title="Toggle">
                        ${alert.enabled ? '🔔' : '🔕'}
                    </button>
                    <button style="background: none; border: none; cursor: pointer; font-size: 20px; padding: 4px;" onclick="app.deleteAlert(${alert.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Toggle alert
    async toggleAlert(alertId) {
        try {
            await api.toggleAlert(alertId);
            await this.loadAlerts();
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Delete alert
    async deleteAlert(alertId) {
        if (!confirm('Delete this alert?')) return;
        
        try {
            await api.deleteAlert(alertId);
            await this.loadAlerts();
            this.showToast('✅ Alert deleted', 'success');
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Export OHLCV
    exportOHLCV() {
        const symbol = document.getElementById('dataSymbol').value.trim().toLowerCase();
        const interval = document.getElementById('dataInterval').value;
        
        if (!symbol) {
            this.showToast('⚠️ Please enter a symbol', 'warning');
            return;
        }
        
        api.downloadOHLCV(symbol, interval);
        this.showToast('📥 Downloading CSV...', 'info');
    }

    // Add new symbol to stream
    async addSymbol() {
        const input = document.getElementById('newSymbolInput');
        const symbol = input.value.trim().toLowerCase();
        
        if (!symbol) {
            this.showToast('⚠️ Please enter a symbol', 'warning');
            return;
        }
        
        // Validate format (should end with usdt)
        if (!symbol.endsWith('usdt')) {
            this.showToast('⚠️ Symbol should end with "usdt" (e.g., solusdt)', 'warning');
            return;
        }
        
        try {
            // Get current status
            const status = await api.getStreamStatus();
            
            // Check if symbol already exists
            if (status.symbols.includes(symbol)) {
                this.showToast('⚠️ Symbol already being tracked', 'warning');
                return;
            }
            
            // Add new symbol
            const allSymbols = [...status.symbols, symbol];
            
            // Restart stream with all symbols
            if (status.running) {
                await api.stopStream();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            await api.startStream(allSymbols);
            
            this.showToast(`✅ Added ${symbol.toUpperCase()}`, 'success');
            input.value = ''; // Clear input
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Remove symbol from stream
    async removeSymbol(symbol) {
        try {
            // Get current status
            const status = await api.getStreamStatus();
            
            // Don't allow removing if only one symbol left
            if (status.symbols.length <= 1) {
                this.showToast('⚠️ Cannot remove the last symbol', 'warning');
                return;
            }
            
            // Remove symbol
            const allSymbols = status.symbols.filter(s => s !== symbol);
            
            // Restart stream with remaining symbols
            if (status.running) {
                await api.stopStream();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            await api.startStream(allSymbols);
            
            this.showToast(`✅ Removed ${symbol.toUpperCase()}`, 'success');
        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    // Update symbol dropdowns with active symbols
    updateSymbolDropdowns(symbols) {
        console.log('🔄 Updating symbol dropdowns with:', symbols);
        
        // Check if symbols actually changed
        const symbolsChanged = JSON.stringify(this.availableSymbols) !== JSON.stringify(symbols);
        if (!symbolsChanged && this.dropdownsInitialized) {
            console.log('⏭️  Symbols unchanged, skipping dropdown update');
            return;
        }
        
        this.availableSymbols = symbols;
        this.dropdownsInitialized = true;
        
        const dataSymbol = document.getElementById('dataSymbol');
        const alertSymbol = document.getElementById('alertSymbol');
        
        // Update data analysis symbol dropdown
        if (dataSymbol) {
            const currentValue = dataSymbol.value;
            dataSymbol.innerHTML = '';
            
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select symbol...';
            dataSymbol.appendChild(placeholder);
            
            symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol.toUpperCase();
                dataSymbol.appendChild(option);
            });
            
            // Restore previous value without triggering change event
            if (symbols.includes(currentValue)) {
                dataSymbol.value = currentValue;
            }
        }
        
        // Update alert symbol dropdown
        if (alertSymbol) {
            const currentValue = alertSymbol.value;
            alertSymbol.innerHTML = '';
            
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select symbol...';
            alertSymbol.appendChild(placeholder);
            
            symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol.toUpperCase();
                alertSymbol.appendChild(option);
            });
            
            // Restore previous value without triggering change event
            if (symbols.includes(currentValue)) {
                alertSymbol.value = currentValue;
            }
        }
        
        console.log(`✅ Added ${symbols.length} symbols to dropdowns`);
    }

    // Open view alerts dialog
    async openViewAlertsDialog() {
        const dialog = document.getElementById('viewAlertsDialog');
        if (dialog) {
            dialog.style.display = 'flex';
            // Load existing alerts
            await this.loadAlerts();
        }
    }

    // Close view alerts dialog
    closeViewAlertsDialog() {
        const dialog = document.getElementById('viewAlertsDialog');
        if (dialog) dialog.style.display = 'none';
    }

    // Open create alert dialog
    openCreateAlertDialog() {
        const dialog = document.getElementById('createAlertDialog');
        if (dialog) dialog.style.display = 'flex';
    }

    // Close create alert dialog
    closeCreateAlertDialog() {
        const dialog = document.getElementById('createAlertDialog');
        if (dialog) dialog.style.display = 'none';
        // Clear form
        document.getElementById('alertName').value = '';
        document.getElementById('alertThreshold').value = '';
    }

    // Save alert (wrapper for createAlert)
    async saveAlert() {
        await this.createAlert();
        this.closeCreateAlertDialog();
        // Refresh the alerts list in view dialog
        await this.loadAlerts();
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TradingApp();
});
