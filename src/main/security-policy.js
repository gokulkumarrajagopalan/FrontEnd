/**
 * Security Policy Script
 * Enforces HTTPS in production environments
 */

(function() {
    // Enforce HTTPS in production
    if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
        window.location.protocol = 'https:';
    }
})();
