/**
 * Notification Center
 * Displays a persistent center for viewing all notifications and sync status
 */

class NotificationCenter {
    constructor() {
        this.isOpen = false;
        this.notifications = [];
        this.companySyncStatus = {}; // Store last sync status per company
        this.maxNotifications = 50;
        this.initialized = false;
        this.initializeStyles();
        this.initializeWhenReady();
        this.loadCompanySyncStatus();
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
                position: fixed !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                left: auto !important;
                background: transparent !important;
                z-index: 999999 !important;
                display: block !important;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .notification-center-modal.active {
                opacity: 1 !important;
                pointer-events: all !important;
            }

            .notification-center-panel {
                background: white;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.3);
                width: 430px;
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: absolute;
                right: 0;
                top: 0;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }

            .notification-center-modal.active .notification-center-panel {
                transform: translateX(0);
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                }
                to {
                    transform: translateX(0);
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
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                cursor: pointer;
                font-size: 12px;
                font-weight: 400;
                transition: all 0.3s ease;
            }

            .notification-center-btn-clear {
                background: transparent;
                color: #6b7280;
            }

            .notification-center-btn-clear:hover {
                background: #f9fafb;
                color: #374151;
            }

            .sync-status-section {
                padding: 16px 20px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
            }

            .sync-status-title {
                font-size: 14px;
                font-weight: 700;
                color: #374151;
                margin: 0 0 12px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sync-status-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .sync-status-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                background: white;
                border-radius: 8px;
                border-left: 3px solid transparent;
                transition: all 0.2s ease;
            }

            .sync-status-item:hover {
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }

            .sync-status-item.success {
                border-left-color: #10b981;
            }

            .sync-status-item.error {
                border-left-color: #ef4444;
            }

            .sync-status-item.syncing {
                border-left-color: #3b82f6;
                animation: syncPulse 1.5s infinite;
            }

            @keyframes syncPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .sync-status-company {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 0;
            }

            .sync-status-icon {
                font-size: 16px;
                flex-shrink: 0;
            }

            .sync-status-info {
                flex: 1;
                min-width: 0;
            }

            .sync-status-company-name {
                font-weight: 600;
                color: #1f2937;
                font-size: 13px;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sync-status-details {
                font-size: 11px;
                color: #6b7280;
                margin: 2px 0 0 0;
            }

            .sync-status-badge {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            }

            .sync-status-badge.success {
                background: #d1fae5;
                color: #065f46;
            }

            .sync-status-badge.error {
                background: #fee2e2;
                color: #991b1b;
            }

            .sync-status-badge.syncing {
                background: #dbeafe;
                color: #1e40af;
            }

            .sync-status-empty {
                text-align: center;
                padding: 20px;
                color: #9ca3af;
                font-size: 13px;
            }

            @media (max-width: 768px) {
                .notification-center-panel {
                    width: 100%;
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
        console.log('🎨 Creating NotificationCenter UI...');
        
        // Skip creating the badge button - we'll use the header bell icon instead
        console.log('   Skipping badge creation (using header bell icon)');

        // Check if modal already exists
        let modal = document.getElementById('notification-center-modal');
        if (!modal) {
            console.log('   Creating modal...');
            modal = document.createElement('div');
            modal.id = 'notification-center-modal';
            modal.className = 'notification-center-modal';
            modal.innerHTML = `
                <div class="notification-center-panel">
                    <div class="notification-center-header">
                        <h2 class="notification-center-title">📋 Notifications</h2>
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
            console.log('   ✅ Modal created and added to body');
            console.log('   Modal z-index:', window.getComputedStyle(modal).zIndex);
            console.log('   Modal position:', window.getComputedStyle(modal).position);

            // Event listeners
            const closeBtn = document.getElementById('notification-center-close');
            const clearBtn = document.getElementById('clear-notifications');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
                console.log('   ✅ Close button listener attached');
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clear());
                console.log('   ✅ Clear button listener attached');
            }
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            console.log('   ✅ Modal backdrop listener attached');
        } else {
            console.log('   Modal already exists');
        }
    }

    /**
     * Load company sync status from localStorage
     */
    loadCompanySyncStatus() {
        try {
            const saved = localStorage.getItem('companySyncStatus');
            if (saved) {
                const loaded = JSON.parse(saved);
                // Filter out "Sync API not available" errors
                this.companySyncStatus = {};
                Object.keys(loaded).forEach(companyName => {
                    const sync = loaded[companyName];
                    if (!sync.error || !sync.error.includes('Sync API not available')) {
                        this.companySyncStatus[companyName] = sync;
                    }
                });
                // Save cleaned data back to localStorage
                this.saveCompanySyncStatus();
            }
        } catch (error) {
            console.error('Failed to load company sync status:', error);
        }
    }

    /**
     * Save company sync status to localStorage
     */
    saveCompanySyncStatus() {
        try {
            localStorage.setItem('companySyncStatus', JSON.stringify(this.companySyncStatus));
        } catch (error) {
            console.error('Failed to save company sync status:', error);
        }
    }

    /**
     * Update sync status for a company
     */
    updateCompanySyncStatus(companyName, status, recordCount = 0, error = null) {
        // Filter out "Sync API not available" errors - these are not real sync failures
        if (error && error.includes('Sync API not available')) {
            console.log(`Skipping sync status update for ${companyName} - Sync API not available`);
            return;
        }
        
        this.companySyncStatus[companyName] = {
            status: status, // 'success', 'error', 'syncing'
            recordCount: recordCount,
            error: error,
            lastSync: new Date().toISOString(),
            timestamp: Date.now()
        };
        this.saveCompanySyncStatus();
        this.renderSyncStatus();
    }

    /**
     * Render sync status section
     */
    renderSyncStatus() {
        const container = document.getElementById('sync-status-list');
        if (!container) return;

        const companies = Object.keys(this.companySyncStatus);
        
        if (companies.length === 0) {
            container.innerHTML = '<div class="sync-status-empty">No sync data available</div>';
            return;
        }

        // Sort by timestamp (most recent first)
        companies.sort((a, b) => {
            return this.companySyncStatus[b].timestamp - this.companySyncStatus[a].timestamp;
        });

        container.innerHTML = companies.map(companyName => {
            const sync = this.companySyncStatus[companyName];
            const statusClass = sync.status;
            const timeAgo = this.getTimeAgo(new Date(sync.lastSync));
            
            let icon = '✅';
            let badgeText = 'Success';
            let details = `${sync.recordCount} records synced`;
            
            if (sync.status === 'error') {
                icon = '❌';
                badgeText = 'Failed';
                details = sync.error || 'Sync failed';
            } else if (sync.status === 'syncing') {
                icon = '🔄';
                badgeText = 'Syncing...';
                details = 'Sync in progress';
            }

            return `
                <div class="sync-status-item ${statusClass}">
                    <div class="sync-status-company">
                        <span class="sync-status-icon">${icon}</span>
                        <div class="sync-status-info">
                            <p class="sync-status-company-name">${companyName}</p>
                            <p class="sync-status-details">${details} • ${timeAgo}</p>
                        </div>
                    </div>
                    <span class="sync-status-badge ${statusClass}">${badgeText}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Get relative time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
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

        // Show toast notification if NotificationUtil is available
        if (window.NotificationUtil) {
            const toastMessage = `${title}\n${message}`;
            window.NotificationUtil[type](toastMessage, 4000);
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
        console.log('🔄 NotificationCenter.toggle() called');
        console.log('   initialized:', this.initialized);
        console.log('   isOpen:', this.isOpen);
        
        if (!this.initialized) {
            console.error('❌ NotificationCenter not yet initialized');
            return;
        }
        
        if (this.isOpen) {
            console.log('   ▶ Closing...');
            this.close();
        } else {
            console.log('   ▶ Opening...');
            this.open();
        }
    }

    /**
     * Open notification center
     */
    open() {
        console.log('📦 NotificationCenter.open() called');
        if (!this.initialized) {
            console.error('❌ Cannot open - not initialized');
            return;
        }
        
        let modal = document.getElementById('notification-center-modal');
        console.log('   Modal element found:', !!modal);
        
        // If modal doesn't exist, recreate it
        if (!modal) {
            console.warn('⚠️ Modal element missing from DOM, recreating...');
            this.createUI();
            modal = document.getElementById('notification-center-modal');
            console.log('   Modal recreated:', !!modal);
        }
        
        if (modal) {
            console.log('   Modal current display:', window.getComputedStyle(modal).display);
            console.log('   Modal current opacity:', window.getComputedStyle(modal).opacity);
            console.log('   Modal current z-index:', window.getComputedStyle(modal).zIndex);
            
            modal.classList.add('active');
            this.isOpen = true;
            
            console.log('   ✅ Modal opened (active class added)');
            console.log('   Modal classList:', modal.classList.toString());
            console.log('   Modal opacity after:', window.getComputedStyle(modal).opacity);
            
            // Force reflow to ensure transition happens
            modal.offsetHeight;
            
            // Render latest sync status when opening
            this.renderSyncStatus();
        } else {
            console.error('❌ notification-center-modal element still not found after recreation!');
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

// Add global debug function
window.testNotificationCenter = function() {
    console.log('🧪 Testing NotificationCenter...');
    console.log('   Initialized:', window.notificationCenter?.initialized);
    console.log('   IsOpen:', window.notificationCenter?.isOpen);
    
    const modal = document.getElementById('notification-center-modal');
    console.log('   Modal exists:', !!modal);
    if (modal) {
        console.log('   Modal display:', window.getComputedStyle(modal).display);
        console.log('   Modal opacity:', window.getComputedStyle(modal).opacity);
        console.log('   Modal z-index:', window.getComputedStyle(modal).zIndex);
        console.log('   Modal position:', window.getComputedStyle(modal).position);
        console.log('   Modal classList:', modal.classList.toString());
    }
    
    const badge = document.getElementById('sync-notification-badge');
    console.log('   Badge exists:', !!badge);
    
    console.log('   Calling toggle()...');
    window.notificationCenter.toggle();
};

console.log('✅ NotificationCenter loaded. Type testNotificationCenter() in console to debug.');
