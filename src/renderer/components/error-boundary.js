/**
 * Error Boundary Component
 * Catches unhandled errors and shows user-friendly messages
 * instead of raw technical stack traces
 */

class ErrorBoundary {
    constructor() {
        this.enabled = true;
        this._recentErrors = [];    // rate-limit tracking
        this._maxToastsPerMinute = 3;
        this.initialize();
        this._injectStyles();
    }

    initialize() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message || 'Unknown error');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || 'Unhandled promise rejection');
        });

        console.log('🛡️ Error Boundary initialized');
    }

    /**
     * Categorize an error and return a user-friendly message
     */
    _categorizeError(error) {
        const msg = (error.message || error.toString() || '').toLowerCase();

        // ── Silently suppress (log only, no toast) ──
        const silentPatterns = [
            'failed to fetch',
            'network request failed',
            'net::err_',
            'load failed',
            'resizeobserver',
            'script error',
            'non-error promise rejection',
            'the operation was aborted',
            'abortcontroller',
            'cancelled',
            'the user aborted',
            'loading chunk',
            'dynamically imported module',
        ];
        for (const pat of silentPatterns) {
            if (msg.includes(pat)) return { suppress: true };
        }

        // ── Network / connectivity ──
        if (msg.includes('networkerror') || msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('err_connection')) {
            return {
                title: 'Connection Issue',
                friendly: 'Unable to connect. Please check your internet connection and try again.',
                icon: '🌐'
            };
        }

        // ── Auth / session ──
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('session expired')) {
            return {
                title: 'Session Expired',
                friendly: 'Your session has expired. Please log in again.',
                icon: '🔒'
            };
        }

        // ── Permission / forbidden ──
        if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission')) {
            return {
                title: 'Access Denied',
                friendly: 'You don\'t have permission to perform this action.',
                icon: '🚫'
            };
        }

        // ── Not found ──
        if (msg.includes('404') || msg.includes('not found')) {
            return {
                title: 'Not Found',
                friendly: 'The requested resource could not be found.',
                icon: '🔍'
            };
        }

        // ── Server errors ──
        if (msg.includes('500') || msg.includes('internal server') || msg.includes('502') || msg.includes('503') || msg.includes('server error')) {
            return {
                title: 'Server Error',
                friendly: 'Our server encountered an issue. Please try again in a moment.',
                icon: '⚙️'
            };
        }

        // ── DOM / null reference (very common, not useful to user) ──
        if (msg.includes('cannot read properties of null') || msg.includes('cannot read properties of undefined') ||
            msg.includes('null is not an object') || msg.includes('undefined is not an object') ||
            msg.includes("cannot set properties of null") || msg.includes("cannot set property")) {
            return {
                title: 'Display Error',
                friendly: 'A display error occurred. The page may need to be refreshed.',
                icon: '🔄'
            };
        }

        // ── Type errors (generic coding bugs) ──
        if (msg.includes('typeerror') || msg.includes('is not a function') || msg.includes('is not defined')) {
            return {
                title: 'Something Went Wrong',
                friendly: 'An unexpected error occurred. Please refresh the page if the issue persists.',
                icon: '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>'
            };
        }

        // ── Tally: not running / connection refused ──
        if (msg.includes('tally is not') || msg.includes('tally not') || (msg.includes('econnrefused') && msg.includes('9000'))) {
            return {
                title: 'Tally Not Running',
                friendly: 'Could not reach Tally. Please open Tally Prime and ensure it is running, then try again.',
                icon: '🔗'
            };
        }

        // ── Tally: XML / data parse error ──
        if (msg.includes('xml') || msg.includes('parse error') || msg.includes('invalid xml')) {
            return {
                title: 'Tally Data Error',
                friendly: 'Received an unexpected response from Tally. Please check Tally is configured correctly.',
                icon: '📄'
            };
        }

        // ── Tally: sync / general tally ──
        if (msg.includes('tally') || msg.includes('sync failed') || msg.includes('sync error')) {
            return {
                title: 'Sync Error',
                friendly: 'There was a problem communicating with Tally. Please ensure Tally is running and try again.',
                icon: '🔗'
            };
        }

        // ── Fallback: generic friendly message ──
        return {
            title: 'Something Went Wrong',
            friendly: 'An unexpected error occurred. Please try again or refresh the page.',
            icon: '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>'
        };
    }

    /**
     * Rate-limit: prevent toast spam (max N per minute)
     */
    _isRateLimited() {
        const now = Date.now();
        this._recentErrors = this._recentErrors.filter(t => now - t < 60000);
        if (this._recentErrors.length >= this._maxToastsPerMinute) {
            return true;
        }
        this._recentErrors.push(now);
        return false;
    }

    handleError(error) {
        if (!this.enabled) return;

        // Always log the full technical error for debugging
        console.error('🔥 Error Boundary caught:', error);

        const category = this._categorizeError(error);

        // Suppress silently (already console.error'd above)
        if (category.suppress) return;

        // Rate-limit toasts
        if (this._isRateLimited()) {
            console.warn('⚡ Error toast rate-limited');
            return;
        }

        this.showErrorToast(category);

        // Log to logger service if available
        if (window.loggerApp) {
            window.loggerApp.error('Unhandled Exception', error);
        }
    }

    showErrorToast({ title, friendly, icon }) {
        const container = document.getElementById('error-boundary-container') || this.createContainer();
        const id = 'eb-toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = 'error-boundary-toast';
        toast.innerHTML = `
            <div class="error-boundary-content">
                <div class="error-boundary-icon">${icon}</div>
                <div class="error-boundary-message">
                    <h4>${title}</h4>
                    <p>${friendly}</p>
                </div>
                <button class="error-boundary-close" onclick="document.getElementById('${id}')?.remove()" title="Dismiss">×</button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-dismiss after 6 seconds with fade
        setTimeout(() => {
            if (toast.isConnected) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(8px)';
                setTimeout(() => toast.remove(), 350);
            }
        }, 6000);
    }

    _injectStyles() {
        if (document.getElementById('error-boundary-styles')) return;
        const style = document.createElement('style');
        style.id = 'error-boundary-styles';
        style.textContent = `
            #error-boundary-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 420px;
                pointer-events: none;
            }
            .error-boundary-toast {
                pointer-events: all;
                background: rgba(255,255,255,0.92);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(226,232,240,0.8);
                border-left: 4px solid #ef4444;
                border-radius: 16px;
                box-shadow: 0 12px 40px -12px rgba(0,0,0,0.18);
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.35s ease, transform 0.35s ease;
                animation: eb-slide-in 0.4s cubic-bezier(0.16,1,0.3,1);
            }
            @keyframes eb-slide-in {
                from { opacity: 0; transform: translateY(16px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .error-boundary-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 16px;
            }
            .error-boundary-icon {
                font-size: 22px;
                flex-shrink: 0;
                margin-top: 1px;
            }
            .error-boundary-message {
                flex: 1;
                min-width: 0;
            }
            .error-boundary-message h4 {
                margin: 0 0 3px;
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
                font-family: Inter, system-ui, sans-serif;
            }
            .error-boundary-message p {
                margin: 0;
                font-size: 12px;
                color: #475569;
                line-height: 1.5;
                font-family: Inter, system-ui, sans-serif;
            }
            .error-boundary-close {
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 6px;
                transition: all 0.15s;
                flex-shrink: 0;
                margin-top: -2px;
            }
            .error-boundary-close:hover {
                background: #f1f5f9;
                color: #475569;
            }
        `;
        document.head.appendChild(style);
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
