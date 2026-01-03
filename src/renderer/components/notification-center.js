/**
 * Notification Center
 * Displays a persistent center for viewing all notifications and sync status
 */

class NotificationCenter {
    constructor() {
        this.isOpen = false;
        this.notifications = [];
        this.maxNotifications = 50;
        this.initialized = false;
        this.initializeStyles();
        this.initializeWhenReady();
    }

    /**
     * Initialize UI when DOM is ready
     */
    initializeWhenReady() {
        if (document.body) {
            console.log('📦 NotificationCenter: DOM ready immediately, initializing...');
            this.createUI();
            this.setupListeners();
            this.initialized = true;
            console.log('✅ NotificationCenter initialized immediately');
        } else {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                console.log('📦 NotificationCenter: Waiting for DOMContentLoaded...');
                document.addEventListener('DOMContentLoaded', () => {
                    console.log('📦 NotificationCenter: DOMContentLoaded fired, initializing...');
                    this.createUI();
                    this.setupListeners();
                    this.initialized = true;
                    console.log('✅ NotificationCenter initialized via DOMContentLoaded');
                });
            } else {
                // DOM is already loaded
                console.log('📦 NotificationCenter: DOM ready via setTimeout...');
                setTimeout(() => {
                    this.createUI();
                    this.setupListeners();
                    this.initialized = true;
                    console.log('✅ NotificationCenter initialized via setTimeout');
                }, 100);
            }
        }
    }

    /**
     * Initialize CSS styles for notification center
     */
    initializeStyles() {
        if (document.getElementById('notification-center-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-center-styles';
        style.textContent = `
            .sync-notification-badge {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9998;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                border: 3px solid white;
                font-size: 24px;
            }

            .sync-notification-badge:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }

            .sync-notification-badge.pulsing {
                animation: badgePulse 2s infinite;
            }

            @keyframes badgePulse {
                0%, 100% {
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                }
                50% {
                    box-shadow: 0 4px 25px rgba(102, 126, 234, 0.8);
                }
            }

            .sync-notification-badge-count {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
            }

            .notification-center-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .notification-center-modal.active {
                opacity: 1;
                pointer-events: all;
            }

            .notification-center-panel {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 600px;
                height: 90%;
                max-height: 700px;
                display: flex;
                flex-direction: column;
                animation: slideUp 0.3s ease;
                overflow: hidden;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .notification-center-header {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .notification-center-title {
                font-size: 20px;
                font-weight: bold;
                margin: 0;
            }

            .notification-center-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                cursor: pointer;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            }

            .notification-center-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .notification-center-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }

            .notification-center-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #9ca3af;
                font-size: 16px;
                text-align: center;
                padding: 20px;
            }

            .notification-item {
                border-bottom: 1px solid #f3f4f6;
                padding: 16px;
                display: flex;
                gap: 12px;
                align-items: flex-start;
                transition: background 0.2s ease;
            }

            .notification-item:hover {
                background: #f9fafb;
            }

            .notification-item-icon {
                font-size: 20px;
                flex-shrink: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-item-content {
                flex: 1;
                min-width: 0;
            }

            .notification-item-title {
                font-weight: 600;
                color: #1f2937;
                font-size: 14px;
                margin: 0 0 4px 0;
            }

            .notification-item-message {
                color: #6b7280;
                font-size: 13px;
                margin: 0 0 4px 0;
            }

            .notification-item-time {
                color: #9ca3af;
                font-size: 12px;
                margin: 0;
            }

            .notification-item.success {
                border-left: 4px solid #10b981;
            }

            .notification-item.error {
                border-left: 4px solid #ef4444;
            }

            .notification-item.warning {
                border-left: 4px solid #f59e0b;
            }

            .notification-item.info {
                border-left: 4px solid #3b82f6;
            }

            .notification-center-footer {
                padding: 12px 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .notification-center-btn {
                padding: 8px 16px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .notification-center-btn-clear {
                background: #f3f4f6;
                color: #374151;
            }

            .notification-center-btn-clear:hover {
                background: #e5e7eb;
            }

            @media (max-width: 768px) {
                .sync-notification-badge {
                    bottom: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                }

                .notification-center-panel {
                    width: 95%;
                    height: 95%;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create notification center UI
     */
    createUI() {
        // Badge button
        const badge = document.createElement('div');
        badge.id = 'sync-notification-badge';
        badge.className = 'sync-notification-badge';
        badge.innerHTML = `
            <span>📋</span>
            <div class="sync-notification-badge-count" id="notification-count" style="display: none;">0</div>
        `;
        badge.addEventListener('click', () => this.toggle());
        document.body.appendChild(badge);

        // Modal backdrop and panel
        const modal = document.createElement('div');
        modal.id = 'notification-center-modal';
        modal.className = 'notification-center-modal';
        modal.innerHTML = `
            <div class="notification-center-panel">
                <div class="notification-center-header">
                    <h2 class="notification-center-title">📋 Sync Notifications</h2>
                    <button class="notification-center-close" id="notification-center-close">✕</button>
                </div>
                <div class="notification-center-content" id="notification-center-list">
                    <div class="notification-center-empty">No notifications yet</div>
                </div>
                <div class="notification-center-footer">
                    <button class="notification-center-btn notification-center-btn-clear" id="clear-notifications">Clear All</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('notification-center-close').addEventListener('click', () => this.close());
        document.getElementById('clear-notifications').addEventListener('click', () => this.clear());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    /**
     * Setup listeners for sync state changes
     */
    setupListeners() {
        // Retry setup if syncStateManager not ready yet
        if (!window.syncStateManager) {
            console.log('⏳ Waiting for SyncStateManager...');
            setTimeout(() => this.setupListeners(), 100);
            return;
        }

        console.log('✅ SyncStateManager ready, setting up listeners');

        window.syncStateManager.addListener((event) => {
            const { event: eventType, data, timestamp } = event;
            
            console.log(`🎯 NotificationCenter received event: ${eventType}`, { data, initialized: this.initialized });
            
            switch (eventType) {
                case 'sync-started':
                    this.addNotification(
                        `${data.type === 'full' ? 'Full' : data.type === 'incremental' ? 'Incremental' : 'Company'} Sync Started`,
                        `Syncing ${data.totalCount} companies...`,
                        'info',
                        '🔄',
                        timestamp
                    );
                    this.updateBadge();
                    this.setPulsing(true);
                    break;

                case 'sync-ended':
                    this.addNotification(
                        data.success ? '✅ Sync Completed' : '❌ Sync Failed',
                        `${data.syncedCount}/${data.totalCount} companies synced`,
                        data.success ? 'success' : 'error',
                        data.success ? '✓' : '✕',
                        timestamp
                    );
                    this.updateBadge();
                    this.setPulsing(false);
                    break;

                case 'sync-progress':
                    // Update latest notification with progress
                    // Optionally add progress notifications
                    break;
            }
        });

        // Listen for sync process queue events
        window.addEventListener('sync-process-queue', (e) => {
            this.addNotification(
                'Queued Sync Starting',
                `Processing queued ${e.detail.type} sync...`,
                'info',
                '⏳',
                new Date()
            );
        });
    }

    /**
     * Add notification to center
     */
    addNotification(title, message, type = 'info', icon = 'ℹ', timestamp = null) {
        if (!timestamp) timestamp = new Date();

        const notification = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            message,
            type,
            icon,
            timestamp
        };

        this.notifications.unshift(notification); // Add to beginning

        console.log(`📌 addNotification called: ${title}, initialized=${this.initialized}`, notification);

        // Keep only max notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications.pop();
        }

        // Only render if component is initialized
        if (this.initialized) {
            console.log('✅ NotificationCenter initialized, rendering notification');
            this.render();
        } else {
            console.warn('⚠️ NotificationCenter not initialized yet, notification queued but not displayed');
        }
        return notification.id;
    }

    /**
     * Render notifications
     */
    render() {
        if (!this.initialized) return;
        
        const list = document.getElementById('notification-center-list');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="notification-center-empty">No notifications yet</div>';
            return;
        }

        list.innerHTML = this.notifications.map(notif => {
            const timeStr = this.formatTime(notif.timestamp);
            return `
                <div class="notification-item ${notif.type}">
                    <div class="notification-item-icon">${notif.icon}</div>
                    <div class="notification-item-content">
                        <p class="notification-item-title">${this.escapeHtml(notif.title)}</p>
                        <p class="notification-item-message">${this.escapeHtml(notif.message)}</p>
                        <p class="notification-item-time">${timeStr}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update badge count
     */
    updateBadge() {
        if (!this.initialized) return;
        
        const countElem = document.getElementById('notification-count');
        if (!countElem) return;

        const count = this.notifications.length;
        if (count > 0) {
            countElem.textContent = Math.min(count, 99);
            countElem.style.display = 'flex';
        } else {
            countElem.style.display = 'none';
        }
    }

    /**
     * Set badge pulsing state
     */
    setPulsing(pulsing) {
        if (!this.initialized) return;
        
        const badge = document.getElementById('sync-notification-badge');
        if (!badge) return;

        if (pulsing) {
            badge.classList.add('pulsing');
        } else {
            badge.classList.remove('pulsing');
        }
    }

    /**
     * Toggle notification center
     */
    toggle() {
        if (!this.initialized) {
            console.warn('NotificationCenter not yet initialized');
            return;
        }
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open notification center
     */
    open() {
        if (!this.initialized) return;
        
        const modal = document.getElementById('notification-center-modal');
        if (modal) {
            modal.classList.add('active');
            this.isOpen = true;
        }
    }

    /**
     * Close notification center
     */
    close() {
        if (!this.initialized) return;
        
        const modal = document.getElementById('notification-center-modal');
        if (modal) {
            modal.classList.remove('active');
            this.isOpen = false;
        }
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications = [];
        if (this.initialized) {
            this.updateBadge();
            this.render();
        }
    }

    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        
        return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Escape HTML
     */
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

// Create global instance
window.notificationCenter = new NotificationCenter();
