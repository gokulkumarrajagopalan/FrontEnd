/**
 * Reusable Popup Component
 * Provides confirmation dialogs and custom popups
 */

const Popup = {
    /**
     * Show a confirmation popup
     * @param {Object} options - Popup configuration
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    confirm: (options = {}) => {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            showCancel = true,
            icon = '',
            confirmVariant = 'danger' // primary, danger, success
        } = options;

        return new Promise((resolve) => {
            const popupId = 'confirmPopup_' + Date.now();

            const footerPosition = showCancel && cancelText ? 'flex-end' : 'center';
            const popupHtml = `
                <div id="${popupId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: var(--ds-space-4); transition: all 0.3s;">
                    <div class="animate-premium-pop" 
                         style="background: var(--ds-bg-surface); width: 100%; max-width: 400px; border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-xl); border: 1px solid var(--ds-border-default); overflow: hidden;">
                        <div style="padding: var(--ds-space-8) var(--ds-space-8) var(--ds-space-6); text-align: center;">
                            ${icon ? `
                                <div style="width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--ds-space-5); position: relative; background: linear-gradient(135deg, var(--ds-bg-surface), var(--ds-bg-surface-sunken)); box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">
                                    <div style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,0.8); box-shadow: var(--ds-shadow-sm);"></div>
                                    <div style="font-size: 28px; position: relative; z-index: 10; color: var(--ds-text-secondary);">${icon}</div>
                                </div>
                            ` : ''}
                            <h3 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-3); line-height: 1.2;">${title}</h3>
                            <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; padding: 0 var(--ds-space-2); margin: 0;">${message}</p>
                        </div>
                        <div style="padding: 0 var(--ds-space-8) var(--ds-space-8); display: flex; gap: var(--ds-space-4); justify-content: ${footerPosition};">
                            ${showCancel && cancelText ? `
                            <button id="${popupId}_cancel" style="flex: 1; padding: var(--ds-space-3) var(--ds-space-5); background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); color: var(--ds-text-secondary); border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--ds-bg-surface-sunken)'" onmouseout="this.style.background='var(--ds-bg-surface)'">
                                ${cancelText}
                            </button>
                            ` : ''}
                            <button id="${popupId}_confirm" style="flex: 1; padding: var(--ds-space-3) var(--ds-space-5); border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: white; cursor: pointer; transition: all 0.2s; ${Popup._getButtonStyle(confirmVariant)};">
                                ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', popupHtml);

            const popup = document.getElementById(popupId);
            const confirmBtn = document.getElementById(`${popupId}_confirm`);
            const cancelBtn = document.getElementById(`${popupId}_cancel`);

            const cleanup = () => {
                popup.remove();
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(false);
                });
            }

            // Close on backdrop click
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    },

    /**
     * Show an alert popup (single button)
     * @param {Object} options - Popup configuration
     * @returns {Promise<void>} - Resolves when OK is clicked or dialog is closed
     */
    alert: (options = {}) => {
        const {
            title = 'Alert',
            message = '',
            okText = 'OK',
            icon = '',
            variant = 'primary',
            closeOnBackdrop = true,
            onClose = null
        } = options;

        return new Promise((resolve) => {
            const popupId = 'alertPopup_' + Date.now();
            const popupHtml = `
                <div id="${popupId}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: var(--ds-space-4); transition: all 0.3s;">
                    <div class="animate-premium-pop"
                         style="background: var(--ds-bg-surface); width: 100%; max-width: 400px; border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-xl); border: 1px solid var(--ds-border-default); overflow: hidden;">
                        <div style="padding: var(--ds-space-10) var(--ds-space-8) var(--ds-space-8); text-align: center;">
                            ${icon ? `
                                <div style="width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--ds-space-6); position: relative; background: linear-gradient(135deg, var(--ds-bg-surface), var(--ds-bg-surface-sunken)); box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">
                                    <div style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,0.8); box-shadow: var(--ds-shadow-sm);"></div>
                                    <div style="font-size: 28px; position: relative; z-index: 10; color: var(--ds-text-secondary);">${icon}</div>
                                </div>
                            ` : ''}
                            <h3 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2); line-height: 1.2;">${title}</h3>
                            <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; padding: 0 var(--ds-space-2); margin: 0;">${message}</p>
                        </div>
                        <div style="padding: 0 var(--ds-space-8) var(--ds-space-8); display: flex; justify-content: center;">
                            <button id="${popupId}_ok" style="min-width: 120px; padding: var(--ds-space-3) var(--ds-space-6); font-size: var(--ds-text-sm); border-radius: var(--ds-radius-lg); font-weight: var(--ds-weight-medium); color: white; cursor: pointer; transition: all 0.2s; ${Popup._getButtonStyle(variant)};">
                                ${okText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', popupHtml);

            const popup = document.getElementById(popupId);
            const okBtn = document.getElementById(`${popupId}_ok`);

            const cleanup = () => {
                popup.remove();
                if (onClose) onClose();
            };

            okBtn.addEventListener('click', () => {
                cleanup();
                resolve();
            });

            if (closeOnBackdrop) {
                popup.addEventListener('click', (e) => {
                    if (e.target === popup) {
                        cleanup();
                        resolve();
                    }
                });
            }
        });
    },

    /**
     * Show a custom popup
     * @param {Object} options - Popup configuration
     */
    show: (options = {}) => {
        const {
            id = 'customPopup_' + Date.now(),
            title = '',
            content = '',
            footer = '',
            size = 'md', // sm, md, lg, xl
            closeable = true,
            onClose = null,
            buttons = null // [{ text, variant, onClick, dismissOnClick }]
        } = options;

        const sizeClasses = {
            sm: '400px',
            md: '600px',
            lg: '800px',
            xl: '1000px'
        };

        const popupHtml = `
            <div id="${id}" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: var(--ds-space-4); transition: all 0.3s;">
                <div class="animate-premium-pop"
                     style="background: var(--ds-bg-surface); width: 100%; max-width: ${sizeClasses[size] || '600px'}; max-height: 90vh; display: flex; flex-direction: column; border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-xl); border: 1px solid var(--ds-border-default); overflow: hidden;">
                    ${title ? `
                        <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; justify-content: space-between; background: var(--ds-bg-surface);">
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${title}</h3>
                            ${closeable ? `
                                <button class="popup-close" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: transparent; color: var(--ds-text-tertiary); font-size: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--ds-bg-surface-sunken)'; this.style.color='var(--ds-text-secondary)';" onmouseout="this.style.background='transparent'; this.style.color='var(--ds-text-tertiary)';">
                                    &times;
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div style="padding: var(--ds-space-6); overflow-y: auto; flex: 1; min-height: 0; font-size: var(--ds-text-sm); line-height: 1.6; color: var(--ds-text-secondary); background: var(--ds-bg-surface);">
                        ${content}
                    </div>
                    ${footer || buttons ? `
                        <div style="padding: var(--ds-space-5) var(--ds-space-6); border-top: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken); display: flex; ${buttons ? 'gap: var(--ds-space-3); justify-content: flex-end;' : ''}">
                            ${footer ? footer : ''}
                            ${buttons ? buttons.map((btn, idx) => {
                                // Default button logic for secondary variant
                                if (btn.variant === 'secondary') {
                                    return `
                                        <button id="${id}_btn_${idx}" style="min-width: 100px; padding: var(--ds-space-2) var(--ds-space-5); text-align: center; white-space: nowrap; background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); color: var(--ds-text-secondary); border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--ds-bg-surface-sunken)'" onmouseout="this.style.background='var(--ds-bg-surface)'">
                                            ${btn.text || 'Button'}
                                        </button>
                                    `;
                                }
                                return `
                                    <button id="${id}_btn_${idx}" style="min-width: 100px; padding: var(--ds-space-2) var(--ds-space-5); text-align: center; white-space: nowrap; border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: white; cursor: pointer; transition: all 0.2s; ${Popup._getButtonStyle(btn.variant || 'primary')};">
                                        ${btn.text || 'Button'}
                                    </button>
                                `;
                            }).join('') : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHtml);

        const popup = document.getElementById(id);

        if (closeable) {
            const closeBtn = popup.querySelector('.popup-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    Popup.close(id);
                    if (onClose) onClose();
                });
            }

            // Close on backdrop click
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    Popup.close(id);
                    if (onClose) onClose();
                }
            });
        }

        // Wire dynamic buttons if provided
        if (buttons && Array.isArray(buttons)) {
            buttons.forEach((btn, idx) => {
                const el = document.getElementById(`${id}_btn_${idx}`);
                if (el) {
                    el.addEventListener('click', async () => {
                        try {
                            if (typeof btn.onClick === 'function') {
                                await btn.onClick();
                            }
                        } finally {
                            if (btn.dismissOnClick !== false) {
                                Popup.close(id);
                                if (onClose) onClose();
                            }
                        }
                    });
                }
            });
        }

        return id;
    },

    /**
     * Close a popup by ID
     * @param {string} id - Popup ID
     */
    close: (id) => {
        const popup = document.getElementById(id);
        if (popup) {
            popup.remove();
        }
    },

    /**
     * Get button class based on variant
     * @private
     */
    _getButtonClass: (variant) => {
        return 'text-white';
    },

    /**
     * Get button style based on variant
     * @private
     */
    _getButtonStyle: (variant) => {
        const config = {
            primary: {
                bg: 'linear-gradient(135deg, #1346A8 0%, #1e40af 100%)',
                glow: 'rgba(19, 70, 168, 0.4)'
            },
            success: {
                bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                glow: 'rgba(16, 185, 129, 0.4)'
            },
            danger: {
                bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                glow: 'rgba(239, 68, 68, 0.4)'
            },
            warning: {
                bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                glow: 'rgba(245, 158, 11, 0.4)'
            }
        };
        const style = config[variant] || config.primary;
        return `background: ${style.bg}; box-shadow: 0 12px 30px -8px ${style.glow}; border: none;`;
    }
};

// Add animation styles
if (!document.getElementById('popup-styles')) {
    const style = document.createElement('style');
    style.id = 'popup-styles';
    style.textContent = `
        @keyframes premium-pop {
            0% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(10px); }
            60% { opacity: 1; transform: scale(1.02) translateY(-2px); filter: blur(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes float-slow {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }
        .animate-premium-pop {
            animation: premium-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-float-slow {
            animation: float-slow 3s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Popup = Popup;
}
