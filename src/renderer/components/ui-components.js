/**
 * Reusable UI Components Library
 * Standardized components for consistent design across the application
 */

const UIComponents = {
    /**
     * Input Component
     * @param {Object} options - Input configuration
     * @param {string} options.id - Input ID
     * @param {string} options.type - Input type (text, email, password, number, date, etc.)
     * @param {string} options.placeholder - Placeholder text
     * @param {string} options.label - Label text
     * @param {string} options.value - Default value
     * @param {boolean} options.required - Required field
     * @param {string} options.icon - Icon emoji or text
     * @param {string} options.width - Width class (default: w-full)
     * @param {boolean} options.disabled - Disabled state
     */
    input: (options = {}) => {
        const {
            id = '',
            type = 'text',
            placeholder = '',
            label = '',
            value = '',
            required = false,
            icon = '',
            width = 'w-full',
            disabled = false,
            className = ''
        } = options;

        const inputClasses = `${width} px-4 py-3 ${icon ? 'pl-11' : ''} rounded-xl border-2 border-gray-200 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all 
            text-gray-900 bg-white text-sm font-medium placeholder-gray-400
            disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`;

        return `
            ${label ? `<label class="block text-xs font-bold text-gray-800 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>` : ''}
            <div class="relative group">
                ${icon ? `<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span class="text-lg">${icon}</span>
                </div>` : ''}
                <input 
                    type="${type}" 
                    id="${id}" 
                    class="${inputClasses}"
                    placeholder="${placeholder}" 
                    value="${value}"
                    ${required ? 'required' : ''}
                    ${disabled ? 'disabled' : ''}
                >
            </div>
        `;
    },

    /**
     * Button Component
     * @param {Object} options - Button configuration
     */
    button: (options = {}) => {
        const {
            id = '',
            text = 'Button',
            icon = '',
            variant = 'primary',
            size = 'md',
            fullWidth = false,
            disabled = false,
            type = 'button',
            className = ''
        } = options;

        const sizeClasses = {
            sm: 'px-4 py-2 text-xs',
            md: 'px-6 py-3 text-sm',
            lg: 'px-8 py-4 text-base'
        };

        const variantStyles = {
            primary: 'background: linear-gradient(135deg, #5e86ba 0%, #496da0 100%); color: white; border: none; box-shadow: 0 6px 20px rgba(94, 134, 186, 0.35);',
            secondary: 'background: linear-gradient(135deg, #395984 0%, #2d4563 100%); color: white; border: none; box-shadow: 0 6px 20px rgba(57, 89, 132, 0.35);',
            success: 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);',
            danger: 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);',
            purple: 'background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: white; border: none; box-shadow: 0 6px 20px rgba(147, 51, 234, 0.35);',
            outline: 'background: transparent; color: #5e86ba; border: 2px solid #5e86ba;'
        };

        const baseClasses = `${fullWidth ? 'w-full' : ''} ${sizeClasses[size]} rounded-xl font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${className}`;

        return `
            <button 
                type="${type}" 
                id="${id}" 
                class="${baseClasses}"
                style="${variantStyles[variant]} cursor: pointer;"
                ${disabled ? 'disabled' : ''}
            >
                ${icon ? `<span class="text-lg">${icon}</span>` : ''}
                <span>${text}</span>
            </button>
            <style>
                #${id}:hover {
                    ${variant === 'primary' ? 'background: linear-gradient(135deg, #496da0 0%, #37537b 100%); box-shadow: 0 12px 25px rgba(94, 134, 186, 0.5); transform: translateY(-2px);' : ''}
                    ${variant === 'secondary' ? 'background: linear-gradient(135deg, #2d4563 0%, #1f2e42 100%); box-shadow: 0 12px 25px rgba(57, 89, 132, 0.5); transform: translateY(-2px);' : ''}
                    ${variant === 'success' ? 'background: linear-gradient(135deg, #059669 0%, #047857 100%); box-shadow: 0 12px 25px rgba(16, 185, 129, 0.5); transform: translateY(-2px);' : ''}
                    ${variant === 'danger' ? 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 12px 25px rgba(239, 68, 68, 0.5); transform: translateY(-2px);' : ''}
                    ${variant === 'purple' ? 'background: linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%); box-shadow: 0 12px 25px rgba(147, 51, 234, 0.5); transform: translateY(-2px);' : ''}
                    ${variant === 'outline' ? 'background: rgba(94, 134, 186, 0.1); border-color: #496da0;' : ''}
                }
                #${id}:active {
                    transform: scale(0.98);
                }
                #${id}:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    box-shadow: none;
                }
            </style>
        `;
    },

    /**
     * Select/Dropdown Component
     * @param {Object} options - Select configuration
     */
    select: (options = {}) => {
        const {
            id = '',
            label = '',
            options: selectOptions = [],
            value = '',
            required = false,
            width = 'w-full',
            disabled = false,
            placeholder = 'Select an option',
            className = ''
        } = options;

        const selectClasses = `${width} px-4 py-3 rounded-xl border-2 border-gray-200 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all 
            text-gray-900 bg-white text-sm font-medium
            disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`;

        return `
            ${label ? `<label class="block text-xs font-bold text-gray-800 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>` : ''}
            <select 
                id="${id}" 
                class="${selectClasses}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
            >
                ${placeholder ? `<option value="">${placeholder}</option>` : ''}
                ${selectOptions.map(opt => `
                    <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                        ${opt.label}
                    </option>
                `).join('')}
            </select>
        `;
    },

    /**
     * Textarea Component
     * @param {Object} options - Textarea configuration
     */
    textarea: (options = {}) => {
        const {
            id = '',
            label = '',
            placeholder = '',
            value = '',
            rows = 4,
            required = false,
            disabled = false,
            className = ''
        } = options;

        const textareaClasses = `w-full px-4 py-3 rounded-xl border-2 border-gray-200 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all 
            text-gray-900 bg-white text-sm font-medium placeholder-gray-400
            disabled:bg-gray-100 disabled:cursor-not-allowed resize-none ${className}`;

        return `
            ${label ? `<label class="block text-xs font-bold text-gray-800 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>` : ''}
            <textarea 
                id="${id}" 
                class="${textareaClasses}"
                placeholder="${placeholder}"
                rows="${rows}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
            >${value}</textarea>
        `;
    },

    /**
     * Card Component
     * @param {Object} options - Card configuration
     */
    card: (options = {}) => {
        const {
            title = '',
            content = '',
            footer = '',
            className = '',
            padding = 'p-6'
        } = options;

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${className}">
                ${title ? `
                    <div class="border-b border-gray-200 px-6 py-4 bg-gray-50">
                        <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                    </div>
                ` : ''}
                <div class="${padding}">
                    ${content}
                </div>
                ${footer ? `
                    <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
                        ${footer}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Alert Component
     * @param {Object} options - Alert configuration
     */
    alert: (options = {}) => {
        const {
            type = 'info',
            message = '',
            icon = '',
            dismissible = false,
            id = ''
        } = options;

        const typeStyles = {
            success: 'background: rgba(16, 185, 129, 0.1); border-color: #10b981; color: #059669;',
            warning: 'background: rgba(245, 158, 11, 0.1); border-color: #f59e0b; color: #d97706;',
            danger: 'background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #dc2626;',
            info: 'background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; color: #2563eb;'
        };

        const defaultIcons = {
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️'
        };

        const displayIcon = icon || defaultIcons[type];

        return `
            <div id="${id}" class="p-4 rounded-2xl border text-sm flex items-start gap-3" style="${typeStyles[type]}">
                <span class="text-lg">${displayIcon}</span>
                <span class="flex-1">${message}</span>
                ${dismissible ? '<button class="text-lg hover:opacity-70" style="background: none; border: none; cursor: pointer;">×</button>' : ''}
            </div>
        `;
    },

    /**
     * Badge Component
     * @param {Object} options - Badge configuration
     */
    badge: (options = {}) => {
        const {
            text = '',
            variant = 'primary',
            size = 'md'
        } = options;

        const variantStyles = {
            primary: 'background: rgba(94, 134, 186, 0.1); color: var(--primary-600);',
            success: 'background: rgba(16, 185, 129, 0.1); color: #059669;',
            warning: 'background: rgba(245, 158, 11, 0.1); color: #d97706;',
            danger: 'background: rgba(239, 68, 68, 0.1); color: #dc2626;',
            info: 'background: rgba(59, 130, 246, 0.1); color: #2563eb;',
            purple: 'background: var(--accent-purple-light); color: var(--accent-purple);'
        };

        const sizeClasses = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-3 py-1 text-sm',
            lg: 'px-4 py-1.5 text-base'
        };

        return `
            <span class="inline-flex items-center rounded-full font-semibold ${sizeClasses[size]}" style="${variantStyles[variant]}">
                ${text}
            </span>
        `;
    },

    /**
     * Table Component
     * @param {Object} options - Table configuration
     */
    table: (options = {}) => {
        const {
            id = '',
            headers = [],
            rows = [],
            className = ''
        } = options;

        return `
            <div class="overflow-x-auto rounded-xl border border-gray-200 ${className}">
                <table id="${id}" class="w-full border-collapse">
                    <thead class="bg-gray-50">
                        <tr>
                            ${headers.map(header => `
                                <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                    ${header}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${rows.map(row => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                ${row.map(cell => `
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        ${cell}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Loading Spinner Component
     * @param {Object} options - Spinner configuration
     */
    spinner: (options = {}) => {
        const {
            size = 'md', // sm, md, lg
            text = 'Loading...',
            fullScreen = false
        } = options;

        const sizeClasses = {
            sm: 'w-6 h-6',
            md: 'w-10 h-10',
            lg: 'w-16 h-16'
        };

        const spinner = `
            <div class="inline-flex flex-col items-center justify-center gap-3">
                <div class="${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                ${text ? `<p class="text-sm text-gray-600 font-medium">${text}</p>` : ''}
            </div>
        `;

        if (fullScreen) {
            return `
                <div class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                    ${spinner}
                </div>
            `;
        }

        return spinner;
    },

    /**
     * Modal Component
     * @param {Object} options - Modal configuration
     */
    modal: (options = {}) => {
        const {
            id = '',
            title = '',
            content = '',
            footer = '',
            size = 'md', // sm, md, lg, xl
            closeable = true
        } = options;

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-2xl',
            lg: 'max-w-4xl',
            xl: 'max-w-6xl'
        };

        return `
            <div id="${id}" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col">
                    ${title ? `
                        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 class="text-xl font-bold text-gray-900">${title}</h3>
                            ${closeable ? `
                                <button class="text-gray-400 hover:text-gray-600 text-2xl leading-none" onclick="document.getElementById('${id}').classList.add('hidden')">
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
    },

    /**
     * Search Input Component
     * @param {Object} options - Search input configuration
     */
    searchInput: (options = {}) => {
        const {
            id = '',
            placeholder = 'Search...',
            width = 'w-64',
            className = ''
        } = options;

        return `
            <div class="relative ${width} ${className}">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-400">🔍</span>
                </div>
                <input 
                    type="text" 
                    id="${id}" 
                    class="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 
                           focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 
                           transition-all text-gray-900 bg-white text-sm placeholder-gray-400"
                    placeholder="${placeholder}"
                >
            </div>
        `;
    },

    /**
     * Page Header Component
     * @param {Object} options - Header configuration
     */
    pageHeader: (options = {}) => {
        const {
            title = '',
            subtitle = '',
            actions = ''
        } = options;

        return `
            <div class="page-header flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-white mb-1">${title}</h2>
                    ${subtitle ? `<p class="text-sm text-blue-100">${subtitle}</p>` : ''}
                </div>
                ${actions ? `<div class="flex gap-3">${actions}</div>` : ''}
            </div>
        `;
    },

    /**
     * Empty State Component
     * @param {Object} options - Empty state configuration
     */
    emptyState: (options = {}) => {
        const {
            icon = '📭',
            title = 'No data available',
            message = 'There are no items to display.',
            action = ''
        } = options;

        return `
            <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div class="text-6xl mb-4">${icon}</div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
                <p class="text-gray-600 mb-6 max-w-md">${message}</p>
                ${action ? `<div>${action}</div>` : ''}
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}
