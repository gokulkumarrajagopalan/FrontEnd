/**
 * SESSION MANAGER — Desktop (Electron)
 *
 * Monitors user session via WebSocket.
 *   • Forces logout after 5 failed reconnection attempts
 *   • Pauses reconnection when the machine goes offline (window 'offline' event)
 *   • Resumes automatically when the network is restored (window 'online' event)
 *   • Resets the attempt counter after a network restore so a brief outage
 *     doesn't permanently consume reconnect slots
 */

class SessionManager {
    constructor() {
        this.ws                  = null;
        this.reconnectAttempts   = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay      = 3000;   // ms between reconnect tries
        this.reconnectTimer      = null;   // handle for pending setTimeout
        this.isLoggedOut         = false;
        this.isPaused            = false;  // true while device has no internet

        // Lazy-initialised WebSocket base URL
        this.wsUrl               = null;

        // Heartbeat
        this.heartbeatInterval   = null;
        this.heartbeatFrequency  = 30000; // 30 seconds

        // Bind connectivity handlers so we can removeEventListener later
        this._onOffline = this._handleOffline.bind(this);
        this._onOnline  = this._handleOnline.bind(this);
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Start WebSocket session monitoring.
     * Call this after a successful login.
     */
    start() {
        const token       = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');

        if (!token || !deviceToken) {
            console.warn('⚠️ Cannot start SessionManager: No tokens found');
            return;
        }

        // Resolve WS URL once
        if (!this.wsUrl) {
            this.wsUrl = this._getWebSocketUrl();
        }

        if (!this.wsUrl) {
            console.error('❌ Cannot start SessionManager: WebSocket URL could not be determined');
            return;
        }

        console.log('🔄 SessionManager: Starting WebSocket session monitoring');
        console.log(`   WebSocket URL: ${this.wsUrl}`);

        this.isLoggedOut        = false;
        this.isPaused           = false;
        this.reconnectAttempts  = 0;

        // Register network connectivity listeners
        window.addEventListener('offline', this._onOffline);
        window.addEventListener('online',  this._onOnline);

        // Don't attempt to connect if already offline at startup
        if (!navigator.onLine) {
            console.warn('📵 SessionManager: Device is offline — waiting for network before connecting');
            this.isPaused = true;
            return;
        }

        this._connectWebSocket();
    }

    /**
     * Stop session monitoring (intentional logout or app teardown).
     */
    stop() {
        this.isLoggedOut = true;
        this._stopHeartbeat();
        this._clearReconnectTimer();
        this._closeSocket();
        window.removeEventListener('offline', this._onOffline);
        window.removeEventListener('online',  this._onOnline);
        console.log('🛑 SessionManager: Session monitoring stopped');
    }

    // ─── Connectivity Handlers ─────────────────────────────────────────────────

    _handleOffline() {
        if (this.isPaused) return; // already paused
        console.warn('📵 SessionManager: Network went offline — pausing reconnection');
        this.isPaused = true;

        // Stop heartbeat and cancel any pending reconnect
        this._stopHeartbeat();
        this._clearReconnectTimer();

        // Close the socket cleanly; set onclose = null so the close event
        // doesn't trigger another reconnect attempt while we are paused.
        this._closeSocket();
    }

    _handleOnline() {
        if (this.isLoggedOut) return;
        if (!this.isPaused)   return; // wasn't paused, nothing to resume

        console.log('📶 SessionManager: Network restored — resuming session monitoring');
        this.isPaused = false;

        // Reset attempt counter: a transient network outage should not
        // permanently consume reconnect slots.
        this.reconnectAttempts = 0;

        this._connectWebSocket();
    }

    // ─── WebSocket Logic ───────────────────────────────────────────────────────

    _connectWebSocket() {
        if (this.isLoggedOut || this.isPaused) return;

        try {
            const token       = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');

            if (!token || !deviceToken) {
                console.error('❌ SessionManager: Missing auth tokens, cannot connect');
                return;
            }

            const encodedToken       = encodeURIComponent(token);
            const encodedDeviceToken = encodeURIComponent(deviceToken);
            const wsUrlWithParams    = `${this.wsUrl}?token=${encodedToken}&deviceToken=${encodedDeviceToken}&deviceType=DESKTOP`;

            console.log(`🔌 SessionManager: Connecting to WebSocket... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts + 1})`);
            this.ws = new WebSocket(wsUrlWithParams);

            // ── onopen ──────────────────────────────────────────────────────
            this.ws.onopen = () => {
                console.log('✅ SessionManager: WebSocket connected successfully');
                this.reconnectAttempts = 0;
                this._startHeartbeat();
            };

            // ── onmessage ───────────────────────────────────────────────────
            this.ws.onmessage = (event) => {
                console.log('📨 SessionManager: Received message from server:', event.data);
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'SESSION_INVALIDATED' || message.type === 'DEVICE_CONFLICT') {
                        console.warn('⚠️ SessionManager:', message.message || message.reason || 'Session invalidated');
                        this.handleSessionInvalidated(
                            message.message || message.reason || 'You have been logged in from another device'
                        );
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

            // ── onerror ─────────────────────────────────────────────────────
            this.ws.onerror = (error) => {
                console.error('❌ SessionManager: WebSocket error:', error);
            };

            // ── onclose ─────────────────────────────────────────────────────
            this.ws.onclose = () => {
                console.log('❌ SessionManager: WebSocket disconnected');
                this._stopHeartbeat();

                // Ignore close events triggered by intentional stop or offline handling
                if (this.isLoggedOut || this.isPaused) return;

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 SessionManager: Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    this._clearReconnectTimer();
                    this.reconnectTimer = setTimeout(() => {
                        this._connectWebSocket();
                    }, this.reconnectDelay);
                } else {
                    console.error('❌ SessionManager: Max reconnection attempts reached — logging out');
                    this.handleSessionInvalidated('Connection lost. Maximum reconnection attempts reached.');
                }
            };

        } catch (error) {
            console.error('❌ SessionManager: Error creating WebSocket:', error);
        }
    }

    // ─── Session Invalidation ──────────────────────────────────────────────────

    /**
     * Handle session invalidation (logged in from another device, or
     * max reconnect failures reached).
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
            this.stop();
            console.log('🧹 Step 1: Stopped SessionManager (heartbeat + WebSocket)');
        } catch (error) {
            console.error('   Error stopping SessionManager:', error);
        }

        // Clear authService in-memory tokens FIRST to stop any in-flight requests
        console.log('🧹 Step 2: Clearing authService in-memory tokens...');
        if (window.authService) {
            try {
                window.authService.token       = null;
                window.authService.deviceToken = null;
                window.authService.user        = null;
                console.log('   ✓ AuthService tokens cleared');
            } catch (error) {
                console.error('   Error clearing authService:', error);
            }
        }

        // Clear localStorage auth data
        console.log('🧹 Step 3: Clearing localStorage...');
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

        console.log('✅ Step 4: All authentication data cleared');
        console.log('');

        // Show popup to user
        const message = reason || 'Your session has ended.\nYou have been logged in from another device.';
        console.log('📢 Showing popup to user...');
        this.showSessionInvalidPopup(message);

        console.log('🔄 Step 5: Triggering logout...');
        this.triggerLogout();
    }

    // ─── Popup & Logout Helpers ────────────────────────────────────────────────

    showSessionInvalidPopup(message) {
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            try {
                window.notificationService.show(message, 'error', 5000);
                console.log('   ✓ Shown via NotificationService');
                return;
            } catch (error) {
                console.warn('   ⚠️ NotificationService failed:', error);
            }
        }
        console.log('   → Using fallback alert');
        alert(message);
    }

    triggerLogout() {
        if (window.app && typeof window.app.logout === 'function') {
            try { window.app.logout(); return; } catch (e) { console.error('   ❌ app.logout() failed:', e); }
        }
        if (window.app && typeof window.app.handleLogout === 'function') {
            try { window.app.handleLogout(); return; } catch (e) { console.error('   ❌ app.handleLogout() failed:', e); }
        }
        if (window.app && typeof window.app.renderLogin === 'function') {
            try { window.app.renderLogin(); return; } catch (e) { console.error('   ❌ app.renderLogin() failed:', e); }
        }

        // Dispatch forceLogout event so other parts of the app can react
        console.log('   → Dispatching forceLogout event');
        window.dispatchEvent(new CustomEvent('forceLogout', {
            detail: { reason: 'session_invalidated' }
        }));

        // Final fallback: reload
        console.log('   → Reloading page as final fallback...');
        setTimeout(() => { window.location.reload(); }, 1000);
    }

    // ─── Heartbeat ─────────────────────────────────────────────────────────────

    _startHeartbeat() {
        this._stopHeartbeat();
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

    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💔 SessionManager: Heartbeat stopped');
        }
    }

    // ─── Internal Helpers ──────────────────────────────────────────────────────

    _getWebSocketUrl() {
        try {
            const apiBaseUrl = window.apiConfig?.BASE_URL;
            if (!apiBaseUrl) {
                console.warn('⚠️ API config not initialized yet');
                return null;
            }
            const wsUrl = apiBaseUrl
                .replace(/^https:/, 'wss:')
                .replace(/^http:/,  'ws:');
            return `${wsUrl}/session`;
        } catch (error) {
            console.error('❌ Error getting WebSocket URL:', error);
            return null;
        }
    }

    _closeSocket() {
        if (this.ws) {
            console.log('🛑 SessionManager: Closing WebSocket...');
            this.ws.onclose = null; // suppress onclose → prevents stray reconnect
            this.ws.close();
            this.ws = null;
        }
    }

    _clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ─── Status / Auth Helpers ─────────────────────────────────────────────────

    /** Kept for backward-compat — old code may call startHeartbeat / stopHeartbeat */
    startHeartbeat() { this._startHeartbeat(); }
    stopHeartbeat()  { this._stopHeartbeat();  }

    isAuthenticated() {
        return !!(localStorage.getItem('authToken') && localStorage.getItem('deviceToken'));
    }

    getStatus() {
        return {
            isLoggedOut:       this.isLoggedOut,
            isPaused:          this.isPaused,
            wsConnected:       this.ws && this.ws.readyState === WebSocket.OPEN,
            authenticated:     this.isAuthenticated(),
            reconnectAttempts: this.reconnectAttempts,
            online:            navigator.onLine,
        };
    }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

const sessionManager = new SessionManager();

// Make it globally accessible from other renderer scripts
window.sessionManager = sessionManager;

// Allow other parts of the Electron renderer to trigger a clean stop
window.addEventListener('forceLogout', (event) => {
    console.log('🔔 Force logout event received:', event.detail);
    sessionManager.stop();
});

console.log('✅ SessionManager loaded (WebSocket + Connectivity-Aware Version)');
console.log(`   Connection: Real-time WebSocket to ${window.AppConfig?.API_BASE_URL?.replace('http', 'ws')}/ws/session`);
console.log('   Auto-detects: Single-device login enforcement');
console.log('   Behavior: Instant logout on device conflict');
console.log('   Offline: Pauses reconnection, resumes when network restores');
console.log('');
