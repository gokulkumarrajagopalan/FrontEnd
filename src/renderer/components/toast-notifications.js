/**
 * =====================================================
 * TOAST NOTIFICATION SYSTEM - Production Ready
 * =====================================================
 * Modern toast notifications with animations and auto-dismiss
 */

(function () {
    const TOAST_DURATION = 5000; // 5 seconds
    const MAX_TOASTS = 5;
    let toastCounter = 0;
    let toasts = [];

    function createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.innerHTML = `
                <style>
                    #toast-container {
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

                    .toast {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        padding: 16px;
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        min-width: 300px;
                        pointer-events: all;
                        animation: toastSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1);
                        border-left: 4px solid;
                    }

                    .toast.toast-exit {
                        animation: toastSlideOut 200ms cubic-bezier(0.4, 0, 1, 1) forwards;
                    }

                    @keyframes toastSlideIn {
                        from {
                            opacity: 0;
                            transform: translateX(100%);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes toastSlideOut {
                        to {
                            opacity: 0;
                            transform: translateX(120%);
                        }
                    }

                    .toast-success {
                        border-left-color: #10b981;
                        background-color: #ecfdf5;
                    }

                    .toast-error {
                        border-left-color: #ef4444;
                        background-color: #fef2f2;
                    }

                    .toast-warning {
                        border-left-color: #f59e0b;
                        background-color: #fffbeb;
                    }

                    .toast-info {
                        border-left-color: #3b82f6;
                        background-color: #eff6ff;
                    }

                    .toast-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                        line-height: 1;
                    }

                    .toast-content {
                        flex: 1;
                        min-width: 0;
                    }

                    .toast-title {
                        font-size: 14px;
                        font-weight: 600;
                        margin-bottom: 2px;
                        color: #111827;
                    }

                    .toast-message {
                        font-size: 13px;
                        color: #4b5563;
                        line-height: 1.4;
                    }

                    .toast-close {
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                        font-size: 18px;
                        color: #6b7280;
                        flex-shrink: 0;
                        line-height: 1;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 150ms;
                    }

                    .toast-close:hover {
                        background-color: rgba(0, 0, 0, 0.05);
                        color: #111827;
                    }

                    .toast-actions {
                        margin-top: 12px;
                        display: flex;
                        gap: 8px;
                    }

                    .toast-action-btn {
                        padding: 6px 12px;
                        border-radius: 6px;
                        border: none;
                        font-size: 12px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 150ms;
                    }

                    .toast-action-primary {
                        background-color: #3b82f6;
                        color: white;
                    }

                    .toast-action-primary:hover {
                        background-color: #2563eb;
                    }

                    .toast-action-secondary {
                        background-color: rgba(0, 0, 0, 0.05);
                        color: #374151;
                    }

                    .toast-action-secondary:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                    }

                    .toast-progress {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background-color: rgba(0, 0, 0, 0.1);
                        border-radius: 0 0 12px 12px;
                        overflow: hidden;
                    }

                    .toast-progress-bar {
                        height: 100%;
                        background-color: currentColor;
                        animation: toastProgress linear;
                        transform-origin: left;
                    }

                    @keyframes toastProgress {
                        from {
                            transform: scaleX(1);
                        }
                        to {
                            transform: scaleX(0);
                        }
                    }

                    @media (max-width: 640px) {
                        #toast-container {
                            bottom: 16px;
                            right: 16px;
                            left: 16px;
                            max-width: none;
                        }

                        .toast {
                            min-width: 0;
                        }
                    }
                </style>
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    function getToastIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle" style="color:#10b981"></i>',
            error: '<i class="fas fa-times-circle" style="color:#ef4444"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>',
            info: '<i class="fas fa-info-circle" style="color:#3b82f6"></i>'
        };
        return icons[type] || icons.info;
    }

    function createToast(options) {
        const {
            type = 'info',
            title,
            message,
            duration = TOAST_DURATION,
            actions = [],
            closable = true,
            sound = true
        } = options;

        const toastId = ++toastCounter;
        const container = createToastContainer();

        // Limit number of toasts
        if (toasts.length >= MAX_TOASTS) {
            const oldestToast = toasts[0];
            removeToast(oldestToast.id);
        }

        const toast = document.createElement('div');
        toast.id = `toast-${toastId}`;
        toast.className = `toast toast-${type}`;
        toast.style.position = 'relative';

        let actionsHTML = '';
        if (actions.length > 0) {
            actionsHTML = `
                <div class="toast-actions">
                    ${actions.map((action, index) => `
                        <button class="toast-action-btn ${action.primary ? 'toast-action-primary' : 'toast-action-secondary'}" data-action-index="${index}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        toast.innerHTML = `
            <div class="toast-icon">${getToastIcon(type)}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
                ${actionsHTML}
            </div>
            ${closable ? '<button class="toast-close" aria-label="Close">×</button>' : ''}
            ${duration > 0 ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar" style="animation-duration: ${duration}ms; color: ${getProgressColor(type)}"></div>
                </div>
            ` : ''}
        `;

        container.appendChild(toast);

        // Store toast reference
        toasts.push({ id: toastId, element: toast, timerId: null });

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => removeToast(toastId));
        }

        // Action button handlers
        const actionBtns = toast.querySelectorAll('[data-action-index]');
        actionBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const actionIndex = parseInt(btn.dataset.actionIndex);
                const action = actions[actionIndex];
                if (action && action.onClick) {
                    action.onClick();
                }
                removeToast(toastId);
            });
        });

        // Auto-dismiss
        if (duration > 0) {
            const timerId = setTimeout(() => {
                removeToast(toastId);
            }, duration);

            // Update timer reference
            const toastObj = toasts.find(t => t.id === toastId);
            if (toastObj) {
                toastObj.timerId = timerId;
            }
        }

        // Play sound (optional - checks appSettings.soundEnabled)
        if (sound && window.NotificationSound) {
            window.NotificationSound.play(type);
        }

        return toastId;
    }

    function getProgressColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    function removeToast(toastId) {
        const toastObj = toasts.find(t => t.id === toastId);
        if (!toastObj) return;

        // Clear timer
        if (toastObj.timerId) {
            clearTimeout(toastObj.timerId);
        }

        // Add exit animation
        toastObj.element.classList.add('toast-exit');

        // Remove after animation
        setTimeout(() => {
            toastObj.element.remove();
            toasts = toasts.filter(t => t.id !== toastId);

            // Remove container if empty
            const container = document.getElementById('toast-container');
            if (container && container.children.length === 0) {
                container.remove();
            }
        }, 200);
    }

    function clearAll() {
        toasts.forEach(toast => removeToast(toast.id));
    }

    // Convenience methods
    function success(message, title = 'Success', options = {}) {
        return createToast({ type: 'success', title, message, ...options });
    }

    function error(message, title = 'Error', options = {}) {
        return createToast({ type: 'error', title, message, ...options });
    }

    function warning(message, title = 'Warning', options = {}) {
        return createToast({ type: 'warning', title, message, ...options });
    }

    function info(message, title = 'Info', options = {}) {
        return createToast({ type: 'info', title, message, ...options });
    }

    // Export to global scope
    window.Toast = {
        show: createToast,
        success,
        error,
        warning,
        info,
        remove: removeToast,
        clearAll
    };

    // Also create a simple notification service that works with existing code
    window.NotificationService = {
        show: (message, type = 'info') => {
            const methodMap = {
                success: 'success',
                error: 'error',
                warning: 'warning',
                info: 'info'
            };
            const method = methodMap[type] || 'info';
            return window.Toast[method](message);
        }
    };

    // =====================================================
    // NOTIFICATION SOUND SYSTEM - Web Audio API
    // =====================================================
    class NotificationSoundPlayer {
        constructor() {
            this.audioContext = null;
            this.enabled = true;
        }

        _getContext() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            return this.audioContext;
        }

        _isEnabled() {
            try {
                const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                return settings.soundEnabled !== false; // default true
            } catch {
                return true;
            }
        }

        play(type = 'info') {
            if (!this._isEnabled()) return;

            try {
                const ctx = this._getContext();
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                // Different sound profiles per notification type
                const profiles = {
                    success: { freq: 880, duration: 0.15, type: 'sine', pattern: [880, 1100] },
                    error: { freq: 300, duration: 0.3, type: 'square', pattern: [300, 200] },
                    warning: { freq: 600, duration: 0.2, type: 'triangle', pattern: [600, 500] },
                    info: { freq: 700, duration: 0.12, type: 'sine', pattern: [700] }
                };

                const profile = profiles[type] || profiles.info;
                oscillator.type = profile.type;
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + profile.duration * profile.pattern.length);

                // Play frequency pattern
                let time = ctx.currentTime;
                for (const freq of profile.pattern) {
                    oscillator.frequency.setValueAtTime(freq, time);
                    time += profile.duration;
                }

                oscillator.start(ctx.currentTime);
                oscillator.stop(time);
            } catch (e) {
                console.warn('🔇 Sound playback failed:', e.message);
            }
        }
    }

    window.NotificationSound = new NotificationSoundPlayer();
    console.log('✅ Toast Notification System initialized');
    console.log('🔊 Notification Sound System initialized');
})();
