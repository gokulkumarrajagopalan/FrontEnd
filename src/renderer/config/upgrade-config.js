/**
 * Upgrade Configuration
 * Central configuration for all upgraded services
 */

const UpgradeConfig = {
    // Logger Configuration
    logger: {
        enablePersistence: true,
        maxBufferSize: 1000,
        defaultLevel: 'INFO',
        modules: ['App', 'Sync', 'Auth', 'API']
    },

    // Offline Queue Configuration
    offlineQueue: {
        maxQueueSize: 500,
        retryAttempts: 3,
        retryDelay: 5000,
        autoSyncInterval: 30000 // 30 seconds
    },

    // Telemetry Configuration
    telemetry: {
        enabled: true,
        trackPerformance: true,
        trackInteractions: true,
        maxEvents: 500,
        reportInterval: 3600000 // 1 hour
    },

    // Error Boundary Configuration
    errorBoundary: {
        maxErrorsStored: 50,
        displayDuration: 10000, // 10 seconds
        captureConsoleErrors: true
    },

    // Sync Reconciliation Configuration
    syncReconciliation: {
        enableAutoVerification: true,
        verificationInterval: 600000, // 10 minutes
        maxHistorySize: 100,
        conflictResolutionStrategies: ['useLocal', 'useRemote', 'merge', 'skip']
    },

    // Feature Flags
    features: {
        enableOfflineMode: true,
        enableTelemetry: true,
        enableErrorBoundary: true,
        enableReconciliation: true,
        enableLogging: true
    }
};

if (typeof window !== 'undefined') {
    window.UpgradeConfig = UpgradeConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpgradeConfig;
}
