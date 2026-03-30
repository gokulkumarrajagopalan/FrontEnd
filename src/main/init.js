/**
 * Application Initialization Script
 * Handles app startup and splash screen management
 */

console.log('🔄 Scripts loaded, waiting for DOM ready...');

// Global error handler - prevent crashes, log for diagnostics
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    e.preventDefault();
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

let _initHasRun = false;

function hideSplash() {
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
    // Guard against double initialization
    if (_initHasRun) return;
    _initHasRun = true;
    window.appInitialized = true;

    console.log('📍 Initializing app...');

    if (window.app && typeof window.app.init === 'function') {
        try {
            window.app.init();
            console.log('✅ App.init() called successfully');
            setTimeout(hideSplash, 500);

            // Start auto-sync scheduler if user is authenticated
            setTimeout(() => {
                if (window.authService && window.authService.isAuthenticated() && window.syncScheduler) {
                    window.syncScheduler.start();
                }
            }, 2000);
        } catch (e) {
            console.error('Error calling app.init():', e);
            hideSplash();
        }
    } else {
        console.error('window.app does not exist or init is not callable');
        hideSplash();
    }
}

// Primary: DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Fallback: DOM already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeApp, 0);
}

// Safety net: force init after 3 seconds
setTimeout(() => {
    if (!_initHasRun) {
        console.warn('App not initialized after 3 seconds, forcing...');
        initializeApp();
    }
}, 3000);

// Force-remove splash after 5 seconds no matter what
setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
        console.warn('Splash still present after 5s, removing');
        hideSplash();
    }
}, 5000);
