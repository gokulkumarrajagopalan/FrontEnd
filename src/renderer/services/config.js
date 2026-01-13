/**
 * Application Configuration
 * 
 * To change the backend URL:
 * 1. Update API_BASE_URL below
 * 2. Restart the application
 * 
 * The URL will be automatically used by:
 * - Frontend API calls
 * - Python sync scripts (groups, ledgers)
 * - Electron IPC handlers
 */
window.AppConfig = {
    API_BASE_URL: (window.electronAPI && window.electronAPI.backendUrl) || 'http://localhost:8080',
    APP_NAME: 'Tally Prime',
    VERSION: '1.0.0'
};
