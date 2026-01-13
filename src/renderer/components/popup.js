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
                <div id="${popupId}" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div class="p-6">
                            <div class="flex items-start gap-4">
                                ${icon ? `<div class="text-4xl">${icon}</div>` : ''}
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
                                    <div class="text-gray-600">${message}</div>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 flex gap-3 ${footerClasses}">
                            ${showCancel && cancelText ? `
                            <button id="${popupId}_cancel" class="px-6 py-3 text-sm bg-gray-200 border-2 border-gray-300 text-black rounded-xl font-bold hover:bg-gray-300 active:scale-[0.98] transition-all">
                                ${cancelText}
                            </button>
                            ` : ''}
                            <button id="${popupId}_confirm" class="px-6 py-3 text-sm ${Popup._getButtonClass(confirmVariant)} rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">
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
                <div id="${popupId}" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div class="p-6">
                            <div class="flex items-start gap-4">
                                ${icon ? `<div class="text-4xl">${icon}</div>` : ''}
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
                                    <div class="text-gray-600">${message}</div>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 flex gap-3 justify-center">
                            <button id="${popupId}_ok" class="px-6 py-3 text-sm ${Popup._getButtonClass(variant)} rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">
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
            <div id="${id}" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                    ${title ? `
                        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 class="text-xl font-bold text-gray-900">${title}</h3>
                            ${closeable ? `
                                <button class="popup-close text-gray-400 hover:text-gray-600 text-2xl leading-none">
                                    ×
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="px-6 py-4 overflow-y-auto flex-1">
                        ${content}
                    </div>
                    ${footer || buttons ? `
                        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex ${buttons ? 'gap-3 justify-end' : ''}">
                            ${footer ? footer : ''}
                            ${buttons ? buttons.map((btn, idx) => `
                                <button id="${id}_btn_${idx}" class="px-6 py-3 text-sm ${Popup._getButtonClass(btn.variant || 'primary')} rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">
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
        const variants = {
            primary: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white',
            danger: 'bg-red-600 hover:bg-red-700 text-white',
            success: 'bg-green-600 hover:bg-green-700 text-white'
        };
        return variants[variant] || variants.primary;
    }
};

// Add animation styles
if (!document.getElementById('popup-styles')) {
    const style = document.createElement('style');
    style.id = 'popup-styles';
    style.textContent = `
        @keyframes scale-in {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        .animate-scale-in {
            animation: scale-in 0.2s ease-out;
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Popup = Popup;
}
