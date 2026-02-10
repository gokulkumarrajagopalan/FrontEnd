/**
 * =====================================================
 * COMMAND PALETTE - Quick Navigation & Actions (Ctrl+K)
 * =====================================================
 * Professional command palette like VS Code/Linear
 */

(function () {
    let isOpen = false;
    let selectedIndex = 0;
    let filteredCommands = [];

    const COMMANDS = [
        // Navigation
        { id: 'nav-dashboard', icon: '🏠', title: 'Go to Dashboard', action: () => navigateTo('/dashboard') },
        { id: 'nav-companies', icon: '🏢', title: 'Go to Companies', action: () => navigateTo('/import-company') },
        { id: 'nav-sync', icon: '🔄', title: 'Go to Sync', action: () => navigateTo('/company-sync') },
        { id: 'nav-settings', icon: '⚙️', title: 'Go to Settings', action: () => navigateTo('/settings') },
        { id: 'nav-profile', icon: '👤', title: 'Go to Profile', action: () => navigateTo('/profile') },
        
        // Actions
        { id: 'action-sync-all', icon: '🔄', title: 'Sync All Companies', action: () => syncAll(), shortcut: 'Ctrl+Shift+S' },
        { id: 'action-import', icon: '📥', title: 'Import New Company', action: () => navigateTo('/import-company') },
        { id: 'action-refresh', icon: '🔄', title: 'Refresh Page', action: () => location.reload(), shortcut: 'Ctrl+R' },
        { id: 'action-save', icon: '💾', title: 'Save Current Page', action: () => saveCurrent(), shortcut: 'Ctrl+S' },
        
        // Settings
        { id: 'settings-tally-port', icon: '🔌', title: 'Change Tally Port', action: () => openSetting('tally-port') },
        { id: 'settings-theme', icon: '🎨', title: 'Change Theme', action: () => openSetting('theme') },
        { id: 'settings-sync-interval', icon: '⏱️', title: 'Change Sync Interval', action: () => openSetting('sync-interval') },
        
        // Help
        { id: 'help-docs', icon: '📖', title: 'Open Documentation', action: () => openDocs() },
        { id: 'help-shortcuts', icon: '⌨️', title: 'Keyboard Shortcuts', action: () => showShortcuts() },
        { id: 'help-about', icon: 'ℹ️', title: 'About Talliffy', action: () => navigateTo('/settings#about') },
        
        // Developer
        { id: 'dev-console', icon: '💻', title: 'Open Developer Console', action: () => window.electron?.openDevTools() },
        { id: 'dev-logs', icon: '📋', title: 'View Logs', action: () => viewLogs() },
    ];

    function navigateTo(path) {
        if (window.Router) {
            window.Router.navigate(path);
        }
        close();
    }

    function syncAll() {
        if (window.NotificationService) {
            window.NotificationService.show('Starting sync for all companies...', 'info');
        }
        // Trigger sync logic here
        close();
    }

    function saveCurrent() {
        if (window.NotificationService) {
            window.NotificationService.show('Saved!', 'success');
        }
        close();
    }

    function openSetting(setting) {
        navigateTo('/settings');
        // Auto-open specific setting
        close();
    }

    function openDocs() {
        alert('📖 Documentation will open here');
        close();
    }

    function showShortcuts() {
        navigateTo('/settings#help');
        close();
    }

    function viewLogs() {
        alert('📋 Log viewer will open here');
        close();
    }

    function render() {
        const existingPalette = document.getElementById('command-palette');
        if (existingPalette) {
            existingPalette.remove();
        }

        const palette = document.createElement('div');
        palette.id = 'command-palette';
        palette.className = 'command-palette';
        palette.innerHTML = `
            <style>
                .command-palette {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.6);
                    z-index: 1000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 15vh;
                    animation: fadeIn 150ms ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .command-palette-content {
                    background-color: var(--ds-bg-surface, #fff);
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                    width: 90%;
                    max-width: 640px;
                    max-height: 400px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .command-search {
                    padding: 16px;
                    border-bottom: 1px solid var(--ds-border-default, #e5e7eb);
                }

                .command-search-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: none;
                    font-size: 16px;
                    background: transparent;
                    outline: none;
                    color: var(--ds-text-primary, #111827);
                    font-family: var(--ds-font-family, 'Inter', sans-serif);
                }

                .command-search-input::placeholder {
                    color: var(--ds-text-tertiary, #6b7280);
                }

                .command-results {
                    overflow-y: auto;
                    max-height: 320px;
                }

                .command-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: background-color 100ms ease;
                    color: var(--ds-text-primary, #111827);
                }

                .command-item:hover,
                .command-item.selected {
                    background-color: var(--ds-bg-hover, #f3f4f6);
                }

                .command-item-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .command-item-content {
                    flex: 1;
                    min-width: 0;
                }

                .command-item-title {
                    font-size: 14px;
                    font-weight: 500;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .command-item-shortcut {
                    font-size: 11px;
                    color: var(--ds-text-tertiary, #6b7280);
                    padding: 2px 6px;
                    background-color: var(--ds-gray-100, #f3f4f6);
                    border-radius: 4px;
                    border: 1px solid var(--ds-border-default, #e5e7eb);
                    flex-shrink: 0;
                    font-family: var(--ds-font-mono, monospace);
                }

                .command-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: var(--ds-text-tertiary, #6b7280);
                }

                .command-footer {
                    padding: 8px 16px;
                    border-top: 1px solid var(--ds-border-default, #e5e7eb);
                    font-size: 11px;
                    color: var(--ds-text-tertiary, #6b7280);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .command-footer-hint {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .command-footer-key {
                    padding: 2px 4px;
                    background-color: var(--ds-gray-100, #f3f4f6);
                    border-radius: 3px;
                    border: 1px solid var(--ds-border-default, #e5e7eb);
                    font-family: var(--ds-font-mono, monospace);
                }
            </style>

            <div class="command-palette-content">
                <div class="command-search">
                    <input 
                        type="text" 
                        class="command-search-input" 
                        placeholder="Type a command or search..."
                        id="command-search-input"
                        autocomplete="off"
                        autocorrect="off"
                        spellcheck="false"
                    >
                </div>
                <div class="command-results" id="command-results"></div>
                <div class="command-footer">
                    <div class="command-footer-hint">
                        <span class="command-footer-key">↑↓</span>
                        <span>Navigate</span>
                    </div>
                    <div class="command-footer-hint">
                        <span class="command-footer-key">↵</span>
                        <span>Select</span>
                    </div>
                    <div class="command-footer-hint">
                        <span class="command-footer-key">Esc</span>
                        <span>Close</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(palette);

        // Close on backdrop click
        palette.addEventListener('click', (e) => {
            if (e.target === palette) {
                close();
            }
        });

        // Focus search input
        const searchInput = document.getElementById('command-search-input');
        searchInput.focus();

        // Search input handler
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filteredCommands = COMMANDS.filter(cmd =>
                cmd.title.toLowerCase().includes(query)
            );
            selectedIndex = 0;
            renderResults();
        });

        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
                renderResults();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                renderResults();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    executeCommand(filteredCommands[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                close();
            }
        });

        // Initial render
        filteredCommands = COMMANDS;
        renderResults();
    }

    function renderResults() {
        const resultsContainer = document.getElementById('command-results');
        if (!resultsContainer) return;

        if (filteredCommands.length === 0) {
            resultsContainer.innerHTML = `
                <div class="command-empty">
                    No commands found
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = filteredCommands.map((cmd, index) => `
            <div 
                class="command-item ${index === selectedIndex ? 'selected' : ''}" 
                data-index="${index}"
            >
                <div class="command-item-icon">${cmd.icon}</div>
                <div class="command-item-content">
                    <div class="command-item-title">${cmd.title}</div>
                </div>
                ${cmd.shortcut ? `<div class="command-item-shortcut">${cmd.shortcut}</div>` : ''}
            </div>
        `).join('');

        // Add click handlers
        resultsContainer.querySelectorAll('.command-item').forEach((item) => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                executeCommand(filteredCommands[index]);
            });
        });

        // Scroll selected item into view
        const selectedItem = resultsContainer.querySelector('.command-item.selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    function executeCommand(command) {
        if (command && command.action) {
            command.action();
        }
    }

    function open() {
        if (isOpen) return;
        isOpen = true;
        render();
    }

    function close() {
        isOpen = false;
        const palette = document.getElementById('command-palette');
        if (palette) {
            palette.remove();
        }
    }

    // Global keyboard shortcut (Ctrl+K)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (isOpen) {
                close();
            } else {
                open();
            }
        }
    });

    // Export for programmatic access
    window.CommandPalette = {
        open,
        close,
        isOpen: () => isOpen
    };
})();
