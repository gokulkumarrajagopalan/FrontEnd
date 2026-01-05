// INTEGRATION EXAMPLES
// How to use the new upgrade services in your existing code

// ============================================================================
// 1. LOGGING EXAMPLES
// ============================================================================

// In any service/component:
class MyService {
    constructor() {
        this.logger = window.loggerApp;
    }

    async fetchData() {
        this.logger.info('Fetching data...');
        try {
            const response = await fetch('/api/data');
            this.logger.info('Data fetched successfully', { status: response.status });
            return response.json();
        } catch (error) {
            this.logger.error('Failed to fetch data', error);
            throw error;
        }
    }
}

// In API service:
class APIService {
    constructor() {
        this.logger = window.loggerAPI;
    }

    async request(url, options = {}) {
        this.logger.debug('API Request', { url, method: options.method });
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                this.logger.info(`API Success: ${options.method} ${url}`);
                return response;
            } else {
                this.logger.warn(`API Error: ${response.status} ${url}`);
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.logger.error(`API Failed: ${url}`, error);
            throw error;
        }
    }
}

// In Auth service:
class AuthService {
    constructor() {
        this.logger = window.loggerAuth;
    }

    async login(username, password) {
        this.logger.info('Login attempt', { username });
        // ... login logic
    }

    async logout() {
        this.logger.info('User logged out');
        // ... logout logic
    }
}

// In Sync service:
class SyncService {
    constructor() {
        this.logger = window.loggerSync;
    }

    async syncEntities() {
        this.logger.info('Starting sync cycle');
        const entities = ['Group', 'Ledger', 'StockItem'];
        
        for (const entity of entities) {
            this.logger.debug(`Syncing ${entity}...`);
            // ... sync logic
        }
        
        this.logger.info('Sync cycle complete');
    }
}

// ============================================================================
// 2. TELEMETRY EXAMPLES
// ============================================================================

// Track user interactions:
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn')) {
        window.telemetry.trackInteraction(e.target.id, 'click');
    }
});

// Track sync operations:
async function syncData() {
    const startTime = Date.now();
    
    try {
        const records = await fetchRecords();
        const duration = window.telemetry.measurePerformance('data-sync', startTime);
        
        window.telemetry.trackSync('full-sync', 'success', records.length, duration);
        return records;
    } catch (error) {
        window.telemetry.trackError(error);
        throw error;
    }
}

// Track page loads:
class PageLoader {
    async loadPage(pageName) {
        const startTime = Date.now();
        
        const pageContent = await this.fetchPage(pageName);
        
        const duration = window.telemetry.measurePerformance(`page-load-${pageName}`, startTime);
        window.telemetry.trackEvent('PageLoad', pageName, 'success', duration);
        
        return pageContent;
    }
}

// Get performance insights:
function getPerformanceReport() {
    const metrics = window.telemetry.getMetricsSummary();
    
    console.log('=== Performance Report ===');
    console.table(metrics.performanceSummary);
    
    // Get specific operation stats
    const syncStats = window.telemetry.getPerformanceStats('data-sync');
    if (syncStats) {
        console.log(`Data Sync Average: ${syncStats.average}ms`);
        console.log(`Data Sync P95: ${syncStats.p95}ms`);
    }
}

// ============================================================================
// 3. OFFLINE QUEUE EXAMPLES
// ============================================================================

// Wrapper for API calls that need offline support:
class OfflineAwareAPI {
    async post(url, data) {
        try {
            // Try normal request first
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            return response.json();
        } catch (error) {
            if (!navigator.onLine) {
                // Queue for later
                const queueId = window.offlineQueue.enqueue({
                    url,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data
                });
                
                window.loggerAPI.warn('Request queued (offline)', { queueId, url });
                return { queued: true, queueId };
            }
            throw error;
        }
    }
}

// Check queue status periodically:
setInterval(() => {
    const status = window.offlineQueue.getStatus();
    if (status.queueSize > 0) {
        console.log(`⏳ ${status.queueSize} requests waiting to sync`);
    }
    
    // Manually trigger sync if needed
    if (status.isOnline && status.queueSize > 0) {
        window.offlineQueue.syncQueue();
    }
}, 30000); // Every 30 seconds

// ============================================================================
// 4. SYNC RECONCILIATION EXAMPLES
// ============================================================================

// After syncing data:
async function syncGroupsWithVerification() {
    // Fetch records
    const records = await fetchGroupsFromTally();
    
    // Verify data integrity
    const verification = window.syncReconciliation.verifySyncData('Group', records);
    
    if (verification.status === 'FAILED') {
        window.loggerSync.warn('Verification failed', {
            validRecords: verification.validRecords,
            invalidRecords: verification.invalidRecords,
            issues: verification.missingFields
        });
        
        // Handle invalid records
        const validRecords = records.filter(r => 
            !verification.missingFields.some(issue => 
                records[issue.index] === r
            )
        );
        
        return validRecords;
    }
    
    return records;
}

// Detect and handle conflicts:
async function handleSyncConflicts() {
    const localRecords = getLocalRecords('Group');
    const remoteRecords = await getRemoteRecords('Group');
    
    const conflicts = window.syncReconciliation.detectConflicts(
        'Group',
        localRecords,
        remoteRecords
    );
    
    if (conflicts.totalConflicts > 0) {
        console.log(`Found ${conflicts.totalConflicts} conflicts`);
        
        // Show UI or handle conflicts
        for (const conflict of conflicts.conflictTypes.nameChanges) {
            console.log(`Name change conflict:`, conflict);
            
            // Ask user or use default strategy
            const resolution = window.syncReconciliation.resolveConflict(
                conflict,
                'useRemote'
            );
            
            console.log(`Resolved: ${resolution.message}`);
        }
    }
    
    // Generate report
    const report = window.syncReconciliation.generateReconciliationReport();
    console.log('Reconciliation complete:', report);
}

// ============================================================================
// 5. ERROR HANDLING EXAMPLES
// ============================================================================

// Errors are automatically caught and displayed
// But you can also manually log them:

try {
    riskyOperation();
} catch (error) {
    window.errorBoundary.logError(error);
    // Error will be logged, tracked, and displayed to user
}

// Export error report for debugging:
document.getElementById('export-errors-btn').addEventListener('click', () => {
    window.errorBoundary.exportErrorReport();
    // Downloads error_report_[timestamp].json
});

// ============================================================================
// 6. MONITORING & DEBUGGING
// ============================================================================

// Create a status page/component:
function createStatusPanel() {
    const status = {
        logger: !!window.loggerApp,
        telemetry: !!window.telemetry,
        offline: {
            online: navigator.onLine,
            queueSize: window.offlineQueue.queue.length
        },
        reconciliation: {
            totalReconciliations: window.syncReconciliation.reconciliationHistory.length,
            totalConflicts: window.syncReconciliation.conflictLog.length
        },
        errors: window.errorBoundary.errors.length
    };
    
    return status;
}

// Log all metrics to file:
function exportAllMetrics() {
    const timestamp = new Date().toISOString();
    
    // Export all available data
    window.loggerApp.exportLogs();
    window.telemetry.exportMetrics();
    window.offlineQueue.exportQueue();
    window.syncReconciliation.exportReport();
    window.errorBoundary.exportErrorReport();
    
    console.log(`✅ All metrics exported at ${timestamp}`);
}

// ============================================================================
// 7. REAL-WORLD INTEGRATION EXAMPLE
// ============================================================================

class EnhancedSyncService {
    constructor() {
        this.logger = window.loggerSync;
        this.telemetry = window.telemetry;
        this.reconciliation = window.syncReconciliation;
        this.offlineQueue = window.offlineQueue;
    }

    async fullSync() {
        const syncStart = Date.now();
        this.logger.info('Full sync started');
        
        const entities = ['Group', 'Ledger', 'StockItem'];
        const results = {};
        
        for (const entity of entities) {
            try {
                // Log start
                this.logger.debug(`Syncing ${entity}...`);
                const entityStart = Date.now();
                
                // Fetch data
                const records = await this.fetchEntity(entity);
                
                // Verify integrity
                const verification = this.reconciliation.verifySyncData(entity, records);
                
                // Detect conflicts
                const localRecords = this.getLocalRecords(entity);
                const conflicts = this.reconciliation.detectConflicts(
                    entity,
                    localRecords,
                    records
                );
                
                // Measure and track
                const duration = window.telemetry.measurePerformance(
                    `sync-${entity}`,
                    entityStart
                );
                
                results[entity] = {
                    success: verification.status === 'PASSED',
                    records: records.length,
                    conflicts: conflicts.totalConflicts,
                    duration
                };
                
                // Track event
                this.telemetry.trackSync(
                    entity,
                    verification.status === 'PASSED' ? 'success' : 'partial',
                    records.length,
                    duration
                );
                
                this.logger.info(`${entity} synced`, results[entity]);
                
            } catch (error) {
                this.logger.error(`${entity} sync failed`, error);
                this.telemetry.trackError(error);
                results[entity] = { success: false, error: error.message };
            }
        }
        
        // Final metrics
        const totalDuration = window.telemetry.measurePerformance('full-sync', syncStart);
        
        this.logger.info('Full sync complete', {
            duration: totalDuration,
            entities: results
        });
        
        return results;
    }

    async fetchEntity(entity) {
        // Your fetch logic here
        return await this.offlineQueue.enqueue({
            url: `/api/sync/${entity}`,
            method: 'GET'
        });
    }

    getLocalRecords(entity) {
        // Your local data retrieval logic
        return [];
    }
}

// Usage:
const enhancedSync = new EnhancedSyncService();
await enhancedSync.fullSync();

// ============================================================================
// 8. CONFIGURATION OVERRIDES (if needed)
// ============================================================================

// Override config at runtime:
if (window.UpgradeConfig) {
    // Increase logger buffer for heavy logging
    window.loggerApp.maxBufferSize = 5000;
    
    // Enable debug mode
    window.loggerApp.level = 'DEBUG';
    
    // Adjust offline queue
    window.offlineQueue.maxQueueSize = 1000;
    window.offlineQueue.retryAttempts = 5;
}

// ============================================================================
// END OF EXAMPLES
// ============================================================================
