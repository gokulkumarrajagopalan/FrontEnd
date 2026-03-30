/**
 * Security Policy Script
 * Enforces HTTPS in production environments and basic security measures
 */

(function() {
    'use strict';

    // Enforce HTTPS in production
    if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        window.location.protocol = 'https:';
    }

    // Disable drag-and-drop to prevent file protocol exploitation
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());

    // Block right-click context menu in production
    if (!window.location.search.includes('dev')) {
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
})();
