/**
 * Single source of truth for the desktop app's default remote URLs (main process).
 *
 * Resolution order at runtime is still: .env / userData config.json (BACKEND_URL) →
 * these defaults. Override the backend without touching code by setting BACKEND_URL
 * in the project .env or the settings page. Everything in the main process (and the
 * renderer, via the get-backend-url IPC) should reference these — never hardcode a URL.
 */
const DEFAULT_BACKEND_URL = 'http://localhost:8080/api';
const DEFAULT_WEB_URL = 'http://localhost:3000';

// Origins the app is allowed to open externally / connect to (origin-level prefixes).
const ALLOWED_EXTERNAL_ORIGINS = [
  DEFAULT_WEB_URL,
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'https://',
];

module.exports = { DEFAULT_BACKEND_URL, DEFAULT_WEB_URL, ALLOWED_EXTERNAL_ORIGINS };
