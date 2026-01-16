/**
 * Application Configuration
 * 
 * To change the backend URL:
 * 1. Edit the .env file in the project root
 * 2. Set BACKEND_URL=http://your-backend-url:port
 * 3. Restart the application
 * 
 * The URL is loaded from environment variables and automatically used by:
 * - Frontend API calls
 * - Python sync scripts (groups, ledgers)
 * - Electron IPC handlers
 */
window.AppConfig = {
    API_BASE_URL: window.electronAPI?.backendUrl,
    APP_NAME: 'Tally Prime',
    VERSION: '1.0.0'
};
