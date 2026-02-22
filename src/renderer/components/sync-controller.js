/**
 * Tally Sync Controller
 * Handles synchronization with backend Tally server
 */

class SyncController {
    constructor() {
        this.isRunning = false;
        this.lastStatus = {
            internet: false,
            tally: false,
            host: 'localhost',
            port: 9000,
            timestamp: null
        };
        this.config = {
            host: 'localhost',
            port: 9000,
            interval: 30,
            autosync: false
        };
        this.setupListeners();
        this.initializeSync();
    }

    /**
     * Setup IPC listeners for sync events
     */
    setupListeners() {
        if (!window.electronAPI) {
            console.warn('Electron API not available');
            return;
        }

        // Listen for sync updates
        window.electronAPI.onSyncUpdate((data) => {
            console.log('📡 Sync Update:', data);
            this.handleSyncUpdate(data);
        });

        // Listen for sync errors
        window.electronAPI.onSyncError((error) => {
            console.error('❌ Sync Error:', error);
            try {
                this.showSyncError(error);
            } catch (err) {
                console.error('Error handling sync error:', err);
            }
        });

        // Listen for sync started
        window.electronAPI.onSyncStarted((data) => {
            console.log('▶️ Sync Started:', data);
            this.isRunning = true;
            this.updateSyncUI();
        });

        // Listen for sync stopped
        window.electronAPI.onSyncStopped((data) => {
            console.log('⏹️ Sync Stopped:', data);
            this.isRunning = false;
            this.updateSyncUI();
        });

        // Listen for sync status
        window.electronAPI.onSyncStatus((data) => {
            console.log('📊 Sync Status:', data);
            this.isRunning = data.running;
            this.updateSyncUI();
        });

        // Listen for queued sync to be processed
        window.addEventListener('sync-process-queue', (e) => {
            const syncType = e.detail.type;
            console.log(`⏳ Processing queued sync: ${syncType}`);
            this.triggerSync(syncType);
        });
    }

    /**
     * Initialize sync from config
     */
    async initializeSync() {
        try {
            // Check if localStorage is available (renderer process only)
            if (typeof localStorage === 'undefined') {
                console.warn('⚠️ localStorage not available - skipping sync initialization');
                return;
            }

            // Load config from localStorage
            const savedConfig = localStorage.getItem('syncConfig');
            if (savedConfig) {
                this.config = JSON.parse(savedConfig);
            }

            // Check initial sync status
            const status = await window.electronAPI.getSyncStatus();
            this.isRunning = status.running;
            this.updateSyncUI();

            // Auto-start if configured
            if (this.config.autosync && !this.isRunning) {
                this.startSync();
            }
        } catch (error) {
            console.error('Error initializing sync:', error);
        }
    }

    /**
     * Start synchronization
     */
    startSync() {
        console.log('🚀 Starting sync...');
        if (window.electronAPI) {
            window.electronAPI.startSync(this.config);
        }
    }

    /**
     * Stop synchronization
     */
    stopSync() {
        console.log('🛑 Stopping sync...');
        if (window.electronAPI) {
            window.electronAPI.stopSync();
        }
    }

    /**
     * Trigger manual sync
     */
    triggerSync(syncType = 'manual') {
        console.log(`🔄 Triggering ${syncType} sync...`);
        if (window.electronAPI) {
            window.electronAPI.triggerSync({ ...this.config, syncType });
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Only save to localStorage if available (renderer process)
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('syncConfig', JSON.stringify(this.config));
        }

        console.log('⚙️ Config updated:', this.config);
    }

    /**
     * Handle sync update from worker
     */
    handleSyncUpdate(data) {
        const { internet, tally, host, port, timestamp, companyName, syncType, status: syncOperationStatus } = data;

        // Selective update to prevent overwriting with undefined
        if (internet !== undefined) this.lastStatus.internet = internet;
        if (tally !== undefined) this.lastStatus.tally = tally;
        if (host !== undefined) this.lastStatus.host = host;
        if (port !== undefined) this.lastStatus.port = port;
        if (companyName !== undefined) this.lastStatus.companyName = companyName;
        if (syncType !== undefined) this.lastStatus.syncType = syncType;
        if (syncOperationStatus !== undefined) this.lastStatus.syncStatus = syncOperationStatus;

        this.lastStatus.timestamp = timestamp ? new Date(timestamp) : new Date();

        // Create UI status object with safe falling back
        const currentInternet = this.lastStatus.internet;
        const currentTally = this.lastStatus.tally;
        const currentHost = this.lastStatus.host || 'localhost';
        const currentPort = this.lastStatus.port || 9000;

        const syncStatus = {
            internet: currentInternet ? '✅ Online' : '❌ Offline',
            tally: currentTally ? '✅ Connected' : '❌ Disconnected',
            host: `${currentHost}:${currentPort}`,
            timestamp: this.lastStatus.timestamp.toLocaleTimeString(),
            internetBool: currentInternet,
            tallyBool: currentTally,
            companyName: this.lastStatus.companyName,
            syncType: this.lastStatus.syncType,
            syncStatus: this.lastStatus.syncStatus
        };

        console.log('Sync Status:', syncStatus);

        // Update UI components in real-time
        this.updateStatusDisplay();

        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('sync-status-updated', {
            detail: syncStatus
        }));

        // Show notification with company information
        if (window.notificationService) {
            let message = '';
            let notifStatus = 'info';

            // Build notification message based on sync operation status
            if (syncOperationStatus === 'started' && companyName) {
                message = `🔄 Syncing ${companyName}...`;
                notifStatus = 'info';
            } else if (syncOperationStatus === 'completed' && companyName) {
                message = `✅ Sync completed for ${companyName}`;
                notifStatus = 'success';
            } else if (syncOperationStatus === 'failed' && companyName) {
                message = `❌ Sync failed for ${companyName}`;
                notifStatus = 'error';
            } else {
                // Default connection status notification
                const connectionStatus = internet && tally ? 'success' : 'warning';
                message = companyName
                    ? `${companyName} - Internet: ${syncStatus.internet} | Tally: ${syncStatus.tally}`
                    : `Internet: ${syncStatus.internet} | Tally: ${syncStatus.tally}`;
                notifStatus = connectionStatus;
            }

            window.notificationService.show(message, notifStatus);
        }
    }

    /**
     * Show sync error
     */
    showSyncError(error) {
        try {
            if (window.notificationService) {
                // Extract company name from error if available
                const companyName = this.lastStatus.companyName;
                const errorMessage = companyName
                    ? `❌ Sync Error (${companyName}): ${error}`
                    : `❌ Sync Error: ${error}`;
                window.notificationService.show(errorMessage, 'error');
            } else {
                console.error('🔔 Notification service not available:', error);
            }
        } catch (err) {
            console.error('Error showing sync notification:', err);
        }
    }

    /**
     * Update sync UI components
     */
    updateSyncUI() {
        const syncButton = document.getElementById('syncButton');
        const syncStatus = document.getElementById('syncStatus');

        if (syncButton) {
            if (this.isRunning) {
                syncButton.classList.add('sync-active');
                syncButton.textContent = '⏹️ Stop Sync';
                syncButton.onclick = () => this.stopSync();
            } else {
                syncButton.classList.remove('sync-active');
                syncButton.textContent = '▶️ Start Sync';
                syncButton.onclick = () => this.startSync();
            }
        }

        if (syncStatus) {
            syncStatus.textContent = this.isRunning ? '🟢 Syncing' : '🔴 Stopped';
            syncStatus.className = this.isRunning ? 'sync-running' : 'sync-stopped';
        }
    }

    /**
     * Update status display across UI
     */
    updateStatusDisplay() {
        // Update status cards
        const internetStatus = document.getElementById('internetStatus');
        const tallyStatus = document.getElementById('tallyStatus');
        const lastUpdateTime = document.getElementById('lastUpdateTime');
        const syncCompanyName = document.getElementById('syncCompanyName');

        if (internetStatus) {
            internetStatus.innerHTML = this.lastStatus.internet
                ? '<span class="status-label">🌐 Internet</span><span class="status-badge online">✅ CONNECTED</span>'
                : '<span class="status-label">🌐 Internet</span><span class="status-badge offline">❌ DISCONNECTED</span>';
        }

        if (tallyStatus) {
            tallyStatus.innerHTML = this.lastStatus.tally
                ? '<span class="status-label">🗄️ Tally Server</span><span class="status-badge online">✅ CONNECTED</span>'
                : '<span class="status-label">🗄️ Tally Server</span><span class="status-badge offline">❌ DISCONNECTED</span>';
        }

        if (lastUpdateTime) {
            const timeStr = this.lastStatus.timestamp
                ? this.lastStatus.timestamp.toLocaleTimeString()
                : 'Never';
            lastUpdateTime.textContent = timeStr;
        }

        // Show current company being synced
        if (syncCompanyName && this.lastStatus.companyName) {
            const statusIcon = this.lastStatus.syncStatus === 'completed' ? '✅'
                : this.lastStatus.syncStatus === 'failed' ? '❌'
                    : this.lastStatus.syncStatus === 'started' ? '🔄' : '📊';
            syncCompanyName.innerHTML = `<span class="status-label">${statusIcon} Company</span><span class="status-value">${this.lastStatus.companyName}</span>`;
        }
    }

    /**
     * Get last status
     */
    getLastStatus() {
        return this.lastStatus;
    }

    /**
     * Get sync status
     */
    getStatus() {
        return {
            running: this.isRunning,
            config: this.config,
            lastStatus: this.lastStatus
        };
    }
}

// Initialize sync controller only in renderer process (browser context)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const syncController = new SyncController();
    // Make it globally available
    window.syncController = syncController;
} else {
    console.warn('⚠️ SyncController not initialized - not in renderer process context');
}
