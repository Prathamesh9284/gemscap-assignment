/**
 * Charts Module
 * Handles data visualization with Plotly
 */

const Charts = {
    currentSymbol: null,
    currentData: null,
    currentPrice: null,
    lastUpdateTime: 0,
    updateThrottle: 100, // Update at most every 100ms

    /**
     * Render OHLCV candlestick chart
     */
    renderOHLCV(containerId, data, livePrice = null) {
        if (!data || data.length === 0) {
            console.error('No data to render');
            return;
        }

        this.currentData = data;
        this.currentPrice = livePrice;

        const timestamps = data.map(d => d.timestamp);
        const opens = data.map(d => d.open);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        const volumes = data.map(d => d.volume);

        const candlestick = {
            type: 'candlestick',
            x: timestamps,
            open: opens,
            high: highs,
            low: lows,
            close: closes,
            name: 'Price',
            increasing: { 
                line: { color: '#26a69a', width: 1.5 },
                fillcolor: '#26a69a'
            },
            decreasing: { 
                line: { color: '#ef5350', width: 1.5 },
                fillcolor: '#ef5350'
            },
            yaxis: 'y',
            showlegend: true
        };

        const volume = {
            type: 'bar',
            x: timestamps,
            y: volumes,
            name: 'Volume',
            yaxis: 'y2',
            marker: {
                color: volumes.map((v, i) => 
                    closes[i] >= opens[i] ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)'
                )
            },
            showlegend: true
        };

        // Live price line (dotted)
        const traces = [candlestick, volume];
        if (livePrice !== null && timestamps.length > 0) {
            const livePriceLine = {
                type: 'scatter',
                mode: 'lines',
                x: [timestamps[0], timestamps[timestamps.length - 1]],
                y: [livePrice, livePrice],
                name: 'Live Price',
                line: {
                    color: '#f59e0b',
                    width: 2,
                    dash: 'dot'
                },
                yaxis: 'y',
                showlegend: true
            };
            traces.push(livePriceLine);
        }

        const layout = {
            title: {
                text: `<b>Price & Volume Chart</b>`,
                font: { size: 22, family: 'Inter, sans-serif', color: '#1f2937' },
                x: 0.05,
                xanchor: 'left'
            },
            xaxis: {
                title: {
                    text: 'Time',
                    font: { size: 14, color: '#6b7280' }
                },
                showgrid: true,
                gridcolor: '#e5e7eb',
                gridwidth: 1,
                tickfont: { size: 11, color: '#6b7280' },
                rangeslider: { visible: false }
            },
            yaxis: {
                title: {
                    text: 'Price (USD)',
                    font: { size: 14, color: '#6b7280' }
                },
                side: 'left',
                showgrid: true,
                gridcolor: '#e5e7eb',
                gridwidth: 1,
                tickformat: '$,.2f',
                tickfont: { size: 11, color: '#6b7280' },
                zeroline: false
            },
            yaxis2: {
                title: {
                    text: 'Volume',
                    font: { size: 14, color: '#6b7280' }
                },
                side: 'right',
                overlaying: 'y',
                showgrid: false,
                tickfont: { size: 11, color: '#6b7280' },
                zeroline: false
            },
            plot_bgcolor: '#ffffff',
            paper_bgcolor: '#fafafa',
            font: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 12 },
            margin: { t: 80, b: 80, l: 90, r: 90 },
            hovermode: 'x unified',
            hoverlabel: {
                bgcolor: '#1f2937',
                font: { size: 13, family: 'Inter, sans-serif', color: '#ffffff' },
                bordercolor: '#374151'
            },
            dragmode: 'zoom',
            selectdirection: 'h',
            legend: {
                x: 0.05,
                y: 0.95,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: '#e5e7eb',
                borderwidth: 1
            }
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
            toImageButtonOptions: {
                format: 'png',
                filename: 'price_chart',
                height: 800,
                width: 1400,
                scale: 2
            }
        };

        Plotly.newPlot(containerId, traces, layout, config);
    },

    /**
     * Update live price line on existing chart
     */
    updateLivePrice(containerId, price) {
        if (!this.currentData || this.currentData.length === 0) return;
        
        // Throttle updates
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) return;
        this.lastUpdateTime = now;
        
        try {
            this.currentPrice = price;
            
            // Update the live price line dynamically
            const container = document.getElementById(containerId);
            if (!container || !container.data || container.data.length < 3) return;
            
            // Find the live price line trace (usually index 2)
            const timestamps = this.currentData.map(d => d.timestamp);
            if (timestamps.length < 2) return;
            
            const update = {
                y: [[price, price]],
                x: [[timestamps[0], timestamps[timestamps.length - 1]]]
            };
            
            // Update trace 2 (live price line) using Plotly.update
            Plotly.update(containerId, update, {}, [2]).catch(err => {
                console.warn('Chart update failed:', err);
            });
        } catch (error) {
            console.error('Error updating live price:', error);
        }
    },

    /**
     * Update the last candlestick bar with current price
     */
    updateLastBar(containerId, price) {
        if (!this.currentData || this.currentData.length === 0) return;
        
        try {
            const lastIndex = this.currentData.length - 1;
            const lastCandle = this.currentData[lastIndex];
            
            // Update the data
            lastCandle.close = price;
            
            // Update high if current price is higher
            if (price > lastCandle.high) {
                lastCandle.high = price;
            }
            
            // Update low if current price is lower
            if (price < lastCandle.low) {
                lastCandle.low = price;
            }
            
            // Update the chart - restyle only the candlestick trace
            const container = document.getElementById(containerId);
            if (!container || !container.data) return;
            
            // Prepare full data arrays for the candlestick
            const update = {
                close: [this.currentData.map(d => d.close)],
                high: [this.currentData.map(d => d.high)],
                low: [this.currentData.map(d => d.low)]
            };
            
            // Update trace 0 (candlestick) using restyle
            Plotly.restyle(containerId, update, [0]).catch(err => {
                console.warn('Chart candlestick update failed:', err);
            });
        } catch (error) {
            console.error('Error updating last bar:', error);
        }
    },

    /**
     * Render line chart
     */
    renderLineChart(containerId, data, title, xLabel, yLabel) {
        const trace = {
            type: 'scatter',
            mode: 'lines',
            x: data.x,
            y: data.y,
            line: {
                color: CONFIG.CHART_COLORS.primary,
                width: 2
            },
            name: title
        };

        const layout = {
            title: title,
            xaxis: { title: xLabel },
            yaxis: { title: yLabel },
            plot_bgcolor: '#f8fafc',
            paper_bgcolor: '#ffffff',
            font: { family: 'Inter, system-ui, sans-serif' },
            margin: { t: 50, b: 50, l: 60, r: 60 },
            hovermode: 'closest'
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };

        Plotly.newPlot(containerId, [trace], layout, config);
    },

    /**
     * Clear chart
     */
    clearChart(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            Plotly.purge(container);
        }
    }
};

window.Charts = Charts;
