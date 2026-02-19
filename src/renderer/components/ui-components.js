/**
 * Reusable UI Components Library
 * Standardized components for consistent design across the application
 */

const UIComponents = {
    /**
     * Input Component
     * @param {Object} options - Input configuration
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
            suffix = '',
            width = 'w-full',
            disabled = false,
            className = ''
        } = options;

        return `
            ${label ? `<label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">
                ${label} ${required ? '<span style="color: var(--ds-error-500);">*</span>' : ''}
            </label>` : ''}
            <div style="position: relative; width: ${width === 'w-full' ? '100%' : 'auto'};">
                ${icon ? `<div style="position: absolute; left: var(--ds-space-4); top: 50%; transform: translateY(-50%); font-size: var(--ds-text-lg); color: var(--ds-text-tertiary); pointer-events: none; display: flex; align-items: center; justify-content: center; width: var(--ds-space-5); height: var(--ds-space-5);">
                    ${icon}
                </div>` : ''}
                <input 
                    type="${type}" 
                    id="${id}" 
                    class="ds-input ${className}"
                    style="width: 100%; ${icon ? 'padding-left: var(--ds-space-12);' : ''} ${suffix ? 'padding-right: var(--ds-space-12);' : ''}"
                    placeholder="${placeholder}" 
                    value="${value}"
                    ${required ? 'required' : ''}
                    ${disabled ? 'disabled' : ''}
                >
                ${suffix ? `<div style="position: absolute; right: var(--ds-space-3); top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; z-index: 10;">
                    ${suffix}
                </div>` : ''}
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
            className = '',
            style = ''
        } = options;

        const variantMap = {
            primary: 'ds-btn-primary',
            secondary: 'ds-btn-secondary',
            success: 'ds-btn-success',
            danger: 'ds-btn-danger',
            outline: 'ds-btn-secondary' // Fallback to secondary for outline
        };

        const sizeMap = {
            sm: 'ds-btn-sm',
            md: '',
            lg: 'ds-btn-lg'
        };

        const btnClass = `ds-btn ${variantMap[variant] || 'ds-btn-primary'} ${sizeMap[size] || ''} ${fullWidth ? 'w-full' : ''} ${className}`;

        return `
            <button 
                type="${type}" 
                id="${id}" 
                class="${btnClass}"
                style="${style}"
                ${disabled ? 'disabled' : ''}
            >
                ${icon ? `<span class="ds-btn-icon">${icon}</span>` : ''}
                <span class="ds-btn-text">${text}</span>
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

        return `
            ${label ? `<label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">
                ${label} ${required ? '<span style="color: var(--ds-error-500);">*</span>' : ''}
            </label>` : ''}
            <select 
                id="${id}" 
                class="ds-input ${className}"
                style="width: ${width === 'w-full' ? '100%' : 'auto'};"
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

        return `
            ${label ? `<label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">
                ${label} ${required ? '<span style="color: var(--ds-error-500);">*</span>' : ''}
            </label>` : ''}
            <textarea 
                id="${id}" 
                class="ds-input ${className}"
                style="width: 100%; min-height: ${rows * 24}px; padding: var(--ds-space-3) var(--ds-space-4);"
                placeholder="${placeholder}"
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
            padding = 'var(--ds-space-6)'
        } = options;

        return `
            <div class="${className}" style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); shadow: var(--ds-shadow-sm); overflow: hidden;">
                ${title ? `
                    <div style="padding: var(--ds-space-4) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${title}</h3>
                    </div>
                ` : ''}
                <div style="padding: ${padding};">
                    ${content}
                </div>
                ${footer ? `
                    <div style="padding: var(--ds-space-4) var(--ds-space-6); border-top: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
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

        const typeMap = {
            success: { bg: 'var(--ds-success-50)', border: 'var(--ds-success-200)', text: 'var(--ds-success-700)', icon: '<i class="fas fa-check-circle"></i>' },
            warning: { bg: 'var(--ds-warning-50)', border: 'var(--ds-warning-200)', text: 'var(--ds-warning-700)', icon: '<i class="fas fa-exclamation-triangle"></i>' },
            danger: { bg: 'var(--ds-error-50)', border: 'var(--ds-error-200)', text: 'var(--ds-error-700)', icon: '<i class="fas fa-times-circle"></i>' },
            info: { bg: 'var(--ds-primary-50)', border: 'var(--ds-primary-200)', text: 'var(--ds-primary-700)', icon: '<i class="fas fa-info-circle"></i>' }
        };

        const style = typeMap[type] || typeMap.info;

        return `
            <div id="${id}" style="padding: var(--ds-space-4); border-radius: var(--ds-radius-xl); border: 1px solid ${style.border}; background: ${style.bg}; color: ${style.text}; font-size: var(--ds-text-sm); display: flex; align-items: flex-start; gap: var(--ds-space-3);">
                <span style="font-size: var(--ds-text-lg); color: ${style.text}; line-height: 1;">${icon || style.icon}</span>
                <span style="flex: 1;">${message}</span>
                ${dismissible ? `<button onclick="this.parentElement.remove()" style="background: none; border: none; color: ${style.text}; cursor: pointer; font-size: var(--ds-text-xl); line-height: 1; padding: 0;">&times;</button>` : ''}
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

        const variantClass = `ds-badge ds-badge-${variant}`;
        const sizeStyle = size === 'sm' ? 'padding: 2px 8px; font-size: var(--ds-text-3xs);' : '';

        return `
            <span class="${variantClass}" style="${sizeStyle}">
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
            <div class="${className}" style="overflow-x: auto; border-radius: var(--ds-radius-xl); border: 1px solid var(--ds-border-default);">
                <table id="${id}" style="width: 100%; border-collapse: collapse; background: var(--ds-bg-surface);">
                    <thead style="background: var(--ds-bg-surface-sunken);">
                        <tr>
                            ${headers.map(header => `
                                <th style="padding: var(--ds-space-4) var(--ds-space-6); text-align: left; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider); border-bottom: 1px solid var(--ds-border-default);">
                                    ${header}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr style="border-bottom: 1px solid var(--ds-border-default); transition: background var(--ds-duration-base) var(--ds-ease);" onmouseover="this.style.background='var(--ds-bg-surface-sunken)'" onmouseout="this.style.background='transparent'">
                                ${row.map(cell => `
                                    <td style="padding: var(--ds-space-4) var(--ds-space-6); font-size: var(--ds-text-sm); color: var(--ds-text-primary);">
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

        const sizeMap = {
            sm: '1.5rem',
            md: '2.5rem',
            lg: '4rem'
        };

        const spinnerSize = sizeMap[size] || sizeMap.md;

        const spinner = `
            <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--ds-space-4);">
                <div style="width: ${spinnerSize}; height: ${spinnerSize}; border: 3px solid var(--ds-primary-100); border-top-color: var(--ds-primary-500); border-radius: 50%; animat ion: ds-spin 1s linear infinite;"></div>
                ${text ? `<p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); margin: 0;">${text}</p>` : ''}
            </div>
            <style>
                @keyframes ds-spin { to { transform: rotate(360deg); } }
            </style>
        `;

        if (fullScreen) {
            return `
                <div style="position: fixed; inset: 0; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999;">
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

        const sizeMap = {
            sm: '400px',
            md: '600px',
            lg: '800px',
            xl: '1100px'
        };

        const maxWidth = sizeMap[size] || sizeMap.md;

        return `
            <div id="${id}" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 999; align-items: center; justify-content: center; padding: var(--ds-space-4);">
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-3xl); shadow: var(--ds-shadow-xl); width: 100%; max-width: ${maxWidth}; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                    ${title ? `
                        <div style="padding: var(--ds-space-5) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; justify-content: space-between;">
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${title}</h3>
                            ${closeable ? `<button onclick="document.getElementById('${id}').style.display='none'" style="background: none; border: none; color: var(--ds-text-tertiary); cursor: pointer; font-size: var(--ds-text-2xl); line-height: 1;">&times;</button>` : ''}
                        </div>
                    ` : ''}
                    <div style="padding: var(--ds-space-8); overflow-y: auto; flex: 1;">
                        ${content}
                    </div>
                    ${footer ? `
                        <div style="padding: var(--ds-space-6) var(--ds-space-8); border-top: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
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
            width = '300px',
            className = ''
        } = options;

        return `
            <div style="position: relative; width: ${width};" class="${className}">
                <div style="position: absolute; left: var(--ds-space-4); top: 50%; transform: translateY(-50%); color: var(--ds-text-tertiary); pointer-events: none;">
                    <i class="fas fa-search"></i>
                </div>
                <input 
                    type="text" 
                    id="${id}" 
                    class="ds-input"
                    style="width: 100%; padding-left: var(--ds-space-12);"
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
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--ds-space-8);">
                <div>
                    <h2 style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">${title}</h2>
                    ${subtitle ? `<p style="font-size: var(--ds-text-md); color: var(--ds-text-tertiary); margin: 0;">${subtitle}</p>` : ''}
                </div>
                ${actions ? `<div style="display: flex; gap: var(--ds-space-3);">${actions}</div>` : ''}
            </div>
        `;
    },

    /**
     * Empty State Component
     * @param {Object} options - Empty state configuration
     */
    emptyState: (options = {}) => {
        const {
            icon = '<i class="fas fa-inbox"></i>',
            title = 'No data available',
            message = 'There are no items to display.',
            action = ''
        } = options;

        return `
            <div style="display: flex; flex-direction: column; items-center; justify-content: center; padding: var(--ds-space-12) var(--ds-space-6); text-align: center;">
                <div style="font-size: var(--ds-text-5xl); color: var(--ds-text-quaternary); margin-bottom: var(--ds-space-5);">${icon}</div>
                <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">${title}</h3>
                <p style="font-size: var(--ds-text-md); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-8); max-width: 400px; margin-left: auto; margin-right: auto;">${message}</p>
                ${action ? `<div>${action}</div>` : ''}
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}
