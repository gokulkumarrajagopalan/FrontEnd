/**
 * Base Page Class - Eliminates code duplication across pages
 * Provides common functionality for all data management pages
 */

class BasePage {
    constructor(config) {
        this.config = {
            pageName: 'Base',
            apiEndpoint: '',
            entityName: 'item',
            entityNamePlural: 'items',
            tableColumns: [],
            searchFields: ['name'],
            ...config
        };

        this.data = [];
        this.filteredData = [];
        this.selectedCompanyId = null;
        this.isLoading = false;
        this.isSyncing = false;
        this.selectedR
        // Grid features
        this.sortField = null;
        this.sortOrder = 'asc'; // 'asc' or 'desc'
        this.currentPage = 1;
        this.pageSize = 25;
        this.visibleColumns = new Set(this.config.tableColumns.map(col => col.field));
        this.tableFullscreenLocked = false;
    }

    /**
     * Enter fullscreen lock for the data table
     */
    enterTableFullscreenLock(context = {}) {
        if (this.tableFullscreenLocked) return;

        const pageHeader = context.pageHeader || document.getElementById('pageHeader');
        const filtersContainer = context.filtersContainer || document.querySelector('.filters-sticky');
        const pageContainer = context.pageContainer || document.querySelector('.page-container-full-height');
        const tableHeaderToggleBtnOpened = document.getElementById('tableHeaderToggleBtnOpened');

        this.tableFullscreenLocked = true;

        pageHeader?.classList.add('header-collapsed');
        filtersContainer?.classList.add('scrolled');
        pageContainer?.classList.add('table-fullscreen-locked');
        document.body.classList.add('table-fullscreen-mode');

        // Compute dynamic fullscreen offset based on actual app header height
        try {
            const appHeader = document.querySelector('header');
            const computeOffset = () => {
                const h = appHeader ? appHeader.offsetHeight : 60;
                pageContainer?.style.setProperty('--fs-offset', `${h}px`);
            };
            computeOffset();
            // Recompute on window resize while locked
            this._fsResizeHandler = () => computeOffset();
            window.addEventListener('resize', this._fsResizeHandler);
        } catch (e) {
            // Fallback silently if header not found
            pageContainer?.style.setProperty('--fs-offset', `60px`);
        }

        if (tableHeaderToggleBtnOpened) {
            tableHeaderToggleBtnOpened.setAttribute('title', 'Exit full screen');
            tableHeaderToggleBtnOpened.style.display = 'flex';
        }

        // Also update the app-level toggle button if it exists
        if (window.app && typeof window.app.setTableHeaderToggleBtnVisibility === 'function') {
            window.app.setTableHeaderToggleBtnVisibility(true, true);
        }
    }

    /**
     * Exit fullscreen lock for the data table
     */
    exitTableFullscreenLock(context = {}) {
        if (!this.tableFullscreenLocked) return;

        const pageHeader = context.pageHeader || document.getElementById('pageHeader');
        const filtersContainer = context.filtersContainer || document.querySelector('.filters-sticky');
        const pageContainer = context.pageContainer || document.querySelector('.page-container-full-height');
        const tableHeaderToggleBtnOpened = document.getElementById('tableHeaderToggleBtnOpened');

        this.tableFullscreenLocked = false;

        pageContainer?.classList.remove('table-fullscreen-locked');
        document.body.classList.remove('table-fullscreen-mode');
        pageHeader?.classList.remove('header-collapsed');
        filtersContainer?.classList.remove('scrolled');

        // Cleanup fullscreen offset and resize handler
        pageContainer?.style.removeProperty('--fs-offset');
        if (this._fsResizeHandler) {
            window.removeEventListener('resize', this._fsResizeHandler);
            this._fsResizeHandler = null;
        }

        if (tableHeaderToggleBtnOpened) {
            tableHeaderToggleBtnOpened.setAttribute('title', 'Toggle Header Visibility');
            tableHeaderToggleBtnOpened.style.display = 'none';
        }

        // Also update the app-level toggle button if it exists
        if (window.app && typeof window.app.setTableHeaderToggleBtnVisibility === 'function') {
            window.app.setTableHeaderToggleBtnVisibility(false);
        }
    }

    /**
     * Initialize the page
     */
    async init() {
        console.log(`🚀 Initializing ${this.config.pageName} page...`);

        try {
            // Check authentication
            if (!this.checkAuth()) return;

            // Reset fullscreen state from previous page
            this.tableFullscreenLocked = false;
            document.body.classList.remove('table-fullscreen-mode');

            // Hide the top-nav toggle button initially
            if (window.app && typeof window.app.setTableHeaderToggleBtnVisibility === 'function') {
                window.app.setTableHeaderToggleBtnVisibility(false);
            }

            // Render page template
            this.render();

            // Setup company selection
            this.setupCompanySelection();

            // Load initial data
            await this.loadData();

            // Setup event listeners
            this.setupEventListeners();

            // Setup scroll-aware header collapse
            this.setupScrollCollapse();

            console.log(`✅ ${this.config.pageName} page initialized`);
        } catch (error) {
            console.error(`❌ Error initializing ${this.config.pageName}:`, error);
            this.showError(`Failed to initialize ${this.config.pageName.toLowerCase()} page`);
        }
    }

    /**
     * Check authentication
     */
    checkAuth() {
        const isAuthenticated = window.authService?.isAuthenticated();
        if (!isAuthenticated) {
            console.warn('⚠️ User not authenticated, redirecting to login...');
            window.router?.navigate('login');
            return false;
        }
        return true;
    }

    /**
     * Cleanup method called when navigating away from page
     */
    cleanup() {
        // Exit fullscreen if active
        if (this.tableFullscreenLocked) {
            this.exitTableFullscreenLock();
        }

        // Remove event listeners
        if (this._fsResizeHandler) {
            window.removeEventListener('resize', this._fsResizeHandler);
            this._fsResizeHandler = null;
        }

        // Hide button
        if (window.app && typeof window.app.setTableHeaderToggleBtnVisibility === 'function') {
            window.app.setTableHeaderToggleBtnVisibility(false);
        }

        // Remove body class
        document.body.classList.remove('table-fullscreen-mode');

        console.log(`🧹 ${this.config.pageName} page cleaned up`);
    }

    /**
     * Render page template
     */
    render() {
        const content = document.getElementById('page-content');
        if (!content) {
            console.error('Page content container not found');
            return;
        }

        content.innerHTML = this.getTemplate();
        this.injectStyles();
    }

    /**
     * Get page template - to be overridden by child classes
     */
    getTemplate() {
        return `
            <div class="page-container-full-height">
                ${this.getPageHeader()}
                ${this.getFilters()}
                ${this.getDataTable()}
                ${this.getModal()}
            </div>
        `;
    }

    /**
     * Get page header template
     */
    getPageHeader() {
        return `
            <div id="pageHeader" class="page-header page-header-collapsible">
                <div class="page-header-content">
                    <div class="page-header-text">
                        <h2>${this.config.pageName}</h2>
                        <p>Manage ${this.config.entityNamePlural}</p>
                    </div>
                    <div class="page-header-actions">
                        <button id="sync${this.config.pageName}Btn" class="btn-sync">
                            <span>🔄</span>
                            <span>Sync From Tally</span>
                        </button>
                        <button id="add${this.config.pageName}Btn" class="btn-erp">
                            + Add ${this.config.entityName}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get filters template
     */
    getFilters() {
        return `
            <div class="filters-container filters-sticky">
                <div class="material-search-wrapper">
                    <input type="text" id="searchInput" class="material-input" 
                           placeholder="🔍 Search ${this.config.entityNamePlural}">
                </div>
                <div id="additionalFilters" style="flex: 1 1 auto;"></div>
                <button class="btn-export">📥 Export</button>
            </div>
        `;
    }

    /**
     * Get data table template
     */
    getDataTable() {
        return `
            <div class="data-table-wrapper">
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr id="headerRow">
                                ${this.config.tableColumns.map(col =>
            `<th class="${col.align || 'text-left'} sortable-header" data-field="${col.field}" data-visible="true">
                                    <div class="header-content">
                                        <div class="header-label-container">
                                            <span class="header-label">${col.label}</span>
                                            <input type="text" class="header-search-input inline-search" data-field="${col.field}" placeholder="Search ${col.label}..." />
                                        </div>
                                        <div class="header-tools">
                                            <span class="header-search-trigger" title="Search ${col.label}">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                            </span>
                                            <span class="sort-icon">⇅</span>
                                        </div>
                                    </div>
                                </th>`
        ).join('')}
                            </tr>
                        </thead>
                        <tbody id="dataTableBody">
                            <tr>
                                <td colspan="${this.config.tableColumns.length}" class="no-data">
                                    Select a company to view ${this.config.entityNamePlural}...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="table-pagination-controls">
                    <div class="pagination-info">
                        <span id="recordsInfo">0 records</span>
                    </div>
                    <div class="pagination-buttons">
                        <button id="prevPageBtn" class="pagination-btn">← Previous</button>
                        <div class="page-info">
                            <span>Page <span id="currentPageNum">1</span> of <span id="totalPages">1</span></span>
                        </div>
                        <button id="nextPageBtn" class="pagination-btn">Next →</button>
                    </div>
                    <div class="page-size-selector">
                        <label for="pageSizeSelect">Rows per page:</label>
                        <select id="pageSizeSelect" class="page-size-select">
                            <option value="25" selected>25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get modal template
     */
    getModal() {
        return `
            <div id="dataModal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitle">Add ${this.config.entityName}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="dataForm" class="modal-body">
                        <div id="formFields"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
                            <button type="submit" class="btn-erp">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Inject page-specific styles
     */
    injectStyles() {
        if (document.getElementById(`${this.config.pageName.toLowerCase()}-styles`)) return;

        const style = document.createElement('style');
        style.id = `${this.config.pageName.toLowerCase()}-styles`;
        style.textContent = `
            /* Full-height page container */
            .page-container-full-height {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0;
                overflow: hidden;
                // padding: 0.5rem 0.5rem;
                box-sizing: border-box;
                gap: 0.5rem;
                position: relative;
                transition: padding 0.3s ease;
            }

            .page-container-full-height:has(.header-collapsed) {
                padding: 0.25rem;
                gap: 0.25rem;
            }
            
            /* Page header with collapse animation */
            .page-header-collapsible {
                top: 10px;
                flex: 0 0 auto;
                overflow: hidden;
                max-height: 200px;
                opacity: 1;
                transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease;
                padding-bottom: 0.5rem;
            }

            .page-header-content {
                display: flex;
                align-items: center;
                justify-content: space-between; /* dynamic spacing */
                gap: 1rem;
                flex-wrap: wrap;
                width: 100%;
            }

            .page-header-text {
                flex: 1 1 auto; /* grow to take available space */
                min-width: 200px;
               padding-right: clamp(0.5rem, 3vw, 4rem);
                text-align: left;
            }

            .page-header-collapsible h2 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
                color: #1f2937;
            }

            .page-header-collapsible p {
                margin: 0.25rem 0 0 0;
                font-size: 0.875rem;
                color: #6b7280;
            }

            .page-header-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
                align-items: center;
                /* stays on the right via space-between; min gap managed by text padding */
            }
            
            .page-header-collapsible.header-collapsed {
                max-height: 0;
                opacity: 0;
                margin: 0;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                border: none;
                pointer-events: none;
            }

            .header-toggle-btn {
                position: absolute;
                left: 50%;
                top: 1.125rem;
                transform: translateX(-50%);
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 100;
                transition: color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
                color: #64748b;
                opacity: 1;
                pointer-events: auto;
                visibility: visible;
                box-sizing: border-box;
                outline: none;
            }

            .header-toggle-btn:hover {
                background: #f8fafc;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
                color: #4b5563;
            }

            /* Top nav header toggle button overrides */
            #tableHeaderToggleBtnOpened.header-toggle-btn {
                position: static;
                left: auto;
                top: auto;
                transform: none;
                box-shadow: none;
                opacity: 1;
                pointer-events: auto;
                visibility: visible;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                align-self: center;
                justify-self: center;
                margin: 0 auto;
                background: white;
            }
            
            /* Sticky filters */
            .filters-sticky {
                position: sticky;
                top: 0;
                z-index: 20;
                transition: all 0.3s ease;
            }

            .filters-sticky.scrolled {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(8px);
            }
            
            .filters-container {
                display: flex;
                gap: 0.75rem;
                align-items: center;
                background: white;
                padding: 0.375rem 0.75rem;
                border-radius: 10px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
                border: 1px solid #e5e7eb;
                flex: 0 0 auto;
                transition: all 0.3s ease;
            }

            .header-collapsed ~ .filters-container {
                padding: 0.25rem 0.5rem;
                border-radius: 6px;
                gap: 0.5rem;
            }
            
            .material-search-wrapper {
                flex: 0 0 auto;
                width: 240px;
                transition: width 0.3s ease;
            }

            .header-collapsed ~ .filters-container .material-search-wrapper {
                width: 200px;
            }
            
            .material-input {
                width: 100%;
                padding: 0.4rem 0.75rem;
                border: 1px solid #d1d5db;
                background: white;
                font-size: 0.813rem;
                color: #374151;
                outline: none;
                box-sizing: border-box;
                height: 32px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .header-collapsed ~ .filters-container .material-input {
                height: 28px;
                font-size: 0.75rem;
            }
            
            .material-input::placeholder {
                color: #9ca3af;
            }
            
            .material-input:focus {
                border-color: var(--primary-500);
                box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
            }
            
            .material-label {
                position: absolute;
                top: -1.25rem;
                left: 0;
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .material-underline {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: #d1d5db;
                transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .material-focus-line {
                position: absolute;
                bottom: 0;
                left: 50%;
                right: auto;
                width: 0;
                height: 2px;
                background: var(--primary-500);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateX(-50%);
            }
            
            .material-input:focus ~ .material-underline {
                background: transparent;
            }
            
            .material-input:focus ~ .material-focus-line {
                width: 100%;
                left: 50%;
                right: auto;
                transform: translateX(-50%);
            }
            
            #additionalFilters {
                display: flex;
                gap: 0.75rem;
                align-items: center;
            }
            
            .form-input {
                height: 32px;
                padding: 0.4rem 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.75rem;
                background: white;
                color: #374151;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .header-collapsed ~ .filters-container .form-input {
                height: 28px;
                padding: 0.25rem 0.5rem;
            }
            
            .form-input:focus {
                outline: none;
                border-color: var(--primary-500);
                box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
            }
            
            .btn-export {
                height: 32px;
                padding: 0.4rem 0.75rem;
                font-size: 0.8rem;
                font-weight: 600;
                white-space: nowrap;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.375rem;
            }

            .header-collapsed ~ .filters-container .btn-export {
                height: 28px;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
            }
            
            .btn-export:hover {
                border-color: var(--primary-500);
                background: #f9fafb;
                box-shadow: 0 1px 4px rgba(94, 134, 186, 0.1);
            }
            
            .btn-export:active {
                transform: scale(0.98);
            }
            
            .flex-grow {
                flex-grow: 1;
                flex: 1 1 0%;
            }
            
            .data-table-wrapper {
                display: flex;
                flex-direction: column;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                border: 1px solid #e5e7eb;
                overflow: hidden;
                flex: 1 1 auto;
                min-height: calc(100vh - 220px);
            }

            /* Fullscreen lock state for table */
            .page-container-full-height.table-fullscreen-locked {
                padding: 0 0.5rem;
                background: white;
                gap: 0;
            }

            .page-container-full-height.table-fullscreen-locked .data-table-wrapper {
                position: relative;
                border-radius: 0;
                box-shadow: none;
                border: none;
                height: calc(100vh - var(--fs-offset, 60px));
                max-height: calc(100vh - var(--fs-offset, 60px));
                margin: 0;
            }

            .page-container-full-height.table-fullscreen-locked .data-table-container {
                height: 100%;
                max-height: 100%;
            }

            .page-container-full-height.table-fullscreen-locked .table-pagination-controls {
                border-radius: 0;
                position: sticky;
                bottom: 0;
                z-index: 5;
            }

            .page-container-full-height.table-fullscreen-locked #pageHeader,
            .page-container-full-height.table-fullscreen-locked .filters-container {
                opacity: 0;
                pointer-events: none;
                max-height: 0;
                margin: 0;
                padding: 0;
            }

            .page-container-full-height.table-fullscreen-locked .header-toggle-btn {
                display: flex !important;
                visibility: visible;
                position: absolute;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                transform-origin: center;
                z-index: 999;
                opacity: 1;
                pointer-events: auto;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
                transition: all 0.2s ease-out;
            }

            body.table-fullscreen-mode {
                overflow: hidden;
                background: white;
            }
            
            .data-table-header-bar {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                background: #f8fafc;
                border-bottom: 1px solid #e5e7eb;
                flex-wrap: wrap;
            }
            
            .column-toggle-btn {
                padding: 0.5rem 0.875rem;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.375rem;
            }
            
            .column-toggle-btn:hover {
                border-color: var(--primary-500);
                background: #f9fafb;
                color: var(--primary-600);
            }
            
            .column-visibility-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                min-width: 200px;
                padding: 0.5rem 0;
                max-height: 400px;
                overflow-y: auto;
                display: none;
            }
            
            .column-visibility-menu.show {
                display: block;
            }
            
            .column-toggle-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                color: #374151;
                cursor: pointer;
                transition: background 0.2s ease;
                user-select: none;
            }
            
            .column-toggle-item:hover {
                background: #f3f4f6;
            }
            
            .column-toggle-item input[type="checkbox"] {
                cursor: pointer;
                width: 16px;
                height: 16px;
            }
            
            .export-btn {
                padding: 0.5rem 0.875rem;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.375rem;
            }
            
            .export-btn:hover {
                border-color: var(--primary-500);
                background: #f9fafb;
                color: var(--primary-600);
            }
            
            .data-table-container {
                flex: 1 1 auto;
                overflow-y: auto;
                overflow-x: hidden;
                min-height: 0;
                position: relative;
                max-height: calc(100vh - 170px);
            }

            /* Custom scrollbar for better UI integration */
            .data-table-container::-webkit-scrollbar {
                width: 8px;
            }
            
            .data-table-container::-webkit-scrollbar-track {
                background: #f9fafb;
            }
            
            .data-table-container::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }

            .data-table-container::-webkit-scrollbar-thumb:hover {
                background-color: #94a3b8;
            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
            }
            
            .data-table thead {
                position: sticky;
                top: 0;
                z-index: 15;
            }
            
            .data-table thead tr {
                background: #f8fafc;
            }
            
            .data-table th {
                background: #f8fafc;
                padding: 0.5rem 0.75rem;
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #475569;
                border-bottom: 2px solid #e2e8f0;
                white-space: nowrap;
                text-align: left;
            }
            
            .data-table td {
                padding: 0.5rem 0.75rem;
                border-bottom: 1px solid #f1f5f9;
                color: #334155;
                word-break: break-word;
                font-size: 0.813rem;
            }
            
            .data-table tbody tr {
                transition: background 0.15s ease;
            }
            
            .data-table tbody tr:nth-child(odd) {
                background: #fafbfc;
            }
            
            .data-table tbody tr:nth-child(even) {
                background: white;
            }
            
            .data-table tbody tr:hover {
                background: #f8fafc;
            }
            
            .data-table tbody tr.selected {
                background: #dbeafe;
                border-left: 3px solid var(--primary-500);
            }
            
            .cell-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .cell-content:hover {
                cursor: help;
            }
            
            .cell-icon {
                flex-shrink: 0;
                font-size: 0.875rem;
                color: #6b7280;
            }
            
            .cell-status {
                display: inline-flex;
                align-items: center;
                gap: 0.375rem;
                padding: 0.25rem 0.75rem;
                background: #f3f4f6;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #374151;
            }
            
            .cell-status.success {
                background: #dcfce7;
                color: #15803d;
            }
            
            .cell-status.warning {
                background: #fef3c7;
                color: #b45309;
            }
            
            .cell-status.error {
                background: #fee2e2;
                color: #991b1b;
            }
            
            .no-data {
                width: 100%;
                text-align: center;
                color: #9ca3af;
                font-style: italic;
                padding: 3rem 1rem !important;
                box-sizing: border-box;
            }
            
            .btn-sync,
            .btn-erp {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 0.625rem 1.5rem;
                background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
            }

            .btn-sync:hover:not(:disabled),
            .btn-erp:hover:not(:disabled) {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                transform: translateY(-1px);
                box-shadow: 0 6px 15px rgba(16, 185, 129, 0.35);
            }
            
            .btn-sync:active:not(:disabled),
            .btn-erp:active:not(:disabled) {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
            }
            
            .btn-sync:disabled,
            .btn-erp:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .sortable-header {
                cursor: default;
                user-select: none;
                transition: background 0.2s ease;
            }
            
            .sortable-header:hover {
                background: #f3f4f6;
            }
            
            .header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.5rem;
            }
            
            .sort-icon {
                cursor: pointer;
                font-size: 0.85rem;
                color: #9ca3af;
                font-weight: normal;
                transition: color 0.2s ease, transform 0.2s ease;
                padding: 4px;
                border-radius: 4px;
            }

            .sort-icon:hover {
                background: rgba(0, 0, 0, 0.05);
                color: var(--primary-600);
            }
            
            .table-pagination-controls {
                background: white;
                padding: 0.4rem 1rem;
                border-top: 1px solid #e5e7eb;
                border-radius: 0 0 12px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 0.5rem;
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
            }
            
            .pagination-info {
                flex: 0 0 auto;
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 500;
            }
            
            .pagination-buttons {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 0 0 auto;
            }
            
            .pagination-btn {
                padding: 0.25rem 0.625rem;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 500;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .pagination-btn:hover:not(:disabled) {
                border-color: var(--primary-500);
                background: #f9fafb;
                color: var(--primary-600);
                box-shadow: 0 2px 4px rgba(94, 134, 186, 0.1);
            }
            
            .pagination-btn:active:not(:disabled) {
                transform: scale(0.98);
            }
            
            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: #f3f4f6;
            }
            
            .page-info {
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .page-size-selector {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 0 0 auto;
            }
            
            .page-size-selector label {
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .page-size-select {
                padding: 0.15rem 0.375rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                background: white;
                font-size: 0.75rem;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .page-size-select:hover {
                border-color: var(--primary-500);
                box-shadow: 0 1px 3px rgba(94, 134, 186, 0.1);
            }
            
            .page-size-select:focus {
                outline: none;
                border-color: var(--primary-500);
                box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
            }
            
            /* Row selection and actions */
            .row-select-checkbox {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .action-buttons {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                justify-content: center;
            }
            
            .btn-action {
                padding: 0.4rem 0.7rem;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.3rem;
            }
            
            .btn-action:hover {
                border-color: var(--primary-500);
                background: #f9fafb;
                color: var(--primary-600);
            }
            
            .btn-action.delete:hover {
                border-color: #ef4444;
                color: #ef4444;
            }
            
            .btn-action.edit:hover {
                border-color: #3b82f6;
                color: #3b82f6;
            }
            
            /* Keyboard shortcuts hint */
            .keyboard-hint {
                font-size: 0.75rem;
                color: #9ca3af;
                background: #f3f4f6;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                margin-top: 1rem;
            }
            
            .keyboard-hint strong {
                font-weight: 600;
                color: #6b7280;
            }
            
            /* Tooltip styling */
            .tooltip {
                position: relative;
                display: inline-block;
            }
            
            .tooltip .tooltiptext {
                visibility: hidden;
                width: 200px;
                background-color: #1f2937;
                color: #fff;
                text-align: center;
                border-radius: 6px;
                padding: 0.5rem 0.75rem;
                position: absolute;
                z-index: 1000;
                bottom: 125%;
                left: 50%;
                margin-left: -100px;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 0.75rem;
                white-space: normal;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .tooltip .tooltiptext::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #1f2937 transparent transparent transparent;
            }
            
            .tooltip:hover .tooltiptext {
                visibility: visible;
                opacity: 1;
            }
            
            /* Loading animation for table */
            .data-table.loading tbody tr td {
                opacity: 0.6;
                pointer-events: none;
            }
            
            /* Search highlight in results */
            .highlight {
                background: #fef08a;
                padding: 0.1rem 0.2rem;
                border-radius: 2px;
                font-weight: 600;
            }
            
            /* Table header actions */
            .table-header-actions {
                display: flex;
                gap: 0.5rem;
                margin-left: auto;
            }
            
            @media (max-width: 768px) {
                .table-pagination-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .pagination-info,
                .pagination-buttons,
                .page-size-selector {
                    width: 100%;
                    justify-content: center;
                }
                
                .pagination-buttons {
                    justify-content: space-around;
                }
                
                .data-table-header-bar {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .column-toggle-btn,
                .export-btn {
                    width: 100%;
                }
                
                .data-table th,
                .data-table td {
                    padding: 0.75rem 0.75rem;
                    font-size: 0.85rem;
                }
                
                .data-table-container {
                    max-height: 400px;
                }
                
                .action-buttons {
                    flex-direction: column;
                }
            }
            
            @media (max-width: 480px) {
                .data-table {
                    font-size: 0.8rem;
                }
                
                .data-table th,
                .data-table td {
                    padding: 0.5rem;
                }
                
                .header-content {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .sort-icon {
                    display: inline;
                    margin-left: 0.25rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup company selection handling
     */
    setupCompanySelection() {
        // Use global company selector
        const savedCompanyId = sessionStorage.getItem('selectedCompanyId');
        this.selectedCompanyId = window.selectedCompanyId || (savedCompanyId ? parseInt(savedCompanyId) : null);

        // Listen for global company changes
        window.addEventListener('companyChanged', async (e) => {
            console.log(`📋 ${this.config.pageName} - Company changed:`, e.detail.companyId);
            this.selectedCompanyId = e.detail.companyId;
            await this.loadData();
        });
    }

    /**
     * Load data from API
     */
    async loadData() {
        console.log(`📊 Loading ${this.config.entityNamePlural} for company:`, this.selectedCompanyId);

        const tbody = document.getElementById('dataTableBody');
        if (!tbody) return;

        if (!this.selectedCompanyId) {
            tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length}" class="no-data">
                📋 Please select a company from the dropdown above to view ${this.config.entityNamePlural}
            </td></tr>`;
            return;
        }

        try {
            this.showLoading();

            const url = window.apiConfig.getUrl(`${this.config.apiEndpoint}/company/${this.selectedCompanyId}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: window.authService.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.data = result.data || [];
                this.filteredData = [...this.data];
                console.log(`✅ Loaded ${this.data.length} ${this.config.entityNamePlural}`);
                this.renderTable();
                this.setupTableListeners();
            } else {
                throw new Error(result.message || `Failed to load ${this.config.entityNamePlural}`);
            }
        } catch (error) {
            console.error(`❌ Error loading ${this.config.entityNamePlural}:`, error);
            tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length}" class="no-data text-red-500">
                Error loading ${this.config.entityNamePlural}: ${error.message}
            </td></tr>`;
            this.showError(`Failed to load ${this.config.entityNamePlural}: ${error.message}`);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const tbody = document.getElementById('dataTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length}" class="no-data">
                <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span>Loading ${this.config.entityNamePlural}...</span>
                </div>
            </td></tr>`;
        }
    }

    /**
     * Render table with data
     */
    renderTable() {
        const tbody = document.getElementById('dataTableBody');
        if (!tbody) return;

        if (!Array.isArray(this.filteredData) || this.filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length}" class="no-data">
                No ${this.config.entityNamePlural} found for this company
            </td></tr>`;
            this.updatePaginationControls();
            this.updateColumnVisibility();
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage > totalPages) {
            this.currentPage = Math.max(1, totalPages);
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map(item => this.renderTableRow(item)).join('');

        // Update visible records info
        const visibleRecordsInfo = document.getElementById('visibleRecordsInfo');
        if (visibleRecordsInfo) {
            visibleRecordsInfo.textContent = pageData.length;
        }

        this.attachRowHandlers();
        this.updatePaginationControls();
        this.updateColumnVisibility();
    }

    /**
     * Render single table row - to be overridden by child classes
     */
    renderTableRow(item) {
        return `
            <tr class="hover:bg-gray-50">
                ${this.config.tableColumns.map(col => `
                    <td class="${col.align || 'text-left'}">
                        ${this.formatCellValue(item, col)}
                    </td>
                `).join('')}
            </tr>
        `;
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @private
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format cell value based on column configuration
     */
    formatCellValue(item, column) {
        const value = item[column.field];

        if (column.type === 'currency') {
            return `₹${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }

        if (column.type === 'badge') {
            // Escape user data in badge to prevent XSS
            const escapedValue = this.escapeHtml(value || 'N/A');
            return `<span class="badge ${column.badgeClass || 'badge-primary'}">${escapedValue}</span>`;
        }

        if (column.type === 'boolean') {
            return value ?
                '<span class="text-green-600 font-medium">✓ Yes</span>' :
                '<span class="text-gray-400">✗ No</span>';
        }

        // Escape text values to prevent XSS
        return this.escapeHtml(String(value || 'N/A'));
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterData());
        }

        // Sync button
        const syncBtn = document.getElementById(`sync${this.config.pageName}Btn`);
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncFromTally());
        }

        // Add button
        const addBtn = document.getElementById(`add${this.config.pageName}Btn`);
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Export button
        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }

        // Modal handlers
        this.setupModalHandlers();
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers() {
        const modal = document.getElementById('dataModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.modal-close');
        const form = document.getElementById('dataForm');

        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal());
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal());

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveData();
            });
        }

        // Close on backdrop click
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal();
        });
    }

    /**
     * Filter data based on search input
     */
    filterData() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const headerSearch = this.headerSearch || {};

        this.filteredData = this.data.filter(item => {
            // Global search (across configured fields)
            const globalMatch = !searchTerm || this.config.searchFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchTerm);
            });

            // Per-column header searches
            const columnMatch = Object.entries(headerSearch).every(([field, term]) => {
                if (!term) return true; // no filter for this field
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });

            return globalMatch && columnMatch;
        });

        // Reset to first page when filtering
        this.currentPage = 1;
        this.renderTable();
        this.setupTableListeners();
    }

    /**
     * Attach row action handlers
     */
    attachRowHandlers() {
        // Delete handlers
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                const row = e.target.closest('tr');

                if (confirm(`Are you sure you want to delete this ${this.config.entityName}?`)) {
                    // Add visual feedback
                    row.style.opacity = '0.5';
                    await this.deleteItem(id);
                }
            });
        });

        // Edit handlers
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                const row = e.target.closest('tr');

                // Highlight row
                row.classList.add('selected');
                this.showEditModal(id);
            });
        });

        // Row double-click to edit (if double-click handler exists)
        document.querySelectorAll('#dataTableBody tr').forEach(row => {
            row.addEventListener('dblclick', (e) => {
                // Don't trigger on button clicks
                if (e.target.tagName !== 'BUTTON') {
                    const editBtn = row.querySelector('.edit-btn');
                    if (editBtn) {
                        editBtn.click();
                    }
                }
            });
            row.style.cursor = 'pointer';
        });

        // Add row hover effect
        document.querySelectorAll('#dataTableBody tr').forEach(row => {
            row.addEventListener('mouseenter', () => {
                row.style.boxShadow = '0 2px 8px rgba(94, 134, 186, 0.1) inset';
            });
            row.addEventListener('mouseleave', () => {
                row.style.boxShadow = 'none';
            });
        });

        // Add cell copy-to-clipboard on double-click
        document.querySelectorAll('#dataTableBody td').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const text = cell.textContent.trim();
                if (text && !cell.querySelector('button')) {
                    navigator.clipboard.writeText(text).then(() => {
                        // Visual feedback
                        const originalBg = cell.style.backgroundColor;
                        cell.style.backgroundColor = '#dcfce7';
                        setTimeout(() => {
                            cell.style.backgroundColor = originalBg;
                        }, 200);
                    });
                }
            });
        });
    }

    /**
     * Show add modal
     */
    showAddModal() {
        if (!this.selectedCompanyId) {
            window.Popup.alert({
                title: 'Company Not Selected',
                message: 'Please select a company first before adding a new record.',
                icon: '⚠️',
                okText: 'OK',
                variant: 'primary'
            });
            return;
        }

        // Feature in development popup
        window.Popup.alert({
            title: 'Feature In Development',
            message: 'This feature is currently in development. Please check back in a future update.',
            icon: '🚧',
            okText: 'Got it',
            variant: 'primary'
        });
    }

    /**
     * Show edit modal
     */
    showEditModal(id) {
        // To be implemented by child classes
        if (window.Popup) {
            window.Popup.alert({
                title: 'Feature In Development',
                message: 'This feature is currently in development. Please check back in a future update.',
                icon: '🚧',
                okText: 'Got it',
                variant: 'primary'
            });
        } else {
            this.showInfo('This feature is currently in development. Please check back in a future update.');
        }
    }

    /**
     * Show modal
     */
    showModal() {
        const modal = document.getElementById('dataModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('dataModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    /**
     * Sort data by field
     */
    sortBy(field) {
        // Toggle sort order if same field
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }

        // Sort the filtered data
        this.filteredData.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle null/undefined
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Case-insensitive string comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            // Compare values
            if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Reset to first page and render
        this.currentPage = 1;
        this.renderTable();
        this.updateSortIcons();
    }

    /**
     * Update sort icons to show current sort direction
     */
    updateSortIcons() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const field = header.getAttribute('data-field');
            const icon = header.querySelector('.sort-icon');

            if (!icon) return;

            if (field === this.sortField) {
                icon.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
                icon.style.color = '#2563eb';
                icon.style.fontWeight = 'bold';
                // Add tooltip showing sort direction
                icon.setAttribute('title', this.sortOrder === 'asc' ? 'Sorted: Ascending (Click icon to reverse)' : 'Sorted: Descending (Click icon to reverse)');
                header.removeAttribute('title');
            } else {
                icon.textContent = '⇅';
                icon.style.color = '#9ca3af';
                icon.style.fontWeight = 'normal';
                icon.setAttribute('title', 'Click icon to sort');
                header.removeAttribute('title');
            }
        });
    }

    /**
     * Update pagination controls
     */
    updatePaginationControls() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);

        // Update records info
        const recordsInfo = document.getElementById('recordsInfo');
        if (recordsInfo) {
            recordsInfo.textContent = `${this.filteredData.length} records`;
        }

        // Update page numbers
        document.getElementById('currentPageNum').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;

        // Update button states
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.style.opacity = this.currentPage <= 1 ? '0.5' : '1';
            prevBtn.style.cursor = this.currentPage <= 1 ? 'not-allowed' : 'pointer';
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.style.opacity = this.currentPage >= totalPages ? '0.5' : '1';
            nextBtn.style.cursor = this.currentPage >= totalPages ? 'not-allowed' : 'pointer';
        }
    }

    /**
     * Go to specific page
     */
    goToPage(pageNum) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (pageNum >= 1 && pageNum <= totalPages) {
            this.currentPage = pageNum;
            this.renderTable();
        }
    }

    /**
     * Change page size
     */
    changePageSize(newSize) {
        this.pageSize = parseInt(newSize, 10);
        this.currentPage = 1;
        this.renderTable();
    }

    /**
     * Setup table event listeners
     */
    setupTableListeners() {
        // Sort header listeners
        document.querySelectorAll('.sortable-header').forEach(header => {
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const field = header.getAttribute('data-field');
                    this.sortBy(field);
                });
                sortIcon.style.cursor = 'pointer';
            }
            header.style.cursor = 'default';
            header.style.userSelect = 'none';
        });

        // Header search inputs
        this.headerSearch = this.headerSearch || {};
        document.querySelectorAll('.header-search-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                const val = (e.target.value || '').toLowerCase();
                this.headerSearch[field] = val;
                this.filterData();
            });
            // Allow input clicks but don't propagate
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Pagination button listeners
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageSizeSelect = document.getElementById('pageSizeSelect');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.goToPage(this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.goToPage(this.currentPage + 1);
                }
            });
        }

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.changePageSize(e.target.value);
            });
        }

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        this.updatePaginationControls();
        this.updateSortIcons();
    }

    /**
     * Setup column visibility toggle
     */
    setupColumnVisibilityToggle() {
        const columnToggleBtn = document.getElementById('columnToggleBtn');
        const columnVisibilityMenu = document.getElementById('columnVisibilityMenu');

        if (!columnToggleBtn || !columnVisibilityMenu) return;

        // Toggle menu
        columnToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            columnVisibilityMenu.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            columnVisibilityMenu.classList.remove('show');
        });

        // Column toggle listeners
        document.querySelectorAll('.column-toggle-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                if (e.target.checked) {
                    this.visibleColumns.add(field);
                } else {
                    this.visibleColumns.delete(field);
                }
                this.updateColumnVisibility();
            });
        });
    }

    /**
     * Update column visibility in table
     */
    updateColumnVisibility() {
        // Hide/show header cells
        document.querySelectorAll('.sortable-header').forEach(header => {
            const field = header.getAttribute('data-field');
            const isVisible = this.visibleColumns.has(field);
            header.style.display = isVisible ? '' : 'none';
            header.setAttribute('data-visible', isVisible);
        });

        // Hide/show body cells
        document.querySelectorAll('#dataTableBody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (index < this.config.tableColumns.length) {
                    const field = this.config.tableColumns[index].field;
                    const isVisible = this.visibleColumns.has(field);
                    cell.style.display = isVisible ? '' : 'none';
                }
            });
        });
    }

    /**
     * Export table data to Excel (XLSX)
     */
    async exportToExcel() {
        try {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                throw new Error('XLSX library not loaded. Please refresh the page.');
            }

            const XLSX = window.XLSX;

            // Get visible columns
            const visibleCols = this.config.tableColumns.filter(col => this.visibleColumns.has(col.field));

            // Prepare data for export
            const exportData = this.filteredData.map(item => {
                const row = {};
                visibleCols.forEach(col => {
                    row[col.label] = item[col.field] || '';
                });
                return row;
            });

            // Create worksheet from data
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, this.config.entityNamePlural);

            // Generate filename with date format: entityname-YYYYMMDD
            const now = new Date();
            const dateStr = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0');
            const filename = `${this.config.entityNamePlural}-${dateStr}.xlsx`;

            // Write file
            XLSX.writeFile(workbook, filename);

            this.showSuccess(`✅ Exported ${this.filteredData.length} ${this.config.entityNamePlural} to Excel`);
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export data: ' + error.message);
        }
    }

    /**
     * Setup scroll-aware header collapse
     */
    setupScrollCollapse() {
        const pageHeader = document.getElementById('pageHeader');
        const tableHeaderToggleBtnOpened = document.getElementById('tableHeaderToggleBtnOpened');
        const filtersContainer = document.querySelector('.filters-sticky');
        const tableContainer = document.querySelector('.data-table-container');
        const pageContainer = document.querySelector('.page-container-full-height');

        if (!pageHeader || !tableHeaderToggleBtnOpened) {
            console.warn('⚠️ Scroll collapse elements not found');
            return;
        }

        // Toggle on button click
        tableHeaderToggleBtnOpened.addEventListener('click', () => {
            if (this.tableFullscreenLocked) {
                this.exitTableFullscreenLock({ pageHeader, filtersContainer, pageContainer });
                return;
            }

            const isCollapsed = pageHeader.classList.toggle('header-collapsed');
            if (filtersContainer) {
                if (isCollapsed) {
                    filtersContainer.classList.add('scrolled');
                } else {
                    filtersContainer.classList.remove('scrolled');
                }
            }

            // Update app-level toggle button icon
            if (window.app && typeof window.app.setTableHeaderToggleBtnVisibility === 'function') {
                window.app.setTableHeaderToggleBtnVisibility(true, isCollapsed);
            }
        });

        // Auto-collapse on scroll down, restore on scroll up
        if (tableContainer) {
            let lastScrollTop = 0;
            let scrollThreshold = 10; // Minimum scroll to trigger fullscreen lock

            tableContainer.addEventListener('scroll', () => {
                const scrollTop = tableContainer.scrollTop;
                const isScrollingDown = scrollTop > lastScrollTop;

                if (isScrollingDown && scrollTop > scrollThreshold && !this.tableFullscreenLocked) {
                    this.enterTableFullscreenLock({ pageHeader, filtersContainer, pageContainer });
                }

                lastScrollTop = Math.max(0, scrollTop);
            }, { passive: true });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Only setup once
        if (this._keyboardShortcutsSetup) return;
        this._keyboardShortcutsSetup = true;

        document.addEventListener('keydown', (e) => {
            // Skip if in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Ctrl+K = Focus search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }

            // Ctrl+Arrow Up = Previous page
            if (e.ctrlKey && e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('prevPageBtn')?.click();
            }

            // Ctrl+Arrow Down = Next page
            if (e.ctrlKey && e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('nextPageBtn')?.click();
            }
        });
    }

    /**
     * Sync from Tally - to be implemented by child classes
     */
    async syncFromTally() {
        if (this.isSyncing) {
            this.showInfo('🔄 Sync is already in progress. Please wait...');
            return;
        }
        this.showInfo('Sync functionality to be implemented by child class');
    }

    /**
     * Notification helpers
     */
    showError(message) {
        console.error(message);
        if (window.notificationService) {
            window.notificationService.error(message);
        } else {
            alert('❌ ' + message);
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        if (window.notificationService) {
            window.notificationService.success(message);
        } else {
            const msg = document.createElement('div');
            msg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            msg.textContent = message;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
    }

    showInfo(message) {
        console.log('ℹ️', message);
        if (window.notificationService) {
            window.notificationService.info(message);
        } else {
            const msg = document.createElement('div');
            msg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            msg.textContent = message;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BasePage = BasePage;
}
