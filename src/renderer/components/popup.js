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

            const footerClasses = showCancel && cancelText ? 'justify-end' : 'justify-center';
            const popupHtml = `
                <div id="${popupId}" class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-500">
                    <div class="bg-white max-w-sm w-full animate-premium-pop border border-gray-100" 
                         style="border-radius: 16px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);">
                        <div class="px-8 pt-8 pb-4 text-center">
                            ${icon ? `
                                <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative"
                                     style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">
                                    <div class="absolute inset-0 rounded-full border border-white/80 shadow-sm"></div>
                                    <div class="text-3xl relative z-10 text-gray-700">${icon}</div>
                                </div>
                            ` : ''}
                            <h3 class="text-2xl font-bold text-gray-900 mb-2 tracking-tight">${title}</h3>
                            <p class="text-gray-500 text-sm leading-relaxed px-2">${message}</p>
                        </div>
                        <div class="px-8 pb-6 flex gap-3 ${footerClasses}">
                            ${showCancel && cancelText ? `
                            <button id="${popupId}_cancel" class="flex-1 px-4 py-3 text-sm bg-gray-500 border border-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-gray-400 focus:outline-none"
                                    style="border-radius: 8px;">
                                ${cancelText}
                            </button>
                            ` : ''}
                            <button id="${popupId}_confirm" class="flex-1 px-4 py-3 text-sm ${Popup._getButtonClass(confirmVariant)} rounded-lg font-medium shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none" 
                                    style="${Popup._getButtonStyle(confirmVariant)}; border-radius: 8px;">
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
                <div id="${popupId}" class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-500">
                    <div class="bg-white max-w-sm w-full animate-premium-pop border border-gray-100"
                         style="border-radius: 16px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);">
                        <div class="px-8 py-12 text-center">
                            ${icon ? `
                                <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative"
                                     style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">
                                    <div class="absolute inset-0 rounded-full border border-white/80 shadow-sm"></div>
                                    <div class="text-3xl relative z-10 text-gray-700">${icon}</div>
                                </div>
                            ` : ''}
                            <h3 class="text-2xl font-bold text-gray-900 mb-2 tracking-tight">${title}</h3>
                            <p class="text-gray-500 text-sm leading-relaxed px-2">${message}</p>
                        </div>
                        <div class="px-8 pb-8 flex gap-3 justify-center">
                            <button id="${popupId}_ok" class="min-w-[120px] px-6 py-3 text-sm ${Popup._getButtonClass(variant)} rounded-lg font-medium shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none" 
                                    style="${Popup._getButtonStyle(variant)}; border-radius: 8px;">
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
            sm: 'max-w-md',
            md: 'max-w-2xl',
            lg: 'max-w-4xl',
            xl: 'max-w-6xl'
        };

        const popupHtml = `
            <div id="${id}" class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-500">
                <div class="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col animate-premium-pop border border-gray-100"
                     style="border-radius: 16px;">
                    ${title ? `
                        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                            <h3 class="text-xl font-bold text-gray-900">${title}</h3>
                            ${closeable ? `
                                <button class="popup-close text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                                    ×
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="px-6 py-6 overflow-y-auto flex-1 text-gray-600 text-sm leading-relaxed">
                        ${content}
                    </div>
                    ${footer || buttons ? `
                        <div class="px-6 py-5 border-t border-gray-100 bg-gray-50 flex ${buttons ? 'gap-3 justify-end' : ''}">
                            ${footer ? footer : ''}
                            ${buttons ? buttons.map((btn, idx) => `
                                <button id="${id}_btn_${idx}" class="px-5 py-2.5 text-sm ${Popup._getButtonClass(btn.variant || 'primary')} rounded-lg font-medium shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none" 
                                        style="${Popup._getButtonStyle(btn.variant || 'primary')}; border-radius: 8px;">
                                    ${btn.text || 'Button'}
                                </button>
                            `).join('') : ''}
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
