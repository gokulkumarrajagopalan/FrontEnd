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
            this.showSyncError(error);
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
    }

    /**
     * Initialize sync from config
     */
    async initializeSync() {
        try {
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
    triggerSync() {
        console.log('🔄 Triggering manual sync...');
        if (window.electronAPI) {
            window.electronAPI.triggerSync(this.config);
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem('syncConfig', JSON.stringify(this.config));
        console.log('⚙️ Config updated:', this.config);
    }

    /**
     * Handle sync update from worker
     */
    handleSyncUpdate(data) {
        const { internet, tally, host, port, timestamp } = data;

        // Store last status
        this.lastStatus = {
            internet: internet,
            tally: tally,
            host: host,
            port: port,
            timestamp: new Date(timestamp)
        };

        // Create UI update
        const syncStatus = {
            internet: internet ? '✅ Online' : '❌ Offline',
            tally: tally ? '✅ Connected' : '❌ Disconnected',
            host: `${host}:${port}`,
            timestamp: new Date(timestamp).toLocaleTimeString(),
            internetBool: internet,
            tallyBool: tally
        };

        console.log('Sync Status:', syncStatus);

        // Update UI components in real-time
        this.updateStatusDisplay();

        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('sync-status-updated', {
            detail: syncStatus
        }));

        // Show notification
        if (window.notificationService) {
            const status = internet && tally ? 'success' : 'warning';
            const message = `Internet: ${syncStatus.internet} | Tally: ${syncStatus.tally}`;
            window.notificationService.show(message, status);
        }
    }

    /**
     * Show sync error
     */
    showSyncError(error) {
        if (window.notificationService) {
            window.notificationService.show(`Sync Error: ${error}`, 'error');
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

// Initialize sync controller when app loads
const syncController = new SyncController();

// Make it globally available
window.syncController = syncController;
