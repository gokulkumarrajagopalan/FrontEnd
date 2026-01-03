/**
 * Notification System
 * Handles toast notifications for success, error, warning, and info messages
 */

class NotificationService {
    constructor() {
        this.notifications = [];
        this.initializeContainer();
    }

    initializeContainer() {
        // Check if container already exists
        if (document.getElementById('notification-container')) return;

        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(container);

        // Add styles
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                #notification-container {
                    position: fixed !important;
                    top: 20px !important;
                    right: 20px !important;
                    z-index: 10000 !important;
                    pointer-events: none !important;
                    max-width: 400px !important;
                }

                .notification {
                    background: white !important;
                    border-radius: 12px !important;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                    padding: 16px 20px !important;
                    margin-bottom: 12px !important;
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 12px !important;
                    animation: slideIn 0.3s ease !important;
                    pointer-events: all !important;
                    border-left: 4px solid #4CAF50 !important;
                    min-width: 300px !important;
                    backdrop-filter: blur(10px) !important;
                }

                .notification.success {
                    border-left-color: #4CAF50 !important;
                    background: linear-gradient(135deg, #ffffff 0%, #f1f8f4 100%) !important;
                }

                .notification.success .notification-icon {
                    color: #4CAF50 !important;
                    font-size: 24px !important;
                }

                .notification.error {
                    border-left-color: #f44336 !important;
                    background: linear-gradient(135deg, #ffffff 0%, #fef1f0 100%) !important;
                }

                .notification.error .notification-icon {
                    color: #f44336 !important;
                    font-size: 24px !important;
                }

                .notification.warning {
                    border-left-color: #ff9800 !important;
                    background: linear-gradient(135deg, #ffffff 0%, #fff8f1 100%) !important;
                }

                .notification.warning .notification-icon {
                    color: #ff9800 !important;
                    font-size: 24px !important;
                }

                .notification.info {
                    border-left-color: var(--primary-500) !important;
                    background: linear-gradient(135deg, #ffffff 0%, #f1f8ff 100%) !important;
                }

                .notification.info .notification-icon {
                    color: var(--primary-500) !important;
                    font-size: 24px !important;
                }

                .notification-icon {
                    font-size: 24px !important;
                    flex-shrink: 0 !important;
                    min-width: 28px !important;
                    text-align: center !important;
                    line-height: 1 !important;
                }

                .notification-content {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                }

                .notification-title {
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                    font-size: 14px !important;
                    line-height: 1.4 !important;
                    margin: 0 !important;
                }

                .notification-message {
                    color: #4b5563 !important;
                    font-size: 13px !important;
                    line-height: 1.5 !important;
                    margin: 0 !important;
                }

                .notification-close {
                    cursor: pointer !important;
                    color: #9ca3af !important;
                    font-size: 24px !important;
                    line-height: 1 !important;
                    padding: 0 !important;
                    background: none !important;
                    border: none !important;
                    flex-shrink: 0 !important;
                    transition: color 0.2s !important;
                    width: 24px !important;
                    height: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .notification-close:hover {
                    color: #1f2937 !important;
                    transform: scale(1.1) !important;
                    background: rgba(0, 0, 0, 0.05) !important;
                    border-radius: 4px !important;
                }

                .notification-progress {
                    height: 3px !important;
                    background: rgba(0, 0, 0, 0.1) !important;
                    border-radius: 2px !important;
                    overflow: hidden !important;
                    margin-top: 8px !important;
                }

                .notification-progress-bar {
                    height: 100% !important;
                    background: currentColor !important;
                    animation: progress linear forwards !important;
                    width: 100% !important;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(450px) !important;
                        opacity: 0 !important;
                    }
                    to {
                        transform: translateX(0) !important;
                        opacity: 1 !important;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0) scale(1) !important;
                        opacity: 1 !important;
                    }
                    to {
                        transform: translateX(450px) scale(0.95) !important;
                        opacity: 0 !important;
                    }
                }

                @keyframes progress {
                    from {
                        width: 100% !important;
                    }
                    to {
                        width: 0% !important;
                    }
                }

                @media (max-width: 600px) {
                    #notification-container {
                        left: 12px !important;
                        right: 12px !important;
                        max-width: none !important;
                        top: 12px !important;
                    }
                    
                    .notification {
                        min-width: auto !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    show(message, type = 'info', title = null, duration = 4000) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cursor = 'pointer';

        let titleText = title;
        if (!titleText) {
            titleText = {
                success: 'Success',
                error: 'Error',
                warning: 'Warning',
                info: 'Information'
            }[type] || 'Notification';
        }

        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                ${titleText ? `<div class="notification-title">${this.escapeHtml(titleText)}</div>` : ''}
                <div class="notification-message">${this.escapeHtml(message)}</div>
                ${duration > 0 ? `<div class="notification-progress" style="--duration: ${duration}ms;">
                    <div class="notification-progress-bar" style="animation-duration: ${duration}ms; color: ${this.getProgressColor(type)};"></div>
                </div>` : ''}
            </div>
            <button class="notification-close" title="Close notification">×</button>
        `;

        const closeBtn = notification.querySelector('.notification-close');
        
        // Close button click handler
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(notification);
        });
        
        // Click on notification to close
        notification.addEventListener('click', (e) => {
            if (e.target === notification || e.target.closest('.notification-content')) {
                this.remove(notification);
            }
        });
        
        // Add outside click handler to close notification
        const outsideClickHandler = (e) => {
            if (!notification.contains(e.target) && notification.parentNode) {
                this.remove(notification);
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        
        // Store the handler on the notification element for cleanup
        notification._closeHandler = outsideClickHandler;
        
        // Delay outside click handler to avoid immediate closure
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 100);

        const container = document.getElementById('notification-container');
        if (!container) {
            console.warn('⚠️ NotificationService: notification-container not found in DOM');
            // Create container if it doesn't exist
            const newContainer = document.createElement('div');
            newContainer.id = 'notification-container';
            newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            document.body.appendChild(newContainer);
            newContainer.appendChild(notification);
        } else {
            container.appendChild(notification);
        }

        this.notifications.push(notification);

        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        return notification;
    }

    success(message, title = 'Success', duration = 4000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = 'Error', duration = 5000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = 'Warning', duration = 4500) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = 'Information', duration = 3500) {
        return this.show(message, 'info', title, duration);
    }

    remove(notification) {
        // Remove outside click listener if it exists
        if (notification._closeHandler) {
            document.removeEventListener('click', notification._closeHandler);
        }
        
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    clear() {
        this.notifications.forEach(n => this.remove(n));
    }

    getProgressColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#5E86BA'
        };
        return colors[type] || colors.info;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Create global notification instance
window.notificationService = new NotificationService();
