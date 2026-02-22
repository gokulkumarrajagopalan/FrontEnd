const isDev = process.argv.includes('--dev');

if (isDev) console.log('🔥 Preload script starting...');

let contextBridgeReady = false;
let ipcRendererReady = false;

try {
    if (isDev) console.log('🔥 Attempting to require Electron modules...');
    const { contextBridge, ipcRenderer } = require('electron');
    if (isDev) console.log('🔥 Successfully required contextBridge and ipcRenderer');
    contextBridgeReady = true;
    ipcRendererReady = true;

    if (isDev) console.log('🔥 About to expose API to renderer...');
    contextBridge.exposeInMainWorld('electronAPI', {
        // Send message to main process
        send: (channel, data) => {
            ipcRenderer.send(channel, data);
        },

        // Listen for messages from main process
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },

        // Send message and get response
        invoke: (channel, data) => {
            return ipcRenderer.invoke(channel, data);
        },

        // Remove listener
        removeListener: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        },

        // Platform info
        platform: process.platform,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        electronVersion: process.versions.electron,
        hostname: (() => { try { return require('os').hostname(); } catch (e) { return 'N/A'; } })(),
        processor: (() => { try { const c = require('os').cpus(); return c && c.length ? c[0].model : 'N/A'; } catch (e) { return 'N/A'; } })(),

        // Configuration
        backendUrl: ipcRenderer.sendSync('get-backend-url-sync'),

        // Sync API
        startSync: (config) => {
            ipcRenderer.send('start-sync', config);
        },

        stopSync: () => {
            ipcRenderer.send('stop-sync');
        },

        checkSyncStatus: () => {
            ipcRenderer.send('check-sync-status');
        },

        getSyncStatus: () => {
            return ipcRenderer.invoke('get-sync-status');
        },

        triggerSync: (config) => {
            ipcRenderer.send('trigger-sync', config);
        },

        onSyncUpdate: (callback) => {
            ipcRenderer.on('sync-update', (event, data) => callback(data));
        },

        onSyncError: (callback) => {
            ipcRenderer.on('sync-error', (event, error) => callback(error));
        },

        onSyncStarted: (callback) => {
            ipcRenderer.on('sync-started', (event, data) => callback(data));
        },

        onSyncStopped: (callback) => {
            ipcRenderer.on('sync-stopped', (event, data) => callback(data));
        },

        onSyncStatus: (callback) => {
            ipcRenderer.on('sync-status', (event, data) => callback(data));
        },

        fetchLicense: (config) => {
            return ipcRenderer.invoke('fetch-license', config || {});
        },

        checkTallyConnection: (config) => {
            return ipcRenderer.invoke('check-tally-connection', config || {});
        },

        fetchCompanies: () => {
            return ipcRenderer.invoke('fetch-companies');
        },

        syncGroups: (config) => {
            return ipcRenderer.invoke('sync-groups', config);
        },

        syncLedgers: (config) => {
            return ipcRenderer.invoke('sync-ledgers', config);
        },
        syncCurrencies: (config) => {
            return ipcRenderer.invoke('sync-currencies', config);
        },
        syncCostCategories: (config) => {
            return ipcRenderer.invoke('sync-cost-categories', config);
        },
        syncCostCenters: (config) => {
            return ipcRenderer.invoke('sync-cost-centers', config);
        },
        syncVoucherTypes: (config) => {
            return ipcRenderer.invoke('sync-voucher-types', config);
        },
        syncTaxUnits: (config) => ipcRenderer.invoke("sync-tax-units", config),
        syncUnits: (config) => ipcRenderer.invoke("sync-units", config),
        syncStockGroups: (config) => ipcRenderer.invoke("sync-stock-groups", config),
        syncStockCategories: (config) => ipcRenderer.invoke("sync-stock-categories", config),
        syncStockItems: (config) => ipcRenderer.invoke("sync-stock-items", config),
        syncGodowns: (config) => ipcRenderer.invoke("sync-godowns", config),

        // Voucher sync API
        syncVouchers: (config) => {
            if (isDev) console.log('📡 Preload: Calling sync-vouchers handler...');
            return ipcRenderer.invoke('sync-vouchers', config);
        },

        // Bills Outstanding sync API — syncs Receivables/Payables from Tally to Backend
        syncBillsOutstanding: (config) => {
            if (isDev) console.log('📡 Preload: Calling sync-bills-outstanding handler...');
            return ipcRenderer.invoke('sync-bills-outstanding', config);
        },

        // Incremental sync API
        incrementalSync: (config) => {
            if (isDev) console.log('📡 Preload: Calling incremental-sync handler...');
            return ipcRenderer.invoke('incremental-sync', config);
        },

        // Reconciliation API
        reconcileData: (config) => {
            if (isDev) console.log('📡 Preload: Calling reconcile-data handler...');
            return ipcRenderer.invoke('reconcile-data', config);
        },

        // System Notification (OS-level toast)
        showSystemNotification: (options) => {
            return ipcRenderer.invoke('show-system-notification', options);
        }
    });
    if (isDev) console.log('✅ Preload: electronAPI exposed successfully');
} catch (error) {
    if (isDev) {
        console.error('❌ Preload error during expose:', error);
        console.error('   contextBridgeReady:', contextBridgeReady);
        console.error('   ipcRendererReady:', ipcRendererReady);
        console.error('   Stack:', error.stack);
    }
}
