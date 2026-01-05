/**
 * Logger Service
 * Comprehensive logging for debugging and monitoring
 * @version 1.0.0
 */

class Logger {
    constructor(module = 'App', level = 'INFO') {
        this.module = module;
        this.level = level;
        this.logBuffer = [];
        this.maxBufferSize = 1000;
        this.enablePersistence = true;
        this.initializeStorage();
    }

    /**
     * Log levels configuration
     */
    static LEVELS = {
        DEBUG: { value: 0, label: 'DEBUG', color: '#gray', emoji: '🔍' },
        INFO: { value: 1, label: 'INFO', color: '#blue', emoji: 'ℹ️' },
        WARN: { value: 2, label: 'WARN', color: '#orange', emoji: '⚠️' },
        ERROR: { value: 3, label: 'ERROR', color: '#red', emoji: '❌' },
        CRITICAL: { value: 4, label: 'CRITICAL', color: '#darkred', emoji: '🔥' }
    };

    /**
     * Initialize local storage for logs
     */
    initializeStorage() {
        try {
            const stored = localStorage.getItem(`logs_${this.module}`);
            if (stored) {
                this.logBuffer = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load logs from storage');
        }
    }

    /**
     * Save logs to localStorage
     * @private
     */
    saveToStorage() {
        if (!this.enablePersistence) return;

        try {
            const logKey = `logs_${this.module}`;
            localStorage.setItem(logKey, JSON.stringify(this.logBuffer.slice(-this.maxBufferSize)));
        } catch (error) {
            // Silently fail if storage is full
        }
    }

    /**
     * Add log entry
     * @private
     */
    addLogEntry(level, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.label,
            module: this.module,
            message,
            data,
            userAgent: navigator.userAgent.substring(0, 100)
        };

        this.logBuffer.push(entry);

        // Keep buffer size manageable
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
        }

        this.saveToStorage();
        return entry;
    }

    /**
     * Debug level logging
     */
    debug(message, data = null) {
        const entry = this.addLogEntry(Logger.LEVELS.DEBUG, message, data);
        console.log(`${Logger.LEVELS.DEBUG.emoji} [${this.module}] ${message}`, data || '');
        return entry;
    }

    /**
     * Info level logging
     */
    info(message, data = null) {
        const entry = this.addLogEntry(Logger.LEVELS.INFO, message, data);
        console.info(`${Logger.LEVELS.INFO.emoji} [${this.module}] ${message}`, data || '');
        return entry;
    }

    /**
     * Warning level logging
     */
    warn(message, data = null) {
        const entry = this.addLogEntry(Logger.LEVELS.WARN, message, data);
        console.warn(`${Logger.LEVELS.WARN.emoji} [${this.module}] ${message}`, data || '');
        return entry;
    }

    /**
     * Error level logging
     */
    error(message, error = null) {
        const entry = this.addLogEntry(Logger.LEVELS.ERROR, message, {
            error: error?.message || error,
            stack: error?.stack
        });
        console.error(`${Logger.LEVELS.ERROR.emoji} [${this.module}] ${message}`, error || '');
        return entry;
    }

    /**
     * Critical level logging
     */
    critical(message, error = null) {
        const entry = this.addLogEntry(Logger.LEVELS.CRITICAL, message, {
            error: error?.message || error,
            stack: error?.stack
        });
        console.error(`${Logger.LEVELS.CRITICAL.emoji} [${this.module}] CRITICAL: ${message}`, error || '');
        return entry;
    }

    /**
     * Get logs
     */
    getLogs(level = null, limit = 100) {
        let logs = [...this.logBuffer];

        if (level) {
            logs = logs.filter(log => log.level === level);
        }

        return logs.slice(-limit);
    }

    /**
     * Get logs by module
     */
    getLogsByModule(module, limit = 100) {
        return this.logBuffer
            .filter(log => log.module === module)
            .slice(-limit);
    }

    /**
     * Export logs as JSON
     */
    exportLogs() {
        const dataStr = JSON.stringify(this.logBuffer, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs_${this.module}_${new Date().toISOString()}.json`;
        link.click();
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logBuffer = [];
        localStorage.removeItem(`logs_${this.module}`);
        this.info('Logs cleared');
    }

    /**
     * Get log statistics
     */
    getStatistics() {
        const stats = {
            total: this.logBuffer.length,
            byLevel: {},
            byHour: {},
            oldestLog: this.logBuffer[0]?.timestamp,
            newestLog: this.logBuffer[this.logBuffer.length - 1]?.timestamp
        };

        this.logBuffer.forEach(log => {
            // Count by level
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

            // Count by hour
            const hour = new Date(log.timestamp).toISOString().substring(0, 13);
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });

        return stats;
    }
}

// Create global logger instances
window.loggerApp = new Logger('App', 'INFO');
window.loggerSync = new Logger('Sync', 'INFO');
window.loggerAuth = new Logger('Auth', 'INFO');
window.loggerAPI = new Logger('API', 'INFO');

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
