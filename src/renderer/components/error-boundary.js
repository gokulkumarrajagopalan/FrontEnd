/**
 * Error Boundary Component
 * Catches and displays unhandled errors in the renderer process
 */

class ErrorBoundary {
    constructor() {
        this.enabled = true;
        this.initialize();
    }

    initialize() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.reason || 'Unknown error');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || 'Unhandled promise rejection');
        });

        console.log('🛡️ Error Boundary initialized');
    }

    handleError(error) {
        if (!this.enabled) return;

        console.error('🔥 Error Boundary caught error:', error);

        // Don't show UI for network errors or known issues
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
            return;
        }

        this.showErrorToast(error);

        // Log to logger service if available
        if (window.loggerApp) {
            window.loggerApp.error('Unhandled Exception', error);
        }
    }

    showErrorToast(error) {
        const container = document.getElementById('error-boundary-container') || this.createContainer();
        const toast = document.createElement('div');
        toast.className = 'error-boundary-toast';
        toast.innerHTML = `
            <div class="error-boundary-content">
                <div class="error-boundary-icon">⚠️</div>
                <div class="error-boundary-message">
                    <h4>Application Error</h4>
                    <p>${error.message || error.toString()}</p>
                </div>
                <button class="error-boundary-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.isConnected) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    createContainer() {
        const div = document.createElement('div');
        div.id = 'error-boundary-container';
        div.className = 'error-boundary-container';
        document.body.appendChild(div);
        return div;
    }
}

// Initialize and export
window.errorBoundary = new ErrorBoundary();
