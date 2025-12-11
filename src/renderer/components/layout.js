/**
 * Layout Components
 * Standardized page layouts and containers
 */

const Layout = {
    /**
     * Main Page Layout
     * Provides consistent background and container structure
     * @param {Object} options - Layout configuration
     */
    page: (options = {}) => {
        const {
            title = '',
            subtitle = '',
            headerActions = '',
            content = '',
            background = 'default' // default, white
        } = options;

        const backgrounds = {
            default: 'style="background: var(--bg-primary)"',
            white: 'style="background: var(--bg-primary)"'
        };

        return `
            <div class="min-h-screen p-8" ${backgrounds[background]}>
                ${(title || headerActions) ? window.UIComponents.pageHeader({
                    title,
                    subtitle,
                    actions: headerActions
                }) : ''}
                <div class="container mx-auto mt-8">
                    ${content}
                </div>
            </div>
        `;
    },

    /**
     * Grid Layout
     * Responsive grid for cards or items
     * @param {Object} options - Grid configuration
     */
    grid: (options = {}) => {
        const {
            columns = 3, // Number of columns (1, 2, 3, 4, 6)
            gap = 6,
            items = [],
            className = ''
        } = options;

        const colClasses = {
            1: 'grid-cols-1',
            2: 'grid-cols-1 md:grid-cols-2',
            3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
            6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
        };

        return `
            <div class="grid ${colClasses[columns]} gap-${gap} ${className}">
                ${items.join('')}
            </div>
        `;
    },

    /**
     * Two Column Layout
     * Sidebar and main content
     * @param {Object} options - Two column configuration
     */
    twoColumn: (options = {}) => {
        const {
            sidebar = '',
            main = '',
            sidebarWidth = '1/4', // 1/4, 1/3, 1/2
            gap = 6
        } = options;

        const mainWidth = {
            '1/4': '3/4',
            '1/3': '2/3',
            '1/2': '1/2'
        };

        return `
            <div class="flex gap-${gap}">
                <div class="w-${sidebarWidth}">
                    ${sidebar}
                </div>
                <div class="w-${mainWidth[sidebarWidth]}">
                    ${main}
                </div>
            </div>
        `;
    },

    /**
     * Form Layout
     * Standardized form structure
     * @param {Object} options - Form configuration
     */
    form: (options = {}) => {
        const {
            id = '',
            title = '',
            fields = [],
            submitButton = 'Submit',
            cancelButton = '',
            columns = 1, // 1, 2, or 3 columns
            onSubmit = '',
            className = ''
        } = options;

        const colClasses = {
            1: '',
            2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
            3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        };

        return `
            <form id="${id}" ${onSubmit ? `onsubmit="${onSubmit}"` : ''} class="space-y-6 ${className}">
                ${title ? `<h3 class="text-lg font-bold text-gray-900 mb-4">${title}</h3>` : ''}
                <div class="${colClasses[columns]}">
                    ${fields.map(field => `<div>${field}</div>`).join('')}
                </div>
                <div class="flex gap-3 justify-end pt-4">
                    ${cancelButton ? window.UIComponents.button({
                        text: cancelButton,
                        variant: 'outline',
                        type: 'button'
                    }) : ''}
                    ${window.UIComponents.button({
                        text: submitButton,
                        variant: 'primary',
                        type: 'submit'
                    })}
                </div>
            </form>
        `;
    },

    /**
     * Stats Card
     * Display statistics or metrics
     * @param {Object} options - Stats configuration
     */
    statsCard: (options = {}) => {
        const {
            icon = '📊',
            title = '',
            value = '',
            change = '',
            changeType = 'positive', // positive, negative, neutral
            className = ''
        } = options;

        const changeColors = {
            positive: 'text-green-600',
            negative: 'text-red-600',
            neutral: 'text-gray-600'
        };

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${className}">
                <div class="flex items-center justify-between mb-4">
                    <div class="text-3xl">${icon}</div>
                    ${change ? `<span class="text-sm font-semibold ${changeColors[changeType]}">${change}</span>` : ''}
                </div>
                <h3 class="text-sm font-medium text-gray-600 mb-1">${title}</h3>
                <p class="text-2xl font-bold text-gray-900">${value}</p>
            </div>
        `;
    },

    /**
     * Action Bar
     * Toolbar with actions
     * @param {Object} options - Action bar configuration
     */
    actionBar: (options = {}) => {
        const {
            leftActions = '',
            rightActions = '',
            className = ''
        } = options;

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center justify-between ${className}">
                <div class="flex items-center gap-3">
                    ${leftActions}
                </div>
                <div class="flex items-center gap-3">
                    ${rightActions}
                </div>
            </div>
        `;
    },

    /**
     * Content Section
     * Section with title and content
     * @param {Object} options - Section configuration
     */
    section: (options = {}) => {
        const {
            title = '',
            description = '',
            content = '',
            actions = '',
            className = ''
        } = options;

        return `
            <div class="mb-8 ${className}">
                ${(title || actions) ? `
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            ${title ? `<h3 class="text-xl font-bold text-gray-900">${title}</h3>` : ''}
                            ${description ? `<p class="text-sm text-gray-600 mt-1">${description}</p>` : ''}
                        </div>
                        ${actions ? `<div class="flex gap-3">${actions}</div>` : ''}
                    </div>
                ` : ''}
                ${content}
            </div>
        `;
    },

    /**
     * Tab Navigation
     * Tabs for switching content
     * @param {Object} options - Tab configuration
     */
    tabs: (options = {}) => {
        const {
            id = '',
            tabs = [], // [{id: '', label: '', active: true/false}]
            className = ''
        } = options;

        return `
            <div class="border-b border-gray-200 ${className}">
                <nav id="${id}" class="flex space-x-8" aria-label="Tabs">
                    ${tabs.map(tab => `
                        <button
                            data-tab="${tab.id}"
                            class="tab-btn ${tab.active ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                                   whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                        >
                            ${tab.label}
                        </button>
                    `).join('')}
                </nav>
            </div>
        `;
    },

    /**
     * List Item
     * Single list item with icon and actions
     * @param {Object} options - List item configuration
     */
    listItem: (options = {}) => {
        const {
            icon = '',
            title = '',
            subtitle = '',
            actions = '',
            className = ''
        } = options;

        return `
            <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow ${className}">
                <div class="flex items-center gap-4">
                    ${icon ? `<div class="text-2xl">${icon}</div>` : ''}
                    <div>
                        <h4 class="font-semibold text-gray-900">${title}</h4>
                        ${subtitle ? `<p class="text-sm text-gray-600 mt-1">${subtitle}</p>` : ''}
                    </div>
                </div>
                ${actions ? `<div class="flex items-center gap-2">${actions}</div>` : ''}
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Layout = Layout;
}
