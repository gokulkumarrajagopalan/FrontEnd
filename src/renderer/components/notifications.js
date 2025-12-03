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
                .notification {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    padding: 16px 20px;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    animation: slideIn 0.3s ease;
                    pointer-events: all;
                    border-left: 4px solid #4CAF50;
                }

                .notification.success {
                    border-left-color: #4CAF50;
                    background: #f1f8f4;
                }

                .notification.success .notification-icon {
                    color: #4CAF50;
                }

                .notification.error {
                    border-left-color: #f44336;
                    background: #fef1f0;
                }

                .notification.error .notification-icon {
                    color: #f44336;
                }

                .notification.warning {
                    border-left-color: #ff9800;
                    background: #fff8f1;
                }

                .notification.warning .notification-icon {
                    color: #ff9800;
                }

                .notification.info {
                    border-left-color: #2196F3;
                    background: #f1f8ff;
                }

                .notification.info .notification-icon {
                    color: #2196F3;
                }

                .notification-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                    min-width: 24px;
                    text-align: center;
                }

                .notification-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .notification-title {
                    font-weight: 600;
                    color: #333;
                    font-size: 14px;
                }

                .notification-message {
                    color: #666;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .notification-close {
                    cursor: pointer;
                    color: #999;
                    font-size: 20px;
                    line-height: 1;
                    padding: 0;
                    background: none;
                    border: none;
                    flex-shrink: 0;
                    transition: color 0.2s;
                }

                .notification-close:hover {
                    color: #333;
                }

                .notification-progress {
                    height: 2px;
                    background: #ddd;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 8px;
                }

                .notification-progress-bar {
                    height: 100%;
                    background: currentColor;
                    animation: progress linear forwards;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }

                @keyframes progress {
                    to {
                        width: 0;
                    }
                }

                @media (max-width: 600px) {
                    #notification-container {
                        left: 12px;
                        right: 12px;
                        max-width: none;
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
            <button class="notification-close">×</button>
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

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
            info: '#2196F3'
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
