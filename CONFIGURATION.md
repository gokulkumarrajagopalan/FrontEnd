# Configuration Guide

## Environment Variables

This application uses environment variables for configuration. All configuration is centralized through the `.env` file in the project root.

### Backend URL Configuration

The backend API URL is configured via the `BACKEND_URL` environment variable.

**Setup:**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your backend URL:
   ```bash
   BACKEND_URL=http://3.80.124.37:8080
   ```

3. For local development, use:
   ```bash
   BACKEND_URL=http://localhost:8080
   ```

### How It Works

1. **Main Process** (`src/main/main.js`):
   - Loads `.env` file using `dotenv` package
   - Reads `BACKEND_URL` from `process.env`
   - Exposes it to renderer via `window.electronAPI.backendUrl`

2. **Renderer Process** (`src/renderer/services/config.js`):
   - Retrieves URL from `window.electronAPI.backendUrl`
   - Makes it available globally via `window.AppConfig.API_BASE_URL`

3. **Application Code**:
   - All API calls use `window.AppConfig.API_BASE_URL` or `window.apiConfig.baseURL`
   - No hardcoded URLs anywhere in the codebase

### Files Updated

The following configuration files manage the backend URL:

- `.env` - Environment variables (not committed to git)
- `.env.example` - Template for environment variables
- `src/main/main.js` - Loads dotenv and provides URL to renderer
- `src/renderer/services/config.js` - Central configuration object
- `src/renderer/services/apiConfig.js` - API configuration with endpoints

### Changing the Backend URL

To change the backend URL:

1. Edit `.env` file
2. Update `BACKEND_URL=<new-url>`
3. Restart the application

**Note:** Changes to `.env` require a full application restart to take effect.

### Environment-Specific URLs

For different environments:

**Development:**
```bash
BACKEND_URL=http://localhost:8080
```

**Staging:**
```bash
BACKEND_URL=http://staging.example.com:8080
```

**Production:**
```bash
BACKEND_URL=http://3.80.124.37:8080
```

### Python Scripts

Python sync scripts also use the `BACKEND_URL` environment variable:
- The URL is passed from Electron main process to Python scripts
- Python scripts can also read directly from environment: `os.getenv('BACKEND_URL')`

### Troubleshooting

**Issue:** Application shows "Backend URL not configured" error

**Solution:** 
1. Ensure `.env` file exists in project root
2. Verify `BACKEND_URL` is set in `.env`
3. Restart the application

**Issue:** API calls fail with connection errors

**Solution:**
1. Check if backend server is running
2. Verify `BACKEND_URL` in `.env` matches your backend server
3. Check network connectivity
