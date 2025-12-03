/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/main/index.html", "./src/renderer/pages/**/*.html", "./src/renderer/pages/**/*.js", "./src/renderer/**/*.js"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1', // Indigo 500
                    600: '#4f46e5', // Indigo 600 (Main)
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                secondary: {
                    50: '#fdf4ff',
                    100: '#fae8ff',
                    500: '#d946ef', // Fuchsia pop
                    600: '#c026d3',
                },
                surface: '#ffffff',
                background: '#f8fafc', // Slate 50
                sidebar: '#0f172a', // Slate 900
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
                'float': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
                'glow': '0 0 20px rgba(79, 70, 229, 0.35)',
                'inner-light': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)',
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                'gradient-surface': 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}
