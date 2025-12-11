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
        // Background colors - Light Grey Background (#F5F5F5)
        root.style.setProperty('--bg-primary', '#F5F5F5');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--bg-tertiary', '#E3F2FD'); // Soft Blue Panels
        root.style.setProperty('--bg-hover', '#E3F2FD');

        // Text colors
        root.style.setProperty('--text-primary', '#1a1a2e');
        root.style.setProperty('--text-secondary', '#374151');
        root.style.setProperty('--text-tertiary', '#6b7280');
        root.style.setProperty('--text-disabled', '#9ca3af');

        // Border colors
        root.style.setProperty('--border-primary', '#e0e0e0');
        root.style.setProperty('--border-secondary', '#bdbdbd');
        root.style.setProperty('--border-focus', '#1565C0'); // Royal Blue

        // Brand colors - Royal Blue Theme
        root.style.setProperty('--primary-50', '#E3F2FD');
        root.style.setProperty('--primary-100', '#BBDEFB');
        root.style.setProperty('--primary-200', '#90CAF9');
        root.style.setProperty('--primary-300', '#64B5F6');
        root.style.setProperty('--primary-400', '#42A5F5');
        root.style.setProperty('--primary-500', '#2196F3');
        root.style.setProperty('--primary-600', '#1565C0'); // Royal Blue - Primary
        root.style.setProperty('--primary-700', '#0D47A1');
        root.style.setProperty('--primary-800', '#0A3A7A');
        root.style.setProperty('--primary-900', '#072654');

        // Secondary/Accent colors - Sky Blue
        root.style.setProperty('--secondary-50', '#E1F5FE');
        root.style.setProperty('--secondary-100', '#B3E5FC');
        root.style.setProperty('--secondary-200', '#81D4FA');
        root.style.setProperty('--secondary-300', '#4FC3F7');
        root.style.setProperty('--secondary-400', '#29B6F6'); // Accent Sky Blue
        root.style.setProperty('--secondary-500', '#03A9F4');
        root.style.setProperty('--secondary-600', '#039BE5');
        root.style.setProperty('--secondary-700', '#0288D1');
        root.style.setProperty('--secondary-800', '#0277BD');
        root.style.setProperty('--secondary-900', '#01579B');

        // Gradient
        root.style.setProperty('--gradient-start', '#1565C0');
        root.style.setProperty('--gradient-middle', '#1976D2');
        root.style.setProperty('--gradient-end', '#29B6F6');

        // Sidebar - Dark Blue for contrast
        root.style.setProperty('--sidebar-bg', '#0D47A1');
        root.style.setProperty('--sidebar-text', '#ffffff');
        root.style.setProperty('--sidebar-hover', '#1565C0');

        // Card
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--card-border', '#e0e0e0');
        root.style.setProperty('--card-shadow', 'rgba(21, 101, 192, 0.08)');

        // Input
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--input-border', '#e0e0e0');
        root.style.setProperty('--input-text', '#1a1a2e');
        root.style.setProperty('--input-placeholder', '#9ca3af');

        // Table
        root.style.setProperty('--table-header-bg', '#E3F2FD');
        root.style.setProperty('--table-row-hover', '#f5f5f5');
        root.style.setProperty('--table-border', '#e0e0e0');
    }

    applyDarkTheme(root) {
        // Background colors - Charcoal Black (#121212) for eye comfort
        root.style.setProperty('--bg-primary', '#121212');
        root.style.setProperty('--bg-secondary', '#1E1E1E'); // Dark Grey Panels
        root.style.setProperty('--bg-tertiary', '#2D2D2D');
        root.style.setProperty('--bg-hover', '#333333');

        // Text colors - Grey for readability (#E0E0E0)
        root.style.setProperty('--text-primary', '#E0E0E0');
        root.style.setProperty('--text-secondary', '#B0B0B0');
        root.style.setProperty('--text-tertiary', '#808080');
        root.style.setProperty('--text-disabled', '#606060');

        // Border colors
        root.style.setProperty('--border-primary', '#333333');
        root.style.setProperty('--border-secondary', '#444444');
        root.style.setProperty('--border-focus', '#00BCD4'); // Teal highlight

        // Brand colors - Teal/Cyan theme for dark mode
        root.style.setProperty('--primary-50', '#E0F7FA');
        root.style.setProperty('--primary-100', '#B2EBF2');
        root.style.setProperty('--primary-200', '#80DEEA');
        root.style.setProperty('--primary-300', '#4DD0E1');
        root.style.setProperty('--primary-400', '#26C6DA');
        root.style.setProperty('--primary-500', '#00BCD4'); // Highlight Teal
        root.style.setProperty('--primary-600', '#00ACC1');
        root.style.setProperty('--primary-700', '#0097A7');
        root.style.setProperty('--primary-800', '#00838F');
        root.style.setProperty('--primary-900', '#006064');

        // Secondary/Accent colors - Blue accent
        root.style.setProperty('--secondary-50', '#E3F2FD');
        root.style.setProperty('--secondary-100', '#BBDEFB');
        root.style.setProperty('--secondary-200', '#90CAF9');
        root.style.setProperty('--secondary-300', '#64B5F6');
        root.style.setProperty('--secondary-400', '#42A5F5');
        root.style.setProperty('--secondary-500', '#2979FF'); // Highlight Blue
        root.style.setProperty('--secondary-600', '#2196F3');
        root.style.setProperty('--secondary-700', '#1976D2');
        root.style.setProperty('--secondary-800', '#1565C0');
        root.style.setProperty('--secondary-900', '#0D47A1');

        // Gradient - Teal to Blue
        root.style.setProperty('--gradient-start', '#00BCD4');
        root.style.setProperty('--gradient-middle', '#00ACC1');
        root.style.setProperty('--gradient-end', '#2979FF');

        // Sidebar - Darker for contrast
        root.style.setProperty('--sidebar-bg', '#0A0A0A');
        root.style.setProperty('--sidebar-text', '#E0E0E0');
        root.style.setProperty('--sidebar-hover', '#1E1E1E');

        // Card
        root.style.setProperty('--card-bg', '#1E1E1E');
        root.style.setProperty('--card-border', '#333333');
        root.style.setProperty('--card-shadow', 'rgba(0, 188, 212, 0.1)');

        // Input
        root.style.setProperty('--input-bg', '#1E1E1E');
        root.style.setProperty('--input-border', '#333333');
        root.style.setProperty('--input-text', '#E0E0E0');
        root.style.setProperty('--input-placeholder', '#606060');

        // Table
        root.style.setProperty('--table-header-bg', '#1E1E1E');
        root.style.setProperty('--table-row-hover', '#2D2D2D');
        root.style.setProperty('--table-border', '#333333');
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
