/**
 * Sync Diagnostics Utility
 * Helps identify and troubleshoot sync and authentication issues
 */

class SyncDiagnostics {
    /**
     * Run full diagnostics
     */
    static runFullDiagnostics() {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 SYNC DIAGNOSTICS - FULL REPORT');
        console.log('='.repeat(80) + '\n');

        this.checkAuthentication();
        this.checkApiConfig();
        this.checkSessionStorage();
        this.checkElectronAPI();
        this.checkNetworkHeaders();

        console.log('\n' + '='.repeat(80));
        console.log('✅ Diagnostics Complete');
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Check authentication status
     */
    static checkAuthentication() {
        console.log('📋 AUTHENTICATION STATUS');
        console.log('-'.repeat(80));

        const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('authToken')
            : localStorage.getItem('authToken');
        const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('deviceToken')
            : localStorage.getItem('deviceToken');
        const csrfToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('csrfToken')
            : localStorage.getItem('csrfToken');
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        console.log(`  Auth Token Present: ${!!authToken ? '✅ YES' : '❌ NO'}`);
        if (authToken) {
            console.log(`    Length: ${authToken.length} chars`);
            console.log(`    Starts with: ${authToken.substring(0, 20)}...`);
        }

        console.log(`  Device Token Present: ${!!deviceToken ? '✅ YES' : '❌ NO'}`);
        if (deviceToken) {
            console.log(`    Value: ${deviceToken}`);
        }

        console.log(`  CSRF Token Present: ${!!csrfToken ? '✅ YES' : '❌ NO'}`);
        if (csrfToken) {
            console.log(`    Length: ${csrfToken.length} chars`);
        }

        console.log(`  Current User: ${currentUser.userId ? '✅ YES' : '❌ NO'}`);
        if (currentUser.userId) {
            console.log(`    User ID: ${currentUser.userId}`);
            console.log(`    Username: ${currentUser.username}`);
        }

        console.log('');
    }

    /**
     * Check API configuration
     */
    static checkApiConfig() {
        console.log('📋 API CONFIGURATION');
        console.log('-'.repeat(80));

        if (!window.apiConfig) {
            console.log('  ❌ window.apiConfig NOT AVAILABLE');
            console.log('');
            return;
        }

        console.log(`  ✅ window.apiConfig Available`);
        console.log(`    BASE_URL: ${window.apiConfig.BASE_URL}`);
        console.log(`    baseURL: ${window.apiConfig.baseURL}`);
        console.log(`    getUrl method: ${typeof window.apiConfig.getUrl === 'function' ? '✅' : '❌'}`);

        // Test getUrl method
        try {
            const testUrl = window.apiConfig.getUrl('/companies');
            console.log(`    Test URL: ${testUrl}`);
        } catch (e) {
            console.log(`    Test URL Error: ${e.message}`);
        }

        console.log('');
    }

    /**
     * Check session storage
     */
    static checkSessionStorage() {
        console.log('📋 SESSION STORAGE');
        console.log('-'.repeat(80));

        const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        console.log(`  App Settings:`);
        console.log(`    Tally Port: ${appSettings.tallyPort || 'NOT SET'}`);
        console.log(`    Sync Interval: ${appSettings.syncInterval || 'NOT SET'} minutes`);

        console.log('');
    }

    /**
     * Check Electron API
     */
    static checkElectronAPI() {
        console.log('📋 ELECTRON API');
        console.log('-'.repeat(80));

        if (!window.electronAPI) {
            console.log('  ❌ window.electronAPI NOT AVAILABLE');
            console.log('');
            return;
        }

        console.log(`  ✅ window.electronAPI Available`);
        console.log(`    Platform: ${window.electronAPI.platform}`);
        console.log(`    incrementalSync: ${typeof window.electronAPI.incrementalSync === 'function' ? '✅' : '❌'}`);
        console.log(`    invoke: ${typeof window.electronAPI.invoke === 'function' ? '✅' : '❌'}`);
        console.log(`    send: ${typeof window.electronAPI.send === 'function' ? '✅' : '❌'}`);

        console.log('');
    }

    /**
     * Check network headers that will be sent
     */
    static checkNetworkHeaders() {
        console.log('📋 NETWORK HEADERS (Will be sent with requests)');
        console.log('-'.repeat(80));

        const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('authToken')
            : localStorage.getItem('authToken');
        const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('deviceToken')
            : localStorage.getItem('deviceToken');
        const csrfToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('csrfToken')
            : localStorage.getItem('csrfToken');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken.substring(0, 20)}...` : 'MISSING',
            'X-Device-Token': deviceToken || 'MISSING',
            'X-CSRF-Token': csrfToken ? `${csrfToken.substring(0, 20)}...` : 'NOT SET'
        };

        Object.entries(headers).forEach(([key, value]) => {
            const status = value === 'MISSING' ? '❌' : value === 'NOT SET' ? '⚠️' : '✅';
            console.log(`  ${status} ${key}: ${value}`);
        });

        console.log('');
    }

    /**
     * Test API connectivity
     */
    static async testApiConnectivity() {
        console.log('\n' + '='.repeat(80));
        console.log('🌐 API CONNECTIVITY TEST');
        console.log('='.repeat(80) + '\n');

        const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('authToken')
            : localStorage.getItem('authToken');
        const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet('deviceToken')
            : localStorage.getItem('deviceToken');
        const baseUrl = window.apiConfig?.BASE_URL || window.AppConfig?.API_BASE_URL;

        if (!authToken || !deviceToken) {
            console.log('❌ Cannot test - Missing authentication tokens');
            return;
        }

        const endpoints = [
            '/companies',
            '/api/companies/10/master-mapping',
            '/groups/company/10'
        ];

        for (const endpoint of endpoints) {
            try {
                const url = `${baseUrl}${endpoint}`;
                console.log(`\n📡 Testing: ${endpoint}`);
                console.log(`   URL: ${url}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                        'X-Device-Token': deviceToken,
                        'X-CSRF-Token': ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                            ? window.electronAPI.secureStoreGet('csrfToken')
                            : localStorage.getItem('csrfToken')) || ''
                    }
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);

                if (response.status === 403) {
                    console.log(`   ❌ FORBIDDEN - Check user permissions`);
                } else if (response.status === 401) {
                    console.log(`   ❌ UNAUTHORIZED - Check authentication token`);
                } else if (response.ok) {
                    console.log(`   ✅ SUCCESS`);
                } else {
                    console.log(`   ⚠️ ERROR - ${response.statusText}`);
                }
            } catch (error) {
                console.log(`   ❌ ERROR: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(80) + '\n');
    }

    /**
     * Get diagnostics summary
     */
    static getSummary() {
        const issues = [];

        const hasAuthToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? !!window.electronAPI.secureStoreGet('authToken')
            : !!localStorage.getItem('authToken');
        if (!hasAuthToken) {
            issues.push('❌ No authentication token');
        }

        const hasDeviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? !!window.electronAPI.secureStoreGet('deviceToken')
            : !!localStorage.getItem('deviceToken');
        if (!hasDeviceToken) {
            issues.push('❌ No device token');
        }

        if (!window.apiConfig) {
            issues.push('❌ API config not available');
        }

        if (!window.electronAPI) {
            issues.push('❌ Electron API not available');
        }

        if (issues.length === 0) {
            return '✅ All systems operational';
        }

        return issues.join('\n');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SyncDiagnostics = SyncDiagnostics;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncDiagnostics;
}
