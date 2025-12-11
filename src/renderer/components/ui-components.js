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
            focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all 
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
            variant = 'primary', // primary, secondary, success, danger, outline
            size = 'md', // sm, md, lg
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

        const variantClasses = {
            primary: 'bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white',
            secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
            success: 'bg-green-600 hover:bg-green-700 text-white',
            danger: 'bg-red-600 hover:bg-red-700 text-white',
            outline: 'bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
        };

        const baseClasses = `${fullWidth ? 'w-full' : ''} ${sizeClasses[size]} ${variantClasses[variant]} 
            rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] 
            transition-all duration-200 flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

        return `
            <button 
                type="${type}" 
                id="${id}" 
                class="${baseClasses}"
                ${disabled ? 'disabled' : ''}
            >
                ${icon ? `<span class="text-lg">${icon}</span>` : ''}
                <span>${text}</span>
            </button>
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
            focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all 
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
            focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all 
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
            type = 'info', // success, warning, danger, info
            message = '',
            icon = '',
            dismissible = false,
            id = ''
        } = options;

        const typeClasses = {
            success: 'bg-green-50 border-green-200 text-green-700',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            danger: 'bg-red-50 border-red-200 text-red-700',
            info: 'bg-blue-50 border-blue-200 text-blue-700'
        };

        const defaultIcons = {
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️'
        };

        const displayIcon = icon || defaultIcons[type];

        return `
            <div id="${id}" class="p-4 rounded-2xl border ${typeClasses[type]} text-sm flex items-start gap-3">
                <span class="text-lg">${displayIcon}</span>
                <span class="flex-1">${message}</span>
                ${dismissible ? '<button class="text-lg hover:opacity-70">×</button>' : ''}
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
            variant = 'primary', // primary, success, warning, danger, info
            size = 'md' // sm, md, lg
        } = options;

        const variantClasses = {
            primary: 'bg-purple-100 text-purple-700',
            success: 'bg-green-100 text-green-700',
            warning: 'bg-yellow-100 text-yellow-700',
            danger: 'bg-red-100 text-red-700',
            info: 'bg-blue-100 text-blue-700'
        };

        const sizeClasses = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-3 py-1 text-sm',
            lg: 'px-4 py-1.5 text-base'
        };

        return `
            <span class="inline-flex items-center rounded-full font-semibold ${variantClasses[variant]} ${sizeClasses[size]}">
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
                <div class="${sizeClasses[size]} border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
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
                           focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
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
                    ${subtitle ? `<p class="text-sm text-purple-100">${subtitle}</p>` : ''}
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
