// COMMAND REFERENCE - Copy & Paste into DevTools Console (F12)
// ============================================================

// ==============================================
// LOGGER COMMANDS
// ==============================================

// View all app logs
window.loggerApp.getLogs()

// View sync logs
window.loggerSync.getLogs()

// View error logs only
window.loggerApp.getLogs('ERROR', 50)

// View last 10 critical logs
window.loggerApp.getLogs('CRITICAL', 10)

// Get log statistics
window.loggerApp.getStatistics()

// Export logs to JSON file
window.loggerApp.exportLogs()

// Clear all logs
window.loggerApp.clearLogs()

// Get specific module logs
window.loggerAPI.getLogs('INFO', 20)

// ==============================================
// TELEMETRY COMMANDS
// ==============================================

// View all metrics
window.telemetry.getMetricsSummary()

// Get performance stats for operation
window.telemetry.getPerformanceStats('sync-groups')

// Track a custom event
window.telemetry.trackEvent('MyApp', 'MyAction', 'MyLabel', 123)

// Track user interaction
window.telemetry.trackInteraction('export-button', 'click')

// Track error
window.telemetry.trackError(new Error('Test error'), 'test-context')

// Export metrics to JSON
window.telemetry.exportMetrics()

// Clear all metrics
window.telemetry.clearMetrics()

// View events by category
console.table(window.telemetry.metrics.events.map(e => ({
    category: e.category,
    action: e.action,
    time: e.timestamp
})))

// ==============================================
// OFFLINE QUEUE COMMANDS
// ==============================================

// Check queue status
window.offlineQueue.getStatus()

// Add request to queue manually
window.offlineQueue.enqueue({
    url: 'https://api.example.com/data',
    method: 'POST',
    body: { test: 'data' }
})

// Sync queue immediately
window.offlineQueue.syncQueue()

// View queue items
window.offlineQueue.queue

// Clear entire queue
window.offlineQueue.clearQueue()

// Export queue to JSON
window.offlineQueue.exportQueue()

// Check if online
navigator.onLine

// Manually trigger offline mode (for testing)
// (Note: requires console hack, not standard)

// ==============================================
// SYNC RECONCILIATION COMMANDS
// ==============================================

// Verify sync data
window.syncReconciliation.verifySyncData('Group', [
    { name: 'Group 1', alterID: 1, groupName: 'G1' },
    { name: 'Group 2', alterID: 2, groupName: 'G2' }
])

// Detect conflicts between local and remote
window.syncReconciliation.detectConflicts('Ledger', localRecords, remoteRecords)

// Resolve a specific conflict
window.syncReconciliation.resolveConflict(
    { alterID: 123, name: 'Item' },
    'useRemote'
)

// Get reconciliation report
window.syncReconciliation.generateReconciliationReport()

// Export reconciliation report
window.syncReconciliation.exportReport()

// View reconciliation history
window.syncReconciliation.reconciliationHistory

// View conflict log
window.syncReconciliation.conflictLog

// Clear reconciliation history
window.syncReconciliation.clearHistory()

// ==============================================
// ERROR BOUNDARY COMMANDS
// ==============================================

// View all errors
window.errorBoundary.errors

// Get error report
window.errorBoundary.getErrorReport()

// Export error report
window.errorBoundary.exportErrorReport()

// Clear error history
window.errorBoundary.clearErrors()

// Manually log an error
window.errorBoundary.logError(new Error('Test error'))

// ==============================================
// CONFIGURATION COMMANDS
// ==============================================

// View entire configuration
window.UpgradeConfig

// View logger config
window.UpgradeConfig.logger

// View offline queue config
window.UpgradeConfig.offlineQueue

// View feature flags
window.UpgradeConfig.features

// Modify config at runtime (EXAMPLE)
window.loggerApp.maxBufferSize = 5000  // Increase buffer

// ==============================================
// MONITORING COMMANDS
// ==============================================

// Check all services are initialized
({
    logger: !!window.loggerApp,
    telemetry: !!window.telemetry,
    offlineQueue: !!window.offlineQueue,
    reconciliation: !!window.syncReconciliation,
    errorBoundary: !!window.errorBoundary
})

// Get quick status
({
    online: navigator.onLine,
    logs: window.loggerApp.logBuffer.length,
    queue: window.offlineQueue.queue.length,
    errors: window.errorBoundary.errors.length,
    reconciliations: window.syncReconciliation.reconciliationHistory.length,
    conflicts: window.syncReconciliation.conflictLog.length
})

// Full health check
({
    services: {
        logger: !!window.loggerApp,
        telemetry: !!window.telemetry,
        offlineQueue: !!window.offlineQueue,
        reconciliation: !!window.syncReconciliation,
        errorBoundary: !!window.errorBoundary
    },
    status: {
        online: navigator.onLine,
        logsCount: window.loggerApp.logBuffer.length,
        queueSize: window.offlineQueue.queue.length,
        errorCount: window.errorBoundary.errors.length
    },
    memory: {
        logs: (JSON.stringify(window.loggerApp.logBuffer).length / 1024).toFixed(2) + ' KB',
        queue: (JSON.stringify(window.offlineQueue.queue).length / 1024).toFixed(2) + ' KB'
    }
})

// ==============================================
// EXPORT ALL DATA AT ONCE
// ==============================================

// Export everything
window.loggerApp.exportLogs();
window.telemetry.exportMetrics();
window.offlineQueue.exportQueue();
window.syncReconciliation.exportReport();
window.errorBoundary.exportErrorReport();

// ==============================================
// PERFORMANCE ANALYSIS
// ==============================================

// Get average performance for all operations
Object.entries(window.telemetry.metrics.performance).map(([op, times]) => ({
    operation: op,
    avg: (times.reduce((a,b) => a+b, 0) / times.length).toFixed(0) + 'ms',
    min: Math.min(...times) + 'ms',
    max: Math.max(...times) + 'ms',
    count: times.length
}))

// Get slowest operations
const perf = window.telemetry.metrics.performance;
Object.entries(perf).map(([name, times]) => ({
    name,
    avgMs: (times.reduce((a,b)=>a+b)/times.length).toFixed(0)
})).sort((a,b) => b.avgMs - a.avgMs)

// ==============================================
// ADVANCED DEBUG COMMANDS
// ==============================================

// Real-time log monitor (run in console)
setInterval(() => {
    console.clear();
    console.log('%c=== Live Status ===', 'color: #2563eb; font-weight: bold');
    console.log('%cOnline:', 'color: #64748b', navigator.onLine ? '%c✓' : '%c✗', navigator.onLine ? 'color: #16a34a' : 'color: #dc2626', navigator.onLine);
    console.log('%cQueue size:', 'color: #64748b', window.offlineQueue.queue.length > 0 ? '%c⧗' : '%c-', window.offlineQueue.queue.length > 0 ? 'color: #ea580c' : 'color: #16a34a', window.offlineQueue.queue.length);
    console.log('%cRecent logs:', 'color: #64748b', window.loggerApp.getLogs('INFO', 5).length);
    console.log('%cErrors:', 'color: #64748b', window.errorBoundary.errors.length > 0 ? '%c●' : '%c○', window.errorBoundary.errors.length > 0 ? 'color: #dc2626' : 'color: #16a34a', window.errorBoundary.errors.length);
}, 5000)

// Monitor offline queue in real-time
setInterval(() => {
    const status = window.offlineQueue.getStatus();
    if (status.queueSize > 0) {
        console.warn(`%c⧗ ${status.queueSize} requests pending`, 'color: #ea580c; font-weight: bold; font-size: 12px');
    }
}, 10000)

// ==============================================
// TESTING COMMANDS
// ==============================================

// Simulate error (won't actually break anything)
try {
    throw new Error('Test error');
} catch(e) {
    window.errorBoundary.logError(e);
    window.telemetry.trackError(e);
}

// Simulate sync completion
window.telemetry.trackSync('test-sync', 'success', 150, 2500)

// Simulate offline request
window.offlineQueue.enqueue({
    url: '/api/test',
    method: 'POST',
    body: { test: true }
})

// Simulate performance measurement
const start = Date.now();
setTimeout(() => {
    window.telemetry.measurePerformance('test-operation', start);
}, 1000)

// ==============================================
// USEFUL SNIPPETS
// ==============================================

// Create summary report
function generateReport() {
    return {
        timestamp: new Date().toISOString(),
        system: {
            online: navigator.onLine,
            userAgent: navigator.userAgent.substring(0, 50)
        },
        services: {
            logs: window.loggerApp.logBuffer.length,
            queue: window.offlineQueue.queue.length,
            errors: window.errorBoundary.errors.length,
            metrics: window.telemetry.metrics.events.length
        },
        performance: window.telemetry.getMetricsSummary().performanceSummary,
        reconciliation: window.syncReconciliation.generateReconciliationReport()
    }
}
generateReport()

// Cleanup all data
function cleanupAll() {
    window.loggerApp.clearLogs();
    window.telemetry.clearMetrics();
    window.offlineQueue.clearQueue();
    window.errorBoundary.clearErrors();
    window.syncReconciliation.clearHistory();
    console.log('%c✓ All data cleared', 'color: #16a34a; font-weight: bold; font-size: 13px');
}

// Get memory usage
function getMemoryUsage() {
    return {
        logs: (JSON.stringify(window.loggerApp.logBuffer).length / 1024).toFixed(2) + ' KB',
        metrics: (JSON.stringify(window.telemetry.metrics).length / 1024).toFixed(2) + ' KB',
        queue: (JSON.stringify(window.offlineQueue.queue).length / 1024).toFixed(2) + ' KB',
        total: (
            (JSON.stringify(window.loggerApp.logBuffer).length + 
             JSON.stringify(window.telemetry.metrics).length + 
             JSON.stringify(window.offlineQueue.queue).length) / 1024
        ).toFixed(2) + ' KB'
    }
}
getMemoryUsage()

// ==============================================
// KEYBOARD SHORTCUTS (for quick access)
// ==============================================

// Add to window for quick access
window.commands = {
    status: () => ({ online: navigator.onLine, queue: window.offlineQueue.queue.length }),
    logs: () => window.loggerApp.getLogs(),
    errors: () => window.errorBoundary.errors,
    metrics: () => window.telemetry.getMetricsSummary(),
    export: () => {
        window.loggerApp.exportLogs();
        window.telemetry.exportMetrics();
        window.offlineQueue.exportQueue();
        window.errorBoundary.exportErrorReport();
    },
    cleanup: () => {
        window.loggerApp.clearLogs();
        window.telemetry.clearMetrics();
        window.offlineQueue.clearQueue();
        window.errorBoundary.clearErrors();
    }
}

// Then use: window.commands.status() or window.commands.export()

// ==============================================
// END OF COMMAND REFERENCE
// ==============================================
