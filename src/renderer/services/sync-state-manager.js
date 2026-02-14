/**
 * Sync State Manager
 * Manages global sync state to prevent concurrent syncs and track sync status
 * Handles notifications and sync queuing
 */

class SyncStateManager {
    constructor() {
        this.syncInProgress = false;
        this.syncType = null; // 'full', 'incremental', 'company-specific'
        this.syncStartTime = null;
        this.syncedCount = 0;
        this.totalCount = 0;
        this.currentSyncCompany = null;
        this.syncQueue = [];
        this.syncHistory = [];
        this.listeners = [];
        this.notificationId = null;
        
        // Initialize from localStorage
        this.loadState();
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem('syncState');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.syncHistory = state.syncHistory || [];
            }
        } catch (error) {
            console.warn('Could not load sync state:', error);
        }
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('syncState', JSON.stringify({
                syncHistory: this.syncHistory.slice(-50) // Keep last 50 sync records
            }));
        } catch (error) {
            console.warn('Could not save sync state:', error);
        }
    }

    /**
     * Start sync - returns true if allowed, false if sync already in progress
     */
    startSync(type = 'full', totalCount = 0) {
        if (this.syncInProgress) {
            console.warn(`⚠️ Sync already in progress (${this.syncType}). Request queued.`);
            this.addToQueue(type, totalCount);
            this.showQueuedNotification();
            return false;
        }

        this.syncInProgress = true;
        this.syncType = type;
        this.syncStartTime = new Date();
        this.syncedCount = 0;
        this.totalCount = totalCount;
        this.currentSyncCompany = null;

        console.log(`🚀 Sync Started - Type: ${type}, Total: ${totalCount}`);
        this.notifyListeners('sync-started', {
            type: this.syncType,
            totalCount: this.totalCount,
            startTime: this.syncStartTime
        });

        this.showSyncNotification();
        return true;
    }

    /**
     * Update sync progress
     */
    updateProgress(syncedCount, currentCompany = null) {
        this.syncedCount = syncedCount;
        this.currentSyncCompany = currentCompany;

        this.notifyListeners('sync-progress', {
            type: this.syncType,
            syncedCount: this.syncedCount,
            totalCount: this.totalCount,
            currentCompany: this.currentSyncCompany,
            progress: this.totalCount > 0 ? (this.syncedCount / this.totalCount) * 100 : 0
        });

        this.updateSyncNotification();
    }

    /**
     * Complete sync
     */
    endSync(success = true, message = '') {
        const duration = this.syncStartTime ? Date.now() - this.syncStartTime.getTime() : 0;
        
        const syncRecord = {
            timestamp: new Date(),
            type: this.syncType,
            duration: duration,
            success: success,
            syncedCount: this.syncedCount,
            totalCount: this.totalCount,
            message: message
        };

        this.syncHistory.push(syncRecord);
        this.saveState();

        console.log(`✅ Sync Completed - Type: ${this.syncType}, Duration: ${duration}ms, Success: ${success}`);
        
        this.notifyListeners('sync-ended', syncRecord);

        this.syncInProgress = false;
        this.syncType = null;
        this.syncStartTime = null;
        this.syncedCount = 0;
        this.totalCount = 0;
        this.currentSyncCompany = null;

        this.hideSyncNotification();
        
        // Show completion notification
        this.showCompletionNotification(success, message);

        // Process queue if any
        setTimeout(() => this.processQueue(), 500);
    }

    /**
     * Add sync request to queue
     */
    addToQueue(type, totalCount) {
        this.syncQueue.push({
            type: type,
            totalCount: totalCount,
            addedAt: new Date()
        });
        console.log(`📋 Sync queued. Queue size: ${this.syncQueue.length}`);
        // Notify listeners that queue size changed
        try {
            this.notifyListeners('queue-updated', { queueSize: this.syncQueue.length });
        } catch (e) {
            console.warn('Failed to notify queue update listeners:', e);
        }
    }

    /**
     * Process queued sync requests
     */
    processQueue() {
        if (this.syncQueue.length > 0 && !this.syncInProgress) {
            const nextSync = this.syncQueue.shift();
            console.log(`⏳ Processing queued sync: ${nextSync.type}`);
            
            // Emit event to trigger the queued sync
            window.dispatchEvent(new CustomEvent('sync-process-queue', {
                detail: nextSync
            }));
        }
    }

    /**
     * Get queue size
     */
    getQueueSize() {
        return this.syncQueue.length;
    }

    /**
     * Check if sync is in progress
     */
    isSyncInProgress() {
        return this.syncInProgress;
    }

    /**
     * Get current sync status
     */
    getCurrentStatus() {
        return {
            inProgress: this.syncInProgress,
            type: this.syncType,
            startTime: this.syncStartTime,
            syncedCount: this.syncedCount,
            totalCount: this.totalCount,
            currentCompany: this.currentSyncCompany,
            progress: this.totalCount > 0 ? (this.syncedCount / this.totalCount) * 100 : 0,
            queueSize: this.syncQueue.length
        };
    }

    /**
     * Get sync history
     */
    getSyncHistory(limit = 10) {
        return this.syncHistory.slice(-limit).reverse();
    }

    /**
     * Add listener for sync state changes
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(event, data) {
        console.log(`📢 SyncStateManager firing event: ${event}`, { listeners: this.listeners.length, data });
        this.listeners.forEach(listener => {
            try {
                listener({ event, data, timestamp: new Date() });
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }

    /**
     * Show sync in progress notification
     */
    showSyncNotification() {
        if (window.notificationService) {
            // Remove previous notification if exists
            if (this.notificationId) {
                this.hideSyncNotification();
            }

            const syncTypeLabel = this.syncType === 'full' ? 'Full' : this.syncType === 'incremental' ? 'Incremental' : 'Company';
            const message = this.totalCount > 0 
                ? `${syncTypeLabel} Sync Started - Syncing ${this.totalCount} companies...`
                : `${syncTypeLabel} Sync Started`;
            
            const elem = window.notificationService.show(message, 'info', '🔄 Sync in Progress', 0); // 0 = no auto-dismiss
            this.notificationId = elem.id || 'sync-notification';
        }
    }

    /**
     * Update sync notification with progress
     */
    updateSyncNotification() {
        if (!this.notificationId) return;

        const progressMsg = this.totalCount > 0 
            ? `${this.syncedCount}/${this.totalCount} companies synced`
            : 'Processing...';

        const fullMsg = this.currentSyncCompany 
            ? `Syncing: ${this.currentSyncCompany} (${progressMsg})`
            : progressMsg;

        // Update notification message using data-id selector
        const notif = document.querySelector(`[data-id="${this.notificationId}"]`);
        if (notif) {
            const msgElem = notif.querySelector('.notification-message');
            if (msgElem) {
                msgElem.textContent = fullMsg;
            }
        }
    }

    /**
     * Hide sync notification
     */
    hideSyncNotification() {
        if (this.notificationId && window.notificationService) {
            const notif = document.getElementById(this.notificationId);
            if (notif && notif.parentNode) {
                window.notificationService.remove(notif);
            }
            this.notificationId = null;
        }
    }

    /**
     * Show queued notification
     */
    showQueuedNotification() {
        if (window.notificationService) {
            window.notificationService.show(
                `Sync queued. ${this.syncQueue.length} request(s) waiting...`,
                'warning',
                '⏳ Sync Queued',
                4000
            );
        }
    }

    /**
     * Show completion notification
     */
    showCompletionNotification(success, message) {
        if (window.notificationService) {
            const duration = this.syncStartTime ? Math.round((Date.now() - this.syncStartTime.getTime()) / 1000) : 0;
            const durationStr = duration > 60 ? `${Math.round(duration / 60)}m ${duration % 60}s` : `${duration}s`;
            
            const msg = message || `${this.syncedCount}/${this.totalCount} companies synced in ${durationStr}`;
            
            if (success) {
                window.notificationService.success(msg, '✅ Sync Complete', 4000);
            } else {
                window.notificationService.error(msg, '❌ Sync Failed', 5000);
            }

            // Also fire OS-level system notification
            if (typeof window.notificationService.system === 'function') {
                const title = success ? 'Talliffy — Sync Complete' : 'Talliffy — Sync Failed';
                window.notificationService.system(title, msg);
            }
        }
    }
}

// Create global instance
window.syncStateManager = new SyncStateManager();
