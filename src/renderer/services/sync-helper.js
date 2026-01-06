/**
 * Sync Helper - Utility to get settings and trigger sync
 */

class SyncHelper {
    /**
     * Get app settings from localStorage
     */
    static getSettings() {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            return {
                tallyPort: appSettings.tallyPort || 9000,
                syncInterval: appSettings.syncInterval || 30
            };
        } catch (error) {
            console.error('Error reading settings:', error);
            return {
                tallyPort: 9000,
                syncInterval: 30
            };
        }
    }

    /**
     * Trigger sync with current settings
     */
    static triggerSync() {
        const settings = this.getSettings();
        console.log('📤 Triggering sync with settings:', settings);
        
        if (window.electronAPI && window.electronAPI.triggerSync) {
            window.electronAPI.triggerSync(settings);
        } else {
            console.warn('⚠️ electronAPI.triggerSync not available');
        }
    }

    /**
     * Start sync with current settings
     */
    static startSync() {
        const settings = this.getSettings();
        console.log('▶️ Starting sync with settings:', settings);
        
        if (window.electronAPI && window.electronAPI.startSync) {
            window.electronAPI.startSync(settings);
        } else {
            console.warn('⚠️ electronAPI.startSync not available');
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SyncHelper = SyncHelper;
}
