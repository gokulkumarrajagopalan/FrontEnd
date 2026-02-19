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
            default: 'style="background: var(--ds-bg-app)"',
            white: 'style="background: var(--ds-bg-app)"'
        };

        return `
            <div class="min-h-screen" ${backgrounds[background]}>
                <div style="padding: var(--ds-space-10); max-width: 1400px; margin: 0 auto; box-sizing: border-box;">
                    ${(title || headerActions) ? window.UIComponents.pageHeader({
            title,
            subtitle,
            actions: headerActions
        }) : ''}
                    <div style="margin-top: var(--ds-space-8);">
                        ${content}
                    </div>
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
            <div class="grid ${colClasses[columns]} ${className}" style="gap: var(--ds-space-${gap});">
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
            <div class="flex" style="gap: var(--ds-space-${gap});">
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
            2: 'grid grid-cols-1 md:grid-cols-2',
            3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        };

        return `
            <form id="${id}" ${onSubmit ? `onsubmit="${onSubmit}"` : ''} class="${className}" style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                ${title ? `<h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);">${title}</h3>` : ''}
                <div class="${colClasses[columns]}" style="gap: var(--ds-space-6);">
                    ${fields.map(field => `<div>${field}</div>`).join('')}
                </div>
                <div style="display: flex; gap: var(--ds-space-3); justify-content: flex-end; padding-top: var(--ds-space-4);">
                    ${cancelButton ? window.UIComponents.button({
            text: cancelButton,
            variant: 'secondary',
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
            icon = '<i class="fas fa-chart-bar" style="color:var(--ds-primary-600)"></i>',
            title = '',
            value = '',
            change = '',
            changeType = 'positive', // positive, negative, neutral
            className = ''
        } = options;

        const changeColors = {
            positive: 'color: var(--ds-success-600);',
            negative: 'color: var(--ds-error-600);',
            neutral: 'color: var(--ds-text-secondary);'
        };

        return `
            <div class="${className}" style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); shadow: var(--ds-shadow-sm); border: 1px solid var(--ds-border-default); padding: var(--ds-space-6);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ds-space-4);">
                    <div style="font-size: var(--ds-text-3xl);">${icon}</div>
                    ${change ? `<span style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); ${changeColors[changeType]}">${change}</span>` : ''}
                </div>
                <h3 style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1);">${title}</h3>
                <p style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${value}</p>
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
            <div class="${className}" style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); shadow: var(--ds-shadow-sm); border: 1px solid var(--ds-border-default); padding: var(--ds-space-4); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: var(--ds-space-3);">
                    ${leftActions}
                </div>
                <div style="display: flex; align-items: center; gap: var(--ds-space-3);">
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
            <div class="${className}" style="margin-bottom: var(--ds-space-8);">
                ${(title || actions) ? `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ds-space-4);">
                        <div>
                            ${title ? `<h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${title}</h3>` : ''}
                            ${description ? `<p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">${description}</p>` : ''}
                        </div>
                        ${actions ? `<div style="display: flex; gap: var(--ds-space-3);">${actions}</div>` : ''}
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
            <div class="${className}" style="border-bottom: 1px solid var(--ds-border-default);">
                <nav id="${id}" style="display: flex; gap: var(--ds-space-8);" aria-label="Tabs">
                    ${tabs.map(tab => `
                        <button
                            data-tab="${tab.id}"
                            class="tab-btn ${tab.active ? 'active' : ''}"
                            style="white-space: nowrap; padding: var(--ds-space-4) var(--ds-space-1); border: none; border-bottom: 2px solid ${tab.active ? 'var(--ds-primary-600)' : 'transparent'}; font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); transition: all var(--ds-duration-base) var(--ds-ease); background: none; color: ${tab.active ? 'var(--ds-primary-600)' : 'var(--ds-text-tertiary)'}; cursor: pointer;"
                            onmouseover="if(!this.classList.contains('active')) { this.style.color='var(--ds-text-secondary)'; this.style.borderBottomColor='var(--ds-border-default)'; }"
                            onmouseout="if(!this.classList.contains('active')) { this.style.color='var(--ds-text-tertiary)'; this.style.borderBottomColor='transparent'; }"
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
            <div class="${className}" style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-4); display: flex; align-items: center; justify-content: space-between; transition: all var(--ds-duration-base) var(--ds-ease);"
                 onmouseover="this.style.boxShadow='var(--ds-shadow-md)'; this.style.borderColor='var(--ds-primary-200)';"
                 onmouseout="this.style.boxShadow='none'; this.style.borderColor='var(--ds-border-default)';"
            >
                <div style="display: flex; align-items: center; gap: var(--ds-space-4);">
                    ${icon ? `<div style="font-size: var(--ds-text-2xl);">${icon}</div>` : ''}
                    <div>
                        <h4 style="font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0;">${title}</h4>
                        ${subtitle ? `<p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">${subtitle}</p>` : ''}
                    </div>
                </div>
                ${actions ? `<div style="display: flex; align-items: center; gap: var(--ds-space-2);">${actions}</div>` : ''}
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Layout = Layout;
}
