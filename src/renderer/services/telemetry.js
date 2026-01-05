/**
 * Telemetry Service
 * Tracks application metrics and user interactions
 * @version 1.0.0
 */

class Telemetry {
    constructor() {
        this.metrics = {
            appStartTime: Date.now(),
            events: [],
            performance: {},
            userInteractions: 0,
            errors: 0,
            warnings: 0
        };
        this.maxEvents = 500;
        this.loadMetrics();
    }

    /**
     * Track event
     */
    trackEvent(category, action, label = null, value = null) {
        const event = {
            timestamp: new Date().toISOString(),
            category,
            action,
            label,
            value,
            sessionDuration: Date.now() - this.metrics.appStartTime
        };

        this.metrics.events.push(event);
        
        if (this.metrics.events.length > this.maxEvents) {
            this.metrics.events = this.metrics.events.slice(-this.maxEvents);
        }

        this.saveMetrics();
        console.log(`📊 [Telemetry] ${category}:${action}`);
    }

    /**
     * Track user interaction
     */
    trackInteraction(element, action = 'click') {
        this.metrics.userInteractions++;
        this.trackEvent('User Interaction', action, element);
    }

    /**
     * Track error
     */
    trackError(error, context = null) {
        this.metrics.errors++;
        this.trackEvent('Error', error.name || 'Unknown', error.message, context);
    }

    /**
     * Track warning
     */
    trackWarning(message, context = null) {
        this.metrics.warnings++;
        this.trackEvent('Warning', message, context);
    }

    /**
     * Track sync event
     */
    trackSync(syncType, status, recordCount, duration) {
        this.trackEvent('Sync', syncType, status, {
            records: recordCount,
            duration: duration,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Measure performance
     */
    measurePerformance(label, startTime) {
        const duration = Date.now() - startTime;
        
        if (!this.metrics.performance[label]) {
            this.metrics.performance[label] = [];
        }

        this.metrics.performance[label].push(duration);
        
        // Keep only last 100 measurements
        if (this.metrics.performance[label].length > 100) {
            this.metrics.performance[label] = this.metrics.performance[label].slice(-100);
        }

        this.saveMetrics();
        return duration;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(label) {
        const data = this.metrics.performance[label] || [];
        if (data.length === 0) return null;

        const sorted = [...data].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);

        return {
            count: data.length,
            average: Math.round(sum / data.length),
            min: Math.min(...data),
            max: Math.max(...data),
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)]
        };
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary() {
        return {
            sessionDuration: Date.now() - this.metrics.appStartTime,
            totalEvents: this.metrics.events.length,
            userInteractions: this.metrics.userInteractions,
            errors: this.metrics.errors,
            warnings: this.metrics.warnings,
            eventsByCategory: this.aggregateByCategory(),
            performanceSummary: this.getPerformanceSummary()
        };
    }

    /**
     * Aggregate events by category
     * @private
     */
    aggregateByCategory() {
        const aggregated = {};
        
        this.metrics.events.forEach(event => {
            if (!aggregated[event.category]) {
                aggregated[event.category] = 0;
            }
            aggregated[event.category]++;
        });

        return aggregated;
    }

    /**
     * Get performance summary
     * @private
     */
    getPerformanceSummary() {
        const summary = {};

        for (const [label, measurements] of Object.entries(this.metrics.performance)) {
            summary[label] = this.getPerformanceStats(label);
        }

        return summary;
    }

    /**
     * Export metrics
     */
    exportMetrics() {
        const dataStr = JSON.stringify(this.getMetricsSummary(), null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `telemetry_${new Date().toISOString()}.json`;
        link.click();
    }

    /**
     * Save metrics to localStorage
     * @private
     */
    saveMetrics() {
        try {
            const toSave = {
                events: this.metrics.events,
                performance: this.metrics.performance,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('telemetryMetrics', JSON.stringify(toSave));
        } catch (error) {
            console.warn('Failed to save metrics:', error);
        }
    }

    /**
     * Load metrics from localStorage
     * @private
     */
    loadMetrics() {
        try {
            const stored = localStorage.getItem('telemetryMetrics');
            if (stored) {
                const data = JSON.parse(stored);
                this.metrics.events = data.events || [];
                this.metrics.performance = data.performance || {};
            }
        } catch (error) {
            console.warn('Failed to load metrics:', error);
        }
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics = {
            appStartTime: Date.now(),
            events: [],
            performance: {},
            userInteractions: 0,
            errors: 0,
            warnings: 0
        };
        localStorage.removeItem('telemetryMetrics');
        console.log('✅ Metrics cleared');
    }
}

window.telemetry = new Telemetry();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Telemetry;
}
