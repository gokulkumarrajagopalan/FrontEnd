/**
 * App Initialization - Start sync scheduler
 */

class AppInitializer {
    static initializeSyncScheduler() {
        try {
            // Check if user is authenticated
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.log('ℹ️ User not authenticated, sync scheduler will start after login');
                return;
            }

            // Initialize and start scheduler
            window.syncScheduler = new SyncScheduler();
            window.syncScheduler.start();

            console.log('✅ Sync scheduler initialized');
        } catch (error) {
            console.error('❌ Error initializing sync scheduler:', error);
        }
    }

    static stopSyncScheduler() {
        if (window.syncScheduler) {
            window.syncScheduler.stop();
            console.log('✅ Sync scheduler stopped');
        }
    }

    static restartSyncScheduler() {
        this.stopSyncScheduler();
        this.initializeSyncScheduler();
        console.log('✅ Sync scheduler restarted');
    }

    static getSyncStatus() {
        if (window.syncScheduler) {
            return window.syncScheduler.getStatus();
        }
        return { isRunning: false, lastSyncTime: null, interval: 0 };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AppInitializer = AppInitializer;
}
