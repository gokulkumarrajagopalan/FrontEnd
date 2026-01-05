/**
 * Offline Mode Queue Service
 * Queues API calls when offline and syncs when connection restored
 * @version 1.0.0
 */

class OfflineQueue {
    constructor() {
        this.queue = [];
        this.isOnline = navigator.onLine;
        this.maxQueueSize = 500;
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
        this.isSyncing = false;
        
        this.setupEventListeners();
        this.loadQueue();
    }

    /**
     * Setup online/offline event listeners
     */
    setupEventListeners() {
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());
    }

    /**
     * Handle online event
     */
    onOnline() {
        console.log('📡 Network connected. Starting queue sync...');
        this.isOnline = true;
        this.syncQueue();
    }

    /**
     * Handle offline event
     */
    onOffline() {
        console.log('📡 Network disconnected. Queuing requests...');
        this.isOnline = false;
    }

    /**
     * Enqueue an API request
     */
    enqueue(config) {
        if (this.queue.length >= this.maxQueueSize) {
            console.warn('⚠️ Queue is full. Oldest item will be removed.');
            this.queue.shift();
        }

        const queueItem = {
            id: `${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
            config,
            retries: 0,
            lastError: null
        };

        this.queue.push(queueItem);
        this.saveQueue();

        console.log(`📤 Request queued (Queue size: ${this.queue.length})`);
        
        if (this.isOnline) {
            this.syncQueue();
        }

        return queueItem.id;
    }

    /**
     * Sync entire queue
     */
    async syncQueue() {
        if (this.isSyncing || this.queue.length === 0 || !this.isOnline) {
            return;
        }

        this.isSyncing = true;

        try {
            console.log(`🔄 Starting queue sync (${this.queue.length} items)...`);

            const successfulIds = [];

            for (const item of this.queue) {
                try {
                    await this.executeQueuedRequest(item);
                    successfulIds.push(item.id);
                } catch (error) {
                    console.warn(`⚠️ Failed to sync ${item.id}:`, error.message);
                    item.lastError = error.message;
                    item.retries++;

                    if (item.retries >= this.retryAttempts) {
                        console.error(`❌ Max retries exceeded for ${item.id}. Removing from queue.`);
                        successfulIds.push(item.id); // Remove from queue
                    }
                }
            }

            // Remove successful items
            this.queue = this.queue.filter(item => !successfulIds.includes(item.id));
            this.saveQueue();

            console.log(`✅ Queue sync complete. ${this.queue.length} items remaining.`);
        } catch (error) {
            console.error('❌ Queue sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Execute a queued request
     * @private
     */
    async executeQueuedRequest(item) {
        const { config } = item;

        const response = await fetch(config.url, {
            method: config.method || 'GET',
            headers: config.headers || {},
            body: config.body ? JSON.stringify(config.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Clear queue
     */
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        console.log('✅ Queue cleared');
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            queueSize: this.queue.length,
            isSyncing: this.isSyncing,
            items: this.queue.map(item => ({
                id: item.id,
                timestamp: item.timestamp,
                retries: item.retries,
                lastError: item.lastError,
                url: item.config.url
            }))
        };
    }

    /**
     * Save queue to localStorage
     * @private
     */
    saveQueue() {
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
        } catch (error) {
            console.warn('Failed to save queue to storage:', error);
        }
    }

    /**
     * Load queue from localStorage
     * @private
     */
    loadQueue() {
        try {
            const stored = localStorage.getItem('offlineQueue');
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`📥 Loaded ${this.queue.length} queued items from storage`);
            }
        } catch (error) {
            console.warn('Failed to load queue from storage:', error);
        }
    }

    /**
     * Export queue as JSON
     */
    exportQueue() {
        const dataStr = JSON.stringify(this.queue, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `offline_queue_${new Date().toISOString()}.json`;
        link.click();
    }
}

window.offlineQueue = new OfflineQueue();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineQueue;
}
