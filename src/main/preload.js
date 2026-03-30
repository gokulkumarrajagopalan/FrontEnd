const isDev = process.argv.includes('--dev');

if (isDev) console.log('🔥 Preload script starting...');

// ── IPC Channel Whitelists ──
const ALLOWED_SEND_CHANNELS = [
    'start-sync',
    'stop-sync',
    'check-sync-status',
    'trigger-sync',
    'update-sync-settings',
    'check-for-updates',
    'quit-and-install-update'
];

const ALLOWED_INVOKE_CHANNELS = [
    'get-system-info',
    'get-backend-url',
    'save-config',
    'get-sync-status',
    'fetch-license',
    'check-tally-connection',
    'fetch-companies',
    'sync-groups',
    'sync-ledgers',
    'sync-currencies',
    'sync-cost-categories',
    'sync-cost-centers',
    'sync-voucher-types',
    'sync-tax-units',
    'sync-units',
    'sync-stock-groups',
    'sync-stock-categories',
    'sync-stock-items',
    'sync-godowns',
    'sync-vouchers',
    'sync-bills-outstanding',
    'incremental-sync',
    'reconcile-data',
    'fetch-master-data',
    'show-system-notification'
];

const ALLOWED_RECEIVE_CHANNELS = [
    'sync-update',
    'sync-error',
    'sync-started',
    'sync-stopped',
    'sync-status',
    'settings-error',
    'update-message',
    'update-available',
    'update-not-available',
    'update-error',
    'download-progress',
    'update-downloaded'
];

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
        // Platform info (static, safe to expose)
        platform: process.platform,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        electronVersion: process.versions.electron,
        getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

        // Configuration
        getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
        backendUrl: ipcRenderer.sendSync('get-backend-url-sync'),
        saveConfig: (config) => ipcRenderer.invoke('save-config', config),

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
        },

        // ── Whitelisted generic IPC (for backward compat) ──
        send: (channel, data) => {
            if (!ALLOWED_SEND_CHANNELS.includes(channel)) {
                console.error(`IPC send blocked: channel '${channel}' not whitelisted`);
                return;
            }
            ipcRenderer.send(channel, data);
        },
        on: (channel, func) => {
            if (!ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
                console.error(`IPC on blocked: channel '${channel}' not whitelisted`);
                return;
            }
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        invoke: (channel, data) => {
            if (!ALLOWED_INVOKE_CHANNELS.includes(channel)) {
                return Promise.reject(new Error(`IPC invoke blocked: channel '${channel}' not whitelisted`));
            }
            return ipcRenderer.invoke(channel, data);
        },
        removeListener: (channel) => {
            if (!ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
                console.error(`IPC removeListener blocked: channel '${channel}' not whitelisted`);
                return;
            }
            ipcRenderer.removeAllListeners(channel);
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
