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
        this.reconnectDelay      = 3000;   // ms between fast reconnect tries
        this.maxReconnectDelay   = 30000;  // ms — capped backoff once fast tries are exhausted
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
        const token = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('authToken')
            : localStorage.getItem('authToken');
        const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('deviceToken')
            : localStorage.getItem('deviceToken');

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
        this._stopHttpPolling();
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
        this.isPaused            = false;
        this.reconnectAttempts   = 0;
        this._handshakeFailures  = 0;

        // If WebSocket was marked down due to prior handshake failures, give it
        // another chance now that the network has changed.
        if (this._wsEndpointDown) {
            this._wsEndpointDown = false;
            this._stopHttpPolling();
        }

        this._connectWebSocket();
    }

    // ─── WebSocket Logic ───────────────────────────────────────────────────────

    _connectWebSocket() {
        if (this.isLoggedOut || this.isPaused) return;

        // If the WebSocket endpoint has been confirmed unreachable (e.g. persistent
        // HTTP 403 on handshake), stop attempting and fall back to HTTP polling.
        if (this._wsEndpointDown) return;

        try {
            const token = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
            const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('deviceToken')
                : localStorage.getItem('deviceToken');

            if (!token || !deviceToken) {
                console.warn('⚠️ SessionManager: Missing auth tokens, cannot connect');
                return;
            }

            const encodedToken       = encodeURIComponent(token);
            const encodedDeviceToken = encodeURIComponent(deviceToken);
            const wsUrlWithParams    = `${this.wsUrl}?token=${encodedToken}&deviceToken=${encodedDeviceToken}&deviceType=DESKTOP`;

            // Track whether onopen fired so we can distinguish a dropped connection
            // from a failed handshake (HTTP 403 / 401 during upgrade).
            this._wsOpened = false;

            this.ws = new WebSocket(wsUrlWithParams);

            // ── onopen ──────────────────────────────────────────────────────
            this.ws.onopen = () => {
                console.log('✅ SessionManager: WebSocket connected successfully');
                this._wsOpened           = true;
                this._handshakeFailures  = 0;   // reset on successful connection
                this.reconnectAttempts   = 0;
                this._startHeartbeat();
            };

            // ── onmessage ───────────────────────────────────────────────────
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'SESSION_INVALIDATED' || message.type === 'DEVICE_CONFLICT') {
                        console.warn('⚠️ SessionManager:', message.message || message.reason || 'Session invalidated');
                        this.handleSessionInvalidated(
                            message.message || message.reason || 'You have been logged in from another device'
                        );
                    } else if (message.type === 'ERROR') {
                        const reason = (message.message || '').toLowerCase();
                        const authFailure = reason.includes('token') || reason.includes('session')
                            || reason.includes('device') || reason.includes('user not found')
                            || reason.includes('invalid');
                        if (authFailure) {
                            console.warn('⚠️ SessionManager: server rejected session —', message.message);
                            this.handleSessionInvalidated(message.message || 'Session is no longer valid');
                        } else {
                            console.warn('⚠️ SessionManager: transient server error, will retry —', message.message);
                        }
                    } else if (message.type === 'HEARTBEAT_ACK') {
                        // silent
                    } else if (message.type === 'CONNECTED') {
                        console.log('✅ SessionManager: Server confirmed connection');
                    }
                } catch (error) {
                    console.warn('⚠️ SessionManager: Error parsing WebSocket message:', error);
                }
            };

            // ── onerror ─────────────────────────────────────────────────────
            // Suppress the raw browser error event — onclose always follows and
            // contains the actionable information. Logging the raw Event object
            // adds noise without useful detail.
            this.ws.onerror = () => {};

            // ── onclose ─────────────────────────────────────────────────────
            this.ws.onclose = (evt) => {
                this._stopHeartbeat();

                if (this.isLoggedOut || this.isPaused) return;

                const wasHandshakeFailure = !this._wsOpened;

                if (wasHandshakeFailure) {
                    // The server rejected the WebSocket upgrade (e.g. HTTP 403).
                    // This is NOT a dropped connection — it means the endpoint is
                    // unavailable or rejecting our token at the HTTP layer.
                    this._handshakeFailures = (this._handshakeFailures || 0) + 1;
                    const maxHandshakeTries = 3;

                    if (this._handshakeFailures >= maxHandshakeTries) {
                        // Stop trying — mark endpoint as down and switch to HTTP polling.
                        console.warn(
                            `⚠️ SessionManager: WebSocket endpoint rejected connection ` +
                            `${this._handshakeFailures} time(s) (HTTP 4xx during upgrade). ` +
                            `Switching to HTTP session polling — real-time push disabled.`
                        );
                        this._wsEndpointDown = true;
                        this._startHttpPolling();
                        return;
                    }

                    // Still within retry budget — back off before next attempt.
                    const backoff = this._handshakeFailures * 10000; // 10s, 20s, 30s
                    console.warn(`⚠️ SessionManager: WebSocket handshake failed (attempt ${this._handshakeFailures}/${maxHandshakeTries}), retrying in ${backoff / 1000}s`);
                    this._clearReconnectTimer();
                    this.reconnectTimer = setTimeout(() => this._connectWebSocket(), backoff);
                    return;
                }

                // Dropped an established connection — normal reconnect with backoff.
                this.reconnectAttempts++;
                const delay = this.reconnectAttempts <= this.maxReconnectAttempts
                    ? this.reconnectDelay
                    : this.maxReconnectDelay;
                console.log(`🔄 SessionManager: Connection dropped, reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts})`);
                this._clearReconnectTimer();
                this.reconnectTimer = setTimeout(() => this._connectWebSocket(), delay);
            };

        } catch (error) {
            console.error('❌ SessionManager: Error creating WebSocket:', error);
        }
    }

    // ─── HTTP Polling Fallback ─────────────────────────────────────────────────

    _startHttpPolling() {
        if (this._pollInterval) return; // already running
        const POLL_MS = 60000; // check every 60 seconds
        console.log(`🔁 SessionManager: HTTP polling started (every ${POLL_MS / 1000}s)`);

        this._pollInterval = setInterval(async () => {
            if (this.isLoggedOut) {
                this._stopHttpPolling();
                return;
            }
            try {
                const token = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                    ? window.electronAPI.secureStoreGet('authToken')
                    : localStorage.getItem('authToken');
                if (!token || !window.apiConfig) return;

                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 8000);
                const resp = await fetch(window.apiConfig.getUrl('/auth/validate'), {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                });
                clearTimeout(tid);

                if (resp.status === 401) {
                    console.warn('⚠️ SessionManager: HTTP poll — session expired (401)');
                    this._stopHttpPolling();
                    this.handleSessionInvalidated('Your session has expired. Please log in again.');
                }
                // 403 = endpoint missing on this server build; just keep polling silently
            } catch (_) {}
        }, POLL_MS);
    }

    _stopHttpPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
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

        if (window.electronAPI && typeof window.electronAPI.secureStoreDelete === 'function') {
            window.electronAPI.secureStoreDelete('authToken');
            window.electronAPI.secureStoreDelete('deviceToken');
            window.electronAPI.secureStoreDelete('csrfToken');
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
        if (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') {
            return !!(window.electronAPI.secureStoreGet('authToken') && window.electronAPI.secureStoreGet('deviceToken'));
        }
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
