/**
 * Public API Service
 * Handles unauthenticated requests to public endpoints (auth, register, etc.)
 * This prevents issues where backend may incorrectly require auth headers on public routes
 */

class PublicApiService {
    static async request(url, options = {}, attempt = 1) {
        const MAX_RETRIES = 3;
        const TIMEOUT_MS = 10000;
        const RETRY_DELAY_MS = 1000;

        // Ensure public endpoints NEVER include auth headers
        const mergedOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Explicitly remove any auth headers that might be present
        delete mergedOptions.headers['Authorization'];
        delete mergedOptions.headers['X-Device-Token'];
        delete mergedOptions.headers['X-CSRF-Token'];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(`${window.apiConfig.BASE_URL}${url}`, {
                ...mergedOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                // Debug: Log the actual response for backend issues
                console.error(`❌ Public API Error (${response.status}):`, {
                    url,
                    status: response.status,
                    message: data.message || data.error,
                    headers: Array.from(response.headers.entries()).reduce((h, [k, v]) => {
                        if (k.toLowerCase().includes('auth') || k.toLowerCase().includes('token')) {
                            h[k] = '[REDACTED]';
                        }
                        return h;
                    }, {})
                });

                // Special handling for 401 on public endpoints (backend misconfiguration)
                if (response.status === 401) {
                    console.error('🔴 BACKEND MISCONFIGURATION DETECTED:');
                    console.error('   Public endpoint requires Authorization header');
                    console.error('   This indicates auth middleware is incorrectly applied globally');
                    console.error('   Fix: In backend, exempt /auth/* routes from auth middleware');
                }

                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                error.message = `Request timeout after ${TIMEOUT_MS}ms`;
            }

            // Retry logic for retryable errors
            if (attempt < MAX_RETRIES && this.isRetryable(error)) {
                const delay = RETRY_DELAY_MS * attempt;
                console.warn(`🔄 Retry attempt ${attempt}/${MAX_RETRIES} for ${url} (waiting ${delay}ms)...`);
                await new Promise(r => setTimeout(r, delay));
                return this.request(url, options, attempt + 1);
            }

            console.error(`Public API Error (${url}):`, error.message);
            return { success: false, error: error.message };
        }
    }

    static isRetryable(error) {
        const nonRetryableErrors = [
            'Unauthorized',
            'Forbidden',
            'Not Found',
            'Invalid request',
            'Backend Misconfiguration'
        ];
        return !nonRetryableErrors.some(e => error.message?.includes(e));
    }

    static post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static get(url) {
        return this.request(url, { method: 'GET' });
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.publicApiService = PublicApiService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublicApiService;
}
