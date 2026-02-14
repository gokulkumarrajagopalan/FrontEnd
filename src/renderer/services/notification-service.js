/**
 * Enhanced Notification Service
 * Provides consistent, beautiful notifications across the application
 */

class NotificationService {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-3 max-w-xs';
        document.body.appendChild(this.container);

        // Inject styles
        this.injectStyles();

        // Request system notification permission
        this.requestSystemPermission();
    }

    requestSystemPermission() {
        if (!('Notification' in window)) {
            console.log('⚠️ This browser does not support system notifications');
            return;
        }

        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('✅ System notification permission granted');
                }
            });
        }
    }

    injectStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                min-width: 260px;
                max-width: 300px;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .notification::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
            }

            .notification-success {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
                color: white;
                border-color: rgba(16, 185, 129, 0.3);
            }

            .notification-error {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
                color: white;
                border-color: rgba(239, 68, 68, 0.3);
            }

            .notification-warning {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%);
                color: white;
                border-color: rgba(245, 158, 11, 0.3);
            }

            .notification-info {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
                color: white;
                border-color: rgba(59, 130, 246, 0.3);
            }

            .notification-icon {
                font-size: 1.125rem;
                line-height: 1;
                flex-shrink: 0;
                margin-top: 0.125rem;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                font-size: 0.8125rem;
                line-height: 1.25;
                margin-bottom: 0.25rem;
            }

            .notification-message {
                font-size: 0.75rem;
                line-height: 1.4;
                opacity: 0.95;
            }

            .notification-close {
                background: none;
                border: none;
                color: currentColor;
                cursor: pointer;
                font-size: 1.125rem;
                line-height: 1;
                padding: 0.25rem;
                border-radius: 0.25rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
            }

            .notification-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(255, 255, 255, 0.3);
                transition: width linear;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            .notification-enter {
                animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .notification-exit {
                animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
        `;
        document.head.appendChild(style);
    }

    show(type, message, title = '', duration = 5000, options = {}) {
        const notification = this.createNotification(type, message, title, duration, options);
        this.notifications.push(notification);
        this.container.appendChild(notification.element);

        // Trigger show animation
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });

        // Auto-hide after duration
        if (duration > 0) {
            notification.timer = setTimeout(() => {
                this.hide(notification.id);
            }, duration);

            // Add progress bar if enabled
            if (options.showProgress !== false) {
                this.addProgressBar(notification, duration);
            }
        }

        return notification.id;
    }

    createNotification(type, message, title, duration, options) {
        const id = Date.now() + Math.random();
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.setAttribute('data-id', id);

        const icon = options.icon || icons[type] || icons.info;
        const showClose = options.closeable !== false;

        element.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            ${showClose ? '<button class="notification-close" aria-label="Close">&times;</button>' : ''}
            ${duration > 0 && options.showProgress !== false ? '<div class="notification-progress"></div>' : ''}
        `;

        // Add close handler
        if (showClose) {
            const closeBtn = element.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => this.hide(id));
        }

        // Add click handler if provided
        if (options.onClick) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                if (!e.target.classList.contains('notification-close')) {
                    options.onClick();
                }
            });
        }

        return {
            id,
            element,
            type,
            message,
            title,
            duration,
            timer: null
        };
    }

    addProgressBar(notification, duration) {
        const progressBar = notification.element.querySelector('.notification-progress');
        if (!progressBar) return;

        progressBar.style.width = '100%';

        // Animate progress bar
        requestAnimationFrame(() => {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        });
    }

    hide(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Add hide animation
        notification.element.classList.add('hide');
        notification.element.classList.remove('show');

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    hideAll() {
        this.notifications.forEach(notification => {
            this.hide(notification.id);
        });
    }

    // Convenience methods
    success(message, title = 'Success', duration = 4000, options = {}) {
        return this.show('success', message, title, duration, options);
    }

    error(message, title = 'Error', duration = 6000, options = {}) {
        return this.show('error', message, title, duration, options);
    }

    // System Notification (OS Toast) — uses Electron native notifications when available
    system(title, body, icon = null) {
        // Prefer Electron's native notification (works even when app is minimized)
        if (window.electronAPI && window.electronAPI.showSystemNotification) {
            window.electronAPI.showSystemNotification({
                title: title || 'Talliffy',
                body: body || '',
                urgency: 'normal'
            }).then(result => {
                if (result.success) {
                    console.log(`🔔 System notification sent (Electron): ${title}`);
                } else {
                    // Fallback to browser notification
                    this._showBrowserNotification(title, body, icon);
                }
            }).catch(() => {
                this._showBrowserNotification(title, body, icon);
            });
            return;
        }

        // Fallback: browser Notification API
        this._showBrowserNotification(title, body, icon);
    }

    // Internal helper: browser Notification API fallback
    _showBrowserNotification(title, body, icon) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            const options = {
                body: body,
                icon: icon || 'assets/brand/talliffy-icon.png',
                silent: false
            };

            try {
                new Notification(title, options);
                console.log(`🔔 System notification sent (Browser): ${title}`);
            } catch (e) {
                console.error('Error sending system notification:', e);
            }
        } else if (Notification.permission !== 'denied') {
            this.requestSystemPermission();
        }
    }

    warning(message, title = 'Warning', duration = 5000, options = {}) {
        return this.show('warning', message, title, duration, options);
    }

    info(message, title = 'Info', duration = 4000, options = {}) {
        return this.show('info', message, title, duration, options);
    }

    // Persistent notifications (don't auto-hide)
    persistent(type, message, title = '', options = {}) {
        return this.show(type, message, title, 0, { ...options, showProgress: false });
    }

    // Loading notification with spinner
    loading(message, title = 'Loading...') {
        return this.show('info', message, title, 0, {
            icon: '<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>',
            closeable: false,
            showProgress: false
        });
    }

    // Update existing notification
    update(id, message, title = '', options = {}) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        const contentEl = notification.element.querySelector('.notification-content');
        if (contentEl) {
            contentEl.innerHTML = `
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            `;
        }

        // Update icon if provided
        if (options.icon) {
            const iconEl = notification.element.querySelector('.notification-icon');
            if (iconEl) {
                iconEl.innerHTML = options.icon;
            }
        }
    }

    // Get notification count by type
    getCount(type = null) {
        if (type) {
            return this.notifications.filter(n => n.type === type).length;
        }
        return this.notifications.length;
    }

    // Clear notifications by type
    clearByType(type) {
        this.notifications
            .filter(n => n.type === type)
            .forEach(n => this.hide(n.id));
    }
}

// Initialize global notification service
if (typeof window !== 'undefined') {
    window.notificationService = new NotificationService();

    // Also create a simpler global function for quick access
    window.notify = {
        success: (msg, title, duration) => window.notificationService.success(msg, title, duration),
        error: (msg, title, duration) => window.notificationService.error(msg, title, duration),
        warning: (msg, title, duration) => window.notificationService.warning(msg, title, duration),
        info: (msg, title, duration) => window.notificationService.info(msg, title, duration),
        system: (title, body, icon) => window.notificationService.system(title, body, icon),
        loading: (msg, title) => window.notificationService.loading(msg, title),
        hide: (id) => window.notificationService.hide(id),
        hideAll: () => window.notificationService.hideAll()
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}