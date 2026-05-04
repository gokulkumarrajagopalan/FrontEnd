/**
 * SESSION MANAGER
 * Monitors user session and detects multi-device login
 * Uses WebSocket to receive instant session invalidation notifications
 */

class SessionManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        this.isLoggedOut = false;
        // Dynamic WebSocket URL based on current location - initialized lazily
        this.wsUrl = null;
        this.pollingInterval = null;
        this.isChecking = false;
        this.POLL_INTERVAL = 60000; // 60 seconds fallback polling
        this.usePolling = false; // Will switch to true if WebSocket fails
        this.heartbeatInterval = null;
        this.heartbeatFrequency = 30000; // 30 seconds
    }

    /**
     * Get WebSocket URL based on current location and API config
     */
    getWebSocketUrl() {
        try {
            const apiBaseUrl = window.apiConfig?.BASE_URL;

            if (!apiBaseUrl) {
                console.warn('⚠️ API config not initialized yet');
                return null;
            }

            const wsUrl = apiBaseUrl
                .replace(/^https:/, 'wss:')
                .replace(/^http:/, 'ws:');
            return `${wsUrl}/session`;
        } catch (error) {
            console.error('❌ Error getting WebSocket URL:', error);
            return null;
        }
    }

    /**
     * Start WebSocket session monitoring
     */
    start() {
        const token = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');

        if (!token || !deviceToken) {
            console.warn('⚠️ Cannot start SessionManager: No tokens found');
            return;
        }

        console.log('🔄 SessionManager: Starting WebSocket session monitoring');

        // Initialize WS URL if not set
        if (!this.wsUrl) {
            this.wsUrl = this.getWebSocketUrl();
        }

        if (!this.wsUrl) {
            console.error('❌ Cannot start SessionManager: WebSocket URL could not be determined');
            return;
        }

        console.log(`   WebSocket URL: ${this.wsUrl}`);

        this.isLoggedOut = false;
        this.reconnectAttempts = 0;
        this.connectWebSocket();
    }

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        try {
            const token = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');

            if (!token || !deviceToken) {
                console.error('❌ SessionManager: Missing auth tokens, cannot connect');
                return;
            }

            console.log('🔌 SessionManager: Connecting to WebSocket...');
            const encodedToken = encodeURIComponent(token);
            const encodedDeviceToken = encodeURIComponent(deviceToken);
            const wsUrlWithParams = `${this.wsUrl}?token=${encodedToken}&deviceToken=${encodedDeviceToken}&deviceType=DESKTOP`;
            this.ws = new WebSocket(wsUrlWithParams);

            this.ws.onopen = () => {
                console.log('✅ SessionManager: WebSocket connected successfully');

                this.reconnectAttempts = 0;
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                console.log('📨 SessionManager: Received message from server:', event.data);
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'SESSION_INVALIDATED' || message.type === 'DEVICE_CONFLICT') {
                        console.log('⚠️ SessionManager: ' + (message.message || message.reason || 'Session invalidated'));
                        this.handleSessionInvalidated(message.message || message.reason || 'You have been logged in from another device');
                    } else if (message.type === 'HEARTBEAT_ACK') {
                        console.log('💓 SessionManager: Heartbeat acknowledged');
                    } else if (message.type === 'CONNECTED') {
                        console.log('✅ SessionManager: Server confirmed connection');
                    } else if (message.type === 'PONG') {
                        console.log('🏓 SessionManager: Pong received');
                    }
                } catch (error) {
                    console.warn('⚠️ SessionManager: Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ SessionManager: WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('❌ SessionManager: WebSocket disconnected');

                // If we haven't hit max reconnect attempts, try again
                if (!this.isLoggedOut && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 SessionManager: Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => {
                        this.connectWebSocket();
                    }, this.reconnectDelay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    // ⚠️ WebSocket failed - fall back to HTTP polling
                    console.error('❌ SessionManager: Max reconnection attempts reached');
                    console.log('🔄 SessionManager: Falling back to HTTP polling (60 seconds)');
                    this.usePolling = true;
                    this.startPolling();
                }
            };

        } catch (error) {
            console.error('❌ SessionManager: Error creating WebSocket:', error);
        }
    }

    /**
     * Handle session invalidation (logged in from another device)
     */
    handleSessionInvalidated(reason) {
        console.log('');
        console.log('========================================');
        console.log('⚠️  SESSION INVALIDATED - LOGGING OUT');
        console.log('========================================');
        console.log('Reason:', reason);
        console.log('');

        this.isLoggedOut = true;

        try {
            this.stopHeartbeat();
            console.log('🧹 Step 1: Stopped heartbeat');
        } catch (error) {
            console.error('   Error stopping heartbeat:', error);
        }

        try {
            this.stop();
            console.log('🧹 Step 2: Stopped WebSocket connection');
        } catch (error) {
            console.error('   Error stopping WebSocket:', error);
        }

        // Step 2: Clear authService in-memory tokens FIRST (before localStorage)
        // This prevents any pending requests from using invalid credentials
        console.log('🧹 Step 3: Clearing authService in-memory tokens...');
        if (window.authService) {
            try {
                window.authService.token = null;
                window.authService.deviceToken = null;
                window.authService.user = null;
                console.log('   ✓ AuthService tokens cleared');
            } catch (error) {
                console.error('   Error clearing authService:', error);
            }
        }

        // Step 3: Clear localStorage data
        console.log('🧹 Step 4: Clearing localStorage...');

        // Clear ALL localStorage data
        const keysToRemove = [
            'authToken',
            'deviceToken',
            'currentUser',
            'userId',
            'username',
            'fullName',
            'role',
            'isAuthenticated',
            'companies',
            'tallyCompanies',
            'selectedCompanies',
            'companyData',
            'currentCompany',
            'lastSync',
            'syncStatus'
        ];

        keysToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`   ✓ Removed: ${key}`);
            }
        });

        console.log('✅ Step 5: All authentication data cleared');
        console.log('');

        // Show popup to user
        const message = reason || 'Your session has ended.\nYou have been logged in from another device.';
        console.log('📢 Showing popup to user...');
        this.showSessionInvalidPopup(message);

        console.log('🔄 Step 6: Triggering logout...');
        console.log('');

        // ✅ Multiple ways to trigger logout in Electron app
        this.triggerLogout();
    }

    /**
     * Show session invalid popup notification
     */
    showSessionInvalidPopup(message) {
        // Try to use notification service first
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            try {
                window.notificationService.show(
                    message,
                    'error',
                    5000 // 5 second duration
                );
                console.log('   ✓ Shown via NotificationService');
                return;
            } catch (error) {
                console.warn('   ⚠️ NotificationService failed:', error);
            }
        }

        // Fallback to alert
        console.log('   → Using fallback alert');
        alert(message);
    }

    /**
     * Trigger logout in Electron app
     * Tries multiple methods to ensure logout happens
     */
    triggerLogout() {
        // Method 1: Check if app has logout method
        if (window.app && typeof window.app.logout === 'function') {
            try {
                console.log('   → Calling window.app.logout()');
                window.app.logout();
                return;
            } catch (error) {
                console.error('   ❌ Error calling app.logout():', error);
            }
        }

        // Method 2: Check if app has handleLogout method
        if (window.app && typeof window.app.handleLogout === 'function') {
            try {
                console.log('   → Calling window.app.handleLogout()');
                window.app.handleLogout();
                return;
            } catch (error) {
                console.error('   ❌ Error calling app.handleLogout():', error);
            }
        }

        // Method 3: Check if app has renderLogin method
        if (window.app && typeof window.app.renderLogin === 'function') {
            try {
                console.log('   → Calling window.app.renderLogin()');
                window.app.renderLogin();
                return;
            } catch (error) {
                console.error('   ❌ Error calling app.renderLogin():', error);
            }
        }

        // Method 4: Dispatch logout event
        console.log('   → Dispatching logout event');
        window.dispatchEvent(new CustomEvent('forceLogout', {
            detail: { reason: 'session_invalidated' }
        }));

        // Method 5: Reload page (fallback)
        console.log('   → Reloading page as final fallback...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }


    /**
     * Stop session monitoring
     */
    stop() {
        this.isLoggedOut = true;
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.ws) {
            console.log('🛑 SessionManager: Closing WebSocket...');
            this.ws.close();
            this.ws = null;
        }
        console.log('🛑 SessionManager: Session monitoring stopped');
    }

    /**
     * Start sending heartbeat messages to keep connection alive
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        console.log('❤️ SessionManager: Starting heartbeat (every 30 seconds)');

        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() }));
                    console.log('💓 SessionManager: Heartbeat sent');
                } catch (error) {
                    console.error('❌ SessionManager: Error sending heartbeat:', error);
                }
            }
        }, this.heartbeatFrequency);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('❌ SessionManager: Heartbeat stopped');
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');
        return !!(token && deviceToken);
    }

    /**
     * Get session status (for debugging)
     */
    getStatus() {
        return {
            isLoggedOut: this.isLoggedOut,
            wsConnected: this.ws && this.ws.readyState === WebSocket.OPEN,
            authenticated: this.isAuthenticated(),
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export to window for global access
window.sessionManager = sessionManager;

// Listen for forceLogout event
window.addEventListener('forceLogout', (event) => {
    console.log('🔔 Force logout event received:', event.detail);
    sessionManager.stop();
});

console.log('✅ SessionManager loaded (WebSocket Version)');
console.log(`   Connection: Real-time WebSocket to ${window.AppConfig?.API_BASE_URL?.replace('http', 'ws')}/ws/session`);
console.log('   Auto-detects: Single-device login enforcement');
console.log('   Behavior: Instant logout on device conflict');
console.log('');
