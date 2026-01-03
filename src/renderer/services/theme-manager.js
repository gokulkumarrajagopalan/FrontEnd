/**
 * Theme Manager
 * Handles light/dark theme switching across the entire application
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.currentTheme);

        // Listen for theme changes
        window.addEventListener('theme-changed', (e) => {
            this.setTheme(e.detail.theme);
        });
    }

    loadTheme() {
        // Load from localStorage, default to 'light'
        return localStorage.getItem('app-theme') || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem('app-theme', theme);
    }

    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.error('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        this.saveTheme(theme);
        this.applyTheme(theme);

        // Notify other components
        window.dispatchEvent(new CustomEvent('theme-applied', {
            detail: { theme }
        }));
    }

    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
            this.applyDarkTheme(root);
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
            this.applyLightTheme(root);
        }
    }

    applyLightTheme(root) {
        // Background colors - Clean Professional Blue/Grey
        root.style.setProperty('--bg-primary', '#F8FAFC');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--bg-tertiary', '#eff3f8');
        root.style.setProperty('--bg-hover', '#f1f5f9');

        // Text colors
        root.style.setProperty('--text-primary', '#1e293b');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--text-tertiary', '#64748b');
        root.style.setProperty('--text-disabled', '#94a3b8');

        // Border colors
        root.style.setProperty('--border-primary', '#e2e8f0');
        root.style.setProperty('--border-secondary', '#cbd5e1');
        root.style.setProperty('--border-focus', '#5E86BA');

        // Brand colors - Blue Steel Theme
        root.style.setProperty('--primary-50', '#eff3f8');
        root.style.setProperty('--primary-100', '#dce7f1');
        root.style.setProperty('--primary-200', '#bccee3');
        root.style.setProperty('--primary-300', '#9cabce');
        root.style.setProperty('--primary-400', '#7d97b9');
        root.style.setProperty('--primary-500', '#5E86BA');
        root.style.setProperty('--primary-600', '#4a6da1');
        root.style.setProperty('--primary-700', '#395584');
        root.style.setProperty('--primary-800', '#29416a');
        root.style.setProperty('--primary-900', '#1d2e50');

        // Secondary Colors - Deep Blue Steel
        root.style.setProperty('--secondary-50', '#ebeeef');
        root.style.setProperty('--secondary-400', '#4d698f');
        root.style.setProperty('--secondary-500', '#395984');
        root.style.setProperty('--secondary-600', '#2d4a70');
        root.style.setProperty('--secondary-700', '#243b5a');
        root.style.setProperty('--secondary-800', '#1a2c45');
        root.style.setProperty('--secondary-900', '#0c131d');

        // Gradient
        root.style.setProperty('--gradient-start', '#5E86BA');
        root.style.setProperty('--gradient-middle', '#395984');
        root.style.setProperty('--gradient-end', '#294160');

        // Sidebar
        root.style.setProperty('--sidebar-bg', '#294160');
        root.style.setProperty('--sidebar-text', '#ffffff');
        root.style.setProperty('--sidebar-hover', '#395984');

        // Card
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--card-border', '#e2e8f0');
        root.style.setProperty('--card-shadow', 'rgba(41, 65, 96, 0.08)');

        // Input
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--input-border', '#e2e8f0');
        root.style.setProperty('--input-text', '#1e293b');
        root.style.setProperty('--input-placeholder', '#94a3b8');

        // Table
        root.style.setProperty('--table-header-bg', '#f1f5f9');
        root.style.setProperty('--table-row-hover', '#f8fafc');
        root.style.setProperty('--table-border', '#e2e8f0');
    }

    applyDarkTheme(root) {
        // Deep Professional Dark
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--bg-tertiary', '#334155');
        root.style.setProperty('--bg-hover', '#334155');

        // Text colors
        root.style.setProperty('--text-primary', '#f8fafc');
        root.style.setProperty('--text-secondary', '#cbd5e1');
        root.style.setProperty('--text-tertiary', '#94a3b8');
        root.style.setProperty('--text-disabled', '#64748b');

        // Brand colors - Muted Blue highlight
        root.style.setProperty('--primary-500', '#5E86BA');
        root.style.setProperty('--primary-600', '#4a6da1');
        root.style.setProperty('--sidebar-bg', '#020617');
        root.style.setProperty('--sidebar-hover', '#1e293b');

        root.style.setProperty('--card-bg', '#1e293b');
        root.style.setProperty('--border-primary', '#334155');
    }

    getTheme() {
        return this.currentTheme;
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }
}

// Initialize theme manager
if (typeof window !== 'undefined') {
    window.themeManager = new ThemeManager();
}
