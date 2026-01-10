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
            icon = '❓',
            confirmVariant = 'danger' // primary, danger, success
        } = options;

        return new Promise((resolve) => {
            const popupId = 'confirmPopup_' + Date.now();
            
            const popupHtml = `
                <div id="${popupId}" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div class="p-6">
                            <div class="flex items-start gap-4">
                                <div class="text-4xl">${icon}</div>
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
                                    <p class="text-gray-600">${message}</p>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
                            <button id="${popupId}_cancel" class="px-6 py-3 text-sm bg-gray-200 border-2 border-gray-300 text-black rounded-xl font-bold hover:bg-gray-300 active:scale-[0.98] transition-all">
                                ${cancelText}
                            </button>
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

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

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
            onClose = null
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
                    ${footer ? `
                        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            ${footer}
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
            primary: 'bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white',
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
