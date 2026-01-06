/**
 * Notification Utility
 * Displays notifications in top-right corner
 */

class NotificationUtil {
    static show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || icons.info}</div>
            <div class="notification-content">
                <p class="notification-message">${message}</p>
            </div>
            <button class="notification-close">×</button>
        `;
        
        container.appendChild(notification);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    static success(message, duration = 4000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    static info(message, duration = 4000) {
        this.show(message, 'info', duration);
    }

    static warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }
}

if (typeof window !== 'undefined') {
    window.NotificationUtil = NotificationUtil;
}
