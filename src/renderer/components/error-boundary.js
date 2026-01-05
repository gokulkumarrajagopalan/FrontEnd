/**
 * Error Boundary Component
 * Catches and handles unhandled errors gracefully
 * @version 1.0.0
 */

class ErrorBoundary {
    constructor() {
        this.errors = [];
        this.setupGlobalErrorHandlers();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Unhandled Promise Rejection:', event.reason);
            this.logError(event.reason);
            this.showErrorUI(event.reason);
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            console.error('❌ Global Error:', event.error);
            this.logError(event.error);
            this.showErrorUI(event.error);
        });

        // Handle errors in try-catch blocks
        if (window.telemetry) {
            window.addEventListener('error', (event) => {
                window.telemetry.trackError(event.error || new Error(event.message));
            });
        }
    }

    /**
     * Log error
     */
    logError(error) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            message: error?.message || String(error),
            stack: error?.stack || '',
            type: error?.name || 'Unknown Error',
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };

        this.errors.push(errorRecord);

        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors = this.errors.slice(-50);
        }

        // Log to logger if available
        if (window.loggerApp) {
            window.loggerApp.error(errorRecord.message, error);
        }
    }

    /**
     * Show error UI
     */
    showErrorUI(error) {
        // Don't show UI for network errors during offline mode
        if (!navigator.onLine && error?.message?.includes('Network')) {
            return;
        }

        const errorContainer = document.getElementById('errorBoundaryContainer');
        if (!errorContainer) {
            this.createErrorContainer();
        }

        const errorUI = document.createElement('div');
        errorUI.className = 'error-boundary-toast';
        errorUI.innerHTML = `
            <div class="error-boundary-content">
                <div class="error-boundary-icon">⚠️</div>
                <div class="error-boundary-message">
                    <h4>Something went wrong</h4>
                    <p>${error?.message || 'An unexpected error occurred'}</p>
                </div>
                <button class="error-boundary-close">✕</button>
            </div>
        `;

        // Add event listener for close button (CSP compliant)
        const closeButton = errorUI.querySelector('.error-boundary-close');
        closeButton.addEventListener('click', () => {
            errorUI.remove();
        });

        document.getElementById('errorBoundaryContainer').appendChild(errorUI);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorUI.parentElement) {
                errorUI.remove();
            }
        }, 10000);
    }

    /**
     * Create error container
     * @private
     */
    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'errorBoundaryContainer';
        container.className = 'error-boundary-container';
        document.body.appendChild(container);
    }

    /**
     * Get error report
     */
    getErrorReport() {
        return {
            timestamp: new Date().toISOString(),
            totalErrors: this.errors.length,
            errors: this.errors,
            appVersion: '1.0.0',
            userAgent: navigator.userAgent
        };
    }

    /**
     * Export error report
     */
    exportErrorReport() {
        const report = this.getErrorReport();
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `error_report_${new Date().toISOString()}.json`;
        link.click();
    }

    /**
     * Clear errors
     */
    clearErrors() {
        this.errors = [];
        console.log('✅ Errors cleared');
    }
}

window.errorBoundary = new ErrorBoundary();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorBoundary;
}
