/**
 * Application Initialization Script
 * Handles app startup and splash screen management
 */

console.log('🔄 Scripts loaded, waiting for DOM ready...');
console.log('📍 document.readyState:', document.readyState);

// Global error handler - log to console only
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
});

function hideSplash() {
    console.log('🎬 Hiding splash screen');
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (splash.parentNode) splash.remove();
        }, 300);
    }
}

function initializeApp() {
    console.log('📍 Attempting to initialize app...');
    console.log('   window.app exists?', typeof window.app !== 'undefined');

    if (window.app && typeof window.app.init === 'function') {
        console.log('✅ App object exists and init is callable, calling init()');
        try {
            window.app.init();
            console.log('✅ App.init() called successfully');
            setTimeout(hideSplash, 500);

            // Start auto-sync scheduler if user is authenticated
            setTimeout(() => {
                if (window.authService && window.authService.isAuthenticated() && window.syncScheduler) {
                    console.log('🔄 Starting auto-sync scheduler...');
                    window.syncScheduler.start();
                }
            }, 2000); // Wait 2 seconds after app init
        } catch (e) {
            console.error('❌ Error calling app.init():', e);
        }
    } else {
        console.error('❌ window.app does not exist or init is not callable!');
        console.log('   typeof window.app:', typeof window.app);
        console.log('   window.app:', window.app);
    }
}

// Method 1: DOMContentLoaded (most reliable)
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired');
    initializeApp();
});

// Method 2: Immediate check for already-loaded DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('✅ DOM already ready (readyState=' + document.readyState + '), scheduling init...');
    setTimeout(initializeApp, 50);
}

// Method 3: Final fallback after a delay
setTimeout(() => {
    if (!window.appInitialized) {
        console.warn('⚠️ App not initialized after 2 seconds, forcing init...');
        initializeApp();
    }
}, 2000);

// Additional timeout checks
setTimeout(() => {
    console.log('⏱️ 5 second final check');
    const splash = document.getElementById('splash');
    if (splash) {
        console.warn('⚠️ Splash still present after 5s');
        hideSplash();
    }
}, 5000);
