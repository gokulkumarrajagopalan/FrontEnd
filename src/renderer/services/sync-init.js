/**
 * Sync Initialization
 * Load this in your main app.js to start the sync system
 */

(function() {
    console.log('🔄 Initializing Sync System...');

    // Wait for auth service to be ready
    function waitForAuthService() {
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (window.authService && window.authService.isAuthenticated()) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 500);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkAuth);
                resolve();
            }, 30000);
        });
    }

    // Initialize sync system
    async function initializeSync() {
        try {
            // Wait for auth to be ready
            await waitForAuthService();

            // Check if user is authenticated
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.log('⚠️ User not authenticated, sync will start after login');
                return;
            }

            console.log('✅ Auth ready, starting sync system...');

            // Load sync service if not already loaded
            if (!window.syncService) {
                console.error('❌ Sync service not loaded');
                return;
            }

            // Start sync system
            await window.syncService.startSyncSystem();

            console.log('✅ Sync System Initialized');
        } catch (error) {
            console.error('❌ Error initializing sync:', error);
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSync);
    } else {
        initializeSync();
    }

    // Also listen for auth changes
    window.addEventListener('auth-changed', (event) => {
        if (event.detail && event.detail.authenticated) {
            console.log('🔄 Auth changed, restarting sync...');
            if (window.syncService) {
                window.syncService.startSyncSystem();
            }
        }
    });
})();
