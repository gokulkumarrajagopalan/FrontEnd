# Talliffy Desktop App - API Calls Documentation

## Table of Contents
1. [API Configuration](#api-configuration)
2. [Authentication APIs](#authentication-apis)
3. [Company APIs](#company-apis)
4. [Groups APIs](#groups-apis)
5. [Ledgers APIs](#ledgers-apis)
6. [Vouchers APIs](#vouchers-apis)
7. [Items & Units APIs](#items--units-apis)
8. [Masters APIs](#masters-apis)
9. [Sync APIs](#sync-apis)
10. [Import Company APIs](#import-company-apis)
11. [Response Formats](#response-formats)

---

## API Configuration

### Base URL Setup
```javascript
// File: src/renderer/services/apiConfig.js

const apiConfig = {
    // Get BASE_URL from environment or fallback
    get BASE_URL() {
        if (window.electronAPI?.backendUrl) {
            return window.electronAPI.backendUrl;
        }
        if (window.AppConfig?.API_BASE_URL) {
            return window.AppConfig.API_BASE_URL;
        }
        throw new Error('Backend URL not configured. Set BACKEND_URL in .env');
    },
    
    // Example: http://3.80.124.37:8080
    baseURL: this.BASE_URL,
    
    // Get full URL for endpoint
    getUrl(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },
    
    // Get URL with ID
    getUrlWithId(endpoint, id) {
        return `${this.BASE_URL}${endpoint}/${id}`;
    }
};
```

### API Service Wrapper
```javascript
// File: src/renderer/services/api.js

class ApiService {
    static MAX_RETRIES = 3;
    static TIMEOUT_MS = 10000;
    static RETRY_DELAY_MS = 1000;

    /**
     * Generic request with retry logic
     * @param {string} url - Endpoint URL
     * @param {object} options - Fetch options
     * @param {number} attempt - Current retry attempt
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    static async request(url, options = {}, attempt = 1) {
        const defaultOptions = {
            headers: authService.getHeaders()
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await this.executeWithTimeout(url, mergedOptions);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.clearAuthData();
                window.location.hash = '#login';
                throw new Error('Unauthorized - Logged in from another device');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            // Retry logic
            if (attempt < this.MAX_RETRIES && this.isRetryable(error)) {
                await new Promise(r => setTimeout(r, this.RETRY_DELAY_MS * attempt));
                return this.request(url, options, attempt + 1);
            }

            return { success: false, error: error.message };
        }
    }

    static get(url) {
        return this.request(url, { method: 'GET' });
    }

    static post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
}
```

### Headers Included in All Requests
```javascript
{
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,      // From sessionStorage
    'X-Device-Token': deviceToken,                // From sessionStorage
    'X-CSRF-Token': csrfToken                     // From sessionStorage
}
```

---

## Authentication APIs

### 1. Login
**Endpoint:** `POST /auth/login`

```javascript
// File: src/renderer/services/auth.js
async login(username, password) {
    const response = await fetch(window.apiConfig.getNestedUrl('auth', 'login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    
    // Store tokens and user info
    sessionStorage.setItem('authToken', data.token);
    sessionStorage.setItem('deviceToken', data.deviceToken);
    sessionStorage.setItem('csrfToken', data.csrfToken);
    sessionStorage.setItem('currentUser', JSON.stringify(data));
    
    return data;
}
```

**Request Body:**
```json
{
    "username": "user@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "deviceToken": "device-token-xyz",
    "csrfToken": "csrf-token-abc",
    "userId": 1,
    "username": "user@example.com",
    "fullName": "John Doe",
    "role": "ADMIN",
    "licenceNo": "TL123456"
}
```

### 2. Register
**Endpoint:** `POST /auth/register`

```javascript
async register(userData) {
    // userData includes: username, email, password, licenceNo, fullName, countryCode, mobile
    
    const mobileValidation = this.validateMobileNumber(userData.mobile, userData.countryCode);
    
    if (!mobileValidation.isValid) {
        return { success: false, message: mobileValidation.error };
    }

    const response = await fetch(window.apiConfig.getNestedUrl('auth', 'register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...userData,
            mobile: mobileValidation.national,
            countryCode: mobileValidation.e164
        })
    });

    return await response.json();
}
```

**Request Body:**
```json
{
    "username": "newuser@example.com",
    "email": "newuser@example.com",
    "password": "securePassword123",
    "fullName": "Jane Smith",
    "licenceNo": "TL654321",
    "countryCode": "+91",
    "mobile": "9876543210"
}
```

### 3. Logout
**Endpoint:** `POST /auth/logout`

```javascript
async logout() {
    const response = await fetch(window.apiConfig.getNestedUrl('auth', 'logout'), {
        method: 'POST',
        headers: this.getHeaders()
    });
    
    // Clear all auth data
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('deviceToken');
    sessionStorage.removeItem('csrfToken');
    sessionStorage.removeItem('currentUser');
    
    return await response.json();
}
```

### 4. Refresh Token
**Endpoint:** `POST /auth/refresh`

```javascript
async refreshToken() {
    const response = await fetch(window.apiConfig.getNestedUrl('auth', 'refresh'), {
        method: 'POST',
        headers: this.getHeaders()
    });
    
    const data = await response.json();
    if (data.token) {
        sessionStorage.setItem('authToken', data.token);
    }
    return data;
}
```

### 5. Validate Token
**Endpoint:** `POST /auth/validate`

```javascript
async validateToken() {
    const response = await fetch(window.apiConfig.getNestedUrl('auth', 'validate'), {
        method: 'POST',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

---

## Company APIs

### 1. Get All Companies
**Endpoint:** `GET /companies`

```javascript
// File: src/renderer/pages/company-sync.js & import-company.js

async loadCompanies() {
    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl('/companies'), {
        method: 'GET',
        headers: headers
    });

    if (response.status === 401) {
        // Handle unauthorized access
        window.authService.clearAuth();
        window.location.hash = '#auth';
        return;
    }

    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
        companies = result.data;
        console.log(`✅ Loaded ${companies.length} companies`);
    }
    return result;
}
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "ABC Corporation",
            "code": "ABC",
            "guid": "550e8400-e29b-41d4-a716-446655440000",
            "companyGuid": "550e8400-e29b-41d4-a716-446655440000",
            "state": "Maharashtra",
            "email": "info@abc.com",
            "syncStatus": "synced",
            "lastSyncTime": "2025-01-27T10:30:00Z",
            "userId": 1
        }
    ]
}
```

### 2. Create Company
**Endpoint:** `POST /companies`

```javascript
async sendCompanyToBackend(company) {
    const currentUser = window.authService.getCurrentUser();
    
    const payload = {
        ...company,
        userId: currentUser.userId
    };

    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl('/companies'), {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    return {
        success: response.ok,
        backendId: result.data?.id || result.id,
        message: result.message
    };
}
```

**Request Body (56 fields from Tally):**
```json
{
    "name": "ABC Corporation",
    "code": "ABC",
    "guid": "550e8400-e29b-41d4-a716-446655440000",
    "state": "Maharashtra",
    "email": "info@abc.com",
    "phoneNumber": "9876543210",
    "address": "123 Business Street",
    "city": "Pune",
    "pinCode": "411001",
    "country": "India",
    "fax": "+91-20-12345678",
    "website": "www.abc.com",
    "fiscalYearStart": "04/01/2025",
    "fiscalYearEnd": "03/31/2026",
    "financialYear": "2025-26",
    "totalDebtors": 500000,
    "totalCreditors": 750000,
    "baseCurrencyName": "INR",
    "hasMultipleCurrency": false,
    "multiCurrencyEnabled": false,
    "gstApplicable": true,
    "gstNumber": "27AABCT1234H1Z0",
    "panNumber": "AAACR5055K",
    "cinNumber": "L74899DL1997PTC089827",
    "msmeFactor": "COMPOSITE",
    "fiscalYearFreeze": "2023-12-31",
    "mailingName": "ABC Corp",
    "mailingAddress": "Corporate Office",
    "mailingCity": "Mumbai",
    "mailingState": "Maharashtra",
    "mailingPinCode": "400001",
    "mailingPhone": "9876543211",
    "mailingEmail": "accounts@abc.com",
    "lastModified": "2025-01-27T10:30:00Z",
    "createdDate": "2023-01-01T00:00:00Z",
    "isActive": true,
    "parentCompany": null,
    "userId": 1
}
```

### 3. Get Company Details
**Endpoint:** `GET /companies/{id}`

```javascript
async getCompanyDetails(companyId) {
    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl(`/companies/${companyId}`), {
        method: 'GET',
        headers: headers
    });
    return await response.json();
}
```

### 4. Update Company
**Endpoint:** `PUT /companies/{id}`

```javascript
async updateCompany(companyId, companyData) {
    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl(`/companies/${companyId}`), {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(companyData)
    });
    return await response.json();
}
```

### 5. Get Company Sync Status
**Endpoint:** `GET /companies/{id}/sync-status`

```javascript
async getCompanySyncStatus(companyId) {
    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl(`/companies/${companyId}/sync-status`), {
        method: 'GET',
        headers: headers
    });
    return await response.json();
}
```

---

## Groups APIs

### 1. Get All Groups
**Endpoint:** `GET /groups`

```javascript
// File: src/renderer/services/groups-service.js

async getAllGroups() {
    const response = await fetch(this.apiConfig.getUrl('/groups'), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "cmpId": 1,
            "grpName": "Assets",
            "guid": "uuid-1234",
            "masterId": 1,
            "alterId": 0,
            "grpParent": "Primary",
            "isRevenue": false,
            "isActive": true
        }
    ]
}
```

### 2. Get Groups by Company
**Endpoint:** `GET /groups/company/{companyId}`

```javascript
async getGroupsByCompany(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 3. Get Active Groups
**Endpoint:** `GET /groups/company/{companyId}/active`

```javascript
async getActiveGroups(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/active`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 4. Get Group by ID
**Endpoint:** `GET /groups/{id}`

```javascript
async getGroupById(groupId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 5. Get Group by GUID
**Endpoint:** `GET /groups/guid/{guid}`

```javascript
async getGroupByGuid(guid) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/guid/${guid}`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 6. Get Primary Groups
**Endpoint:** `GET /groups/company/{companyId}/primary`

```javascript
async getPrimaryGroups(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/primary`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 7. Get Revenue Groups
**Endpoint:** `GET /groups/company/{companyId}/revenue`

```javascript
async getRevenueGroups(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/revenue`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 8. Get Balance Sheet Groups
**Endpoint:** `GET /groups/company/{companyId}/balancesheet`

```javascript
async getBalanceSheetGroups(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/balancesheet`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 9. Get Group Hierarchy Tree
**Endpoint:** `GET /groups/company/{companyId}/hierarchy`

```javascript
async getGroupHierarchy(companyId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/hierarchy`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

**Response (Hierarchical Structure):**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "grpName": "Assets",
        "children": [
            {
                "id": 2,
                "grpName": "Current Assets",
                "children": [
                    {
                        "id": 3,
                        "grpName": "Cash & Bank",
                        "children": []
                    }
                ]
            }
        ]
    }
}
```

### 10. Search Groups
**Endpoint:** `GET /groups/company/{companyId}/search?term={searchTerm}`

```javascript
async searchGroups(companyId, searchTerm) {
    const response = await fetch(
        this.apiConfig.getUrl(`/groups/company/${companyId}/search?term=${encodeURIComponent(searchTerm)}`),
        {
            method: 'GET',
            headers: this.getHeaders()
        }
    );
    return await response.json();
}
```

### 11. Get Child Groups
**Endpoint:** `GET /groups/{parentGrpId}/children`

```javascript
async getChildGroups(parentGrpId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/${parentGrpId}/children`), {
        method: 'GET',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 12. Create Group
**Endpoint:** `POST /groups`

```javascript
async createGroup(groupData) {
    const response = await fetch(this.apiConfig.getUrl('/groups'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(groupData)
    });
    return await response.json();
}
```

**Request Body:**
```json
{
    "cmpId": 1,
    "grpName": "Fixed Assets",
    "guid": "new-uuid",
    "masterId": 1,
    "alterId": 0,
    "grpParent": "Assets",
    "isRevenue": false,
    "isActive": true,
    "userId": 1
}
```

### 13. Sync Groups (Bulk Upsert)
**Endpoint:** `POST /groups/sync`

```javascript
// File: src/renderer/pages/import-company.js

async syncGroupsForCompany(companyId, companyData) {
    const tallyPort = JSON.parse(localStorage.getItem('appSettings')).tallyPort || 9000;
    const tallyUrl = `http://localhost:${tallyPort}`;

    // Fetch groups from Tally XML response
    const response = await fetch(tallyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: `<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST></HEADER>
            <BODY><DESC><TDL>
            <TDLMESSAGE><COLLECTION NAME="AllGroups"><TYPE>Group</TYPE><FETCH>GUID, MASTERID, ALTERID, NAME, PARENT, ISREVENUE</FETCH></COLLECTION></TDLMESSAGE>
            </TDL></DESC></BODY>
        </ENVELOPE>`
    });

    // Parse XML and extract group data
    const tallyGroups = [
        {
            cmpId: companyId,
            userId: currentUser.userId,
            grpName: "Group Name",
            guid: "uuid",
            masterId: 1,
            alterId: 0,
            grpParent: "Primary",
            isRevenue: false,
            isActive: true
        }
    ];

    // Send to backend
    const authToken = sessionStorage.getItem('authToken');
    const deviceToken = sessionStorage.getItem('deviceToken');
    
    const syncResponse = await fetch(window.apiConfig.getUrl('/groups/sync'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Device-Token': deviceToken
        },
        body: JSON.stringify(tallyGroups)
    });

    return await syncResponse.json();
}
```

**Request Body (Array of Groups):**
```json
[
    {
        "cmpId": 1,
        "userId": 1,
        "grpName": "Assets",
        "guid": "uuid-1",
        "masterId": 1,
        "alterId": 0,
        "grpParent": "Primary",
        "isRevenue": false,
        "isActive": true
    },
    {
        "cmpId": 1,
        "userId": 1,
        "grpName": "Liabilities",
        "guid": "uuid-2",
        "masterId": 2,
        "alterId": 0,
        "grpParent": "Primary",
        "isRevenue": false,
        "isActive": true
    }
]
```

### 14. Update Group
**Endpoint:** `PUT /groups/{id}`

```javascript
async updateGroup(groupId, groupData) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(groupData)
    });
    return await response.json();
}
```

### 15. Delete Group (Soft)
**Endpoint:** `DELETE /groups/{id}`

```javascript
async deleteGroup(groupId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
        method: 'DELETE',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

### 16. Hard Delete Group
**Endpoint:** `DELETE /groups/{id}/hard`

```javascript
async hardDeleteGroup(groupId) {
    const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}/hard`), {
        method: 'DELETE',
        headers: this.getHeaders()
    });
    return await response.json();
}
```

---

## Ledgers APIs

### 1. Get All Ledgers
**Endpoint:** `GET /ledgers`

```javascript
// File: src/renderer/services/api.js

static getLedgers() {
    return this.get('/ledgers');
}
```

### 2. Get Ledger by ID
**Endpoint:** `GET /ledgers/{id}`

```javascript
static getLedgerById(id) {
    return this.get(`/ledgers/${id}`);
}
```

### 3. Get Ledgers by Group
**Endpoint:** `GET /ledgers/group/{groupId}`

```javascript
static getLedgersByGroup(groupId) {
    return this.get(`/ledgers/group/${groupId}`);
}
```

### 4. Create Ledger
**Endpoint:** `POST /ledgers`

```javascript
static createLedger(ledger) {
    return this.post('/ledgers', ledger);
}
```

**Request Body:**
```json
{
    "cmpId": 1,
    "lgdName": "Sales Account",
    "lgdGuid": "uuid",
    "lgdParent": "Revenue",
    "lgdAliasName": "Sales",
    "lgdOpeningBalance": 0,
    "lgdBalanceAsOn": "2025-01-27",
    "lgdBankAccountNumber": null,
    "lgdIfscCode": null,
    "isActive": true,
    "userId": 1
}
```

### 5. Update Ledger
**Endpoint:** `PUT /ledgers/{id}`

```javascript
static updateLedger(id, ledger) {
    return this.put(`/ledgers/${id}`, ledger);
}
```

### 6. Delete Ledger
**Endpoint:** `DELETE /ledgers/{id}`

```javascript
static deleteLedger(id) {
    return this.delete(`/ledgers/${id}`);
}
```

### 7. Get Total Balance
**Endpoint:** `GET /ledgers/total/balance`

```javascript
static getTotalBalance() {
    return this.get('/ledgers/total/balance');
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "totalBalance": 1500000,
        "currency": "INR"
    }
}
```

---

## Vouchers APIs

### 1. Get All Vouchers
**Endpoint:** `GET /vouchers`

```javascript
static getVouchers() {
    return this.get('/vouchers');
}
```

### 2. Get Voucher by ID
**Endpoint:** `GET /vouchers/{id}`

```javascript
static getVoucherById(id) {
    return this.get(`/vouchers/${id}`);
}
```

### 3. Get Vouchers by Type
**Endpoint:** `GET /vouchers/type/{type}`

```javascript
static getVouchersByType(type) {
    return this.get(`/vouchers/type/${type}`);
}
```

### 4. Get Vouchers by Date
**Endpoint:** `GET /vouchers/date/{date}`

```javascript
static getVouchersByDate(date) {
    return this.get(`/vouchers/date/${date}`);
}
```

### 5. Create Voucher
**Endpoint:** `POST /vouchers`

```javascript
static createVoucher(voucher) {
    return this.post('/vouchers', voucher);
}
```

**Request Body:**
```json
{
    "cmpId": 1,
    "vchType": "JV",
    "vchNumber": "001",
    "vchDate": "2025-01-27",
    "vchAmount": 10000,
    "vchNarration": "Purchase of office supplies",
    "vchReference": "INV-001",
    "isVoided": false,
    "userId": 1
}
```

### 6. Update Voucher
**Endpoint:** `PUT /vouchers/{id}`

```javascript
static updateVoucher(id, voucher) {
    return this.put(`/vouchers/${id}`, voucher);
}
```

### 7. Delete Voucher
**Endpoint:** `DELETE /vouchers/{id}`

```javascript
static deleteVoucher(id) {
    return this.delete(`/vouchers/${id}`);
}
```

### 8. Get Total Voucher Amount
**Endpoint:** `GET /vouchers/total/amount`

```javascript
static getTotalVoucherAmount() {
    return this.get('/vouchers/total/amount');
}
```

---

## Items & Units APIs

### 1. Get All Items
**Endpoint:** `GET /items`

```javascript
static getItems() {
    return this.get('/items');
}
```

### 2. Get Item by ID
**Endpoint:** `GET /items/{id}`

```javascript
static getItemById(id) {
    return this.get(`/items/${id}`);
}
```

### 3. Create Item
**Endpoint:** `POST /items`

```javascript
static createItem(item) {
    return this.post('/items', item);
}
```

### 4. Get All Units
**Endpoint:** `GET /units`

```javascript
static getUnits() {
    return this.get('/units');
}
```

### 5. Create Unit
**Endpoint:** `POST /units`

```javascript
static createUnit(unit) {
    return this.post('/units', unit);
}
```

---

## Masters APIs

### Accounts (Chart of Accounts)
```javascript
static getAccounts() {
    return this.get('/masters/accounts');
}

static getAccountById(id) {
    return this.get(`/masters/accounts/${id}`);
}

static createAccount(account) {
    return this.post('/masters/accounts', account);
}

static updateAccount(id, account) {
    return this.put(`/masters/accounts/${id}`, account);
}

static deleteAccount(id) {
    return this.delete(`/masters/accounts/${id}`);
}
```

### Cost Centers
```javascript
static getCostCenters() {
    return this.get('/masters/cost-centers');
}

static getCostCenterById(id) {
    return this.get(`/masters/cost-centers/${id}`);
}

static createCostCenter(costCenter) {
    return this.post('/masters/cost-centers', costCenter);
}
```

---

## Sync APIs

### 1. Trigger Full Master Sync
**Endpoint:** `POST /sync/master-data` (or via Electron IPC)

```javascript
// File: src/main/sync-handler.js

// Electron IPC Handler
ipcMain.handle('sync-master-data', async (event, params) => {
    const {
        companyName,
        cmpId,
        userId,
        tallyPort = 9000,
        backendUrl = process.env.BACKEND_URL,
        authToken,
        deviceToken
    } = params;

    // Spawn Python subprocess
    const python = spawn(pythonExe, [
        pythonScript,
        companyName,
        cmpId.toString(),
        userId.toString(),
        tallyPort.toString(),
        backendUrl,
        authToken || '',
        deviceToken || ''
    ]);

    return await executeSync(python);
});
```

**Called from UI:**
```javascript
// File: src/renderer/pages/company-sync.js

async syncCompanyGroups(company, button) {
    // Validate license
    if (window.LicenseValidator) {
        const isValid = await window.LicenseValidator.validateAndNotify(userLicense, tallyPort);
        if (!isValid) return;
    }

    // Check if sync in progress
    if (window.syncStateManager?.isSyncInProgress()) {
        window.notificationService.warning('Another sync is in progress');
        return;
    }

    isSyncing = true;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const authToken = localStorage.getItem('authToken');
    const deviceToken = localStorage.getItem('deviceToken');

    // Call Electron IPC
    const result = await window.electronAPI.invoke('sync-master-data', {
        companyName: company.name,
        cmpId: company.id,
        userId: currentUser.userId,
        tallyPort: appSettings.tallyPort || 9000,
        backendUrl: window.apiConfig.baseURL,
        authToken: authToken,
        deviceToken: deviceToken
    });

    return result;
}
```

**Python Sync Script Response:**
```json
{
    "success": true,
    "results": {
        "groups": 50,
        "ledgers": 200,
        "items": 1500,
        "units": 20,
        "voucherTypes": 10,
        "totalRecords": 1780
    },
    "log_file": "/path/to/sync_logs/company_1_2025-01-27.log"
}
```

### 2. Get Master Data for Company
**Endpoint:** `GET /companies/{id}/master-data`

```javascript
async getMasterDataForCompany(companyId) {
    const headers = window.authService.getHeaders();
    const response = await fetch(window.apiConfig.getUrl(`/companies/${companyId}/master-data`), {
        method: 'GET',
        headers: headers
    });
    return await response.json();
}
```

---

## Import Company APIs

### 1. Fetch Companies from Tally (Electron IPC)
**Endpoint:** Electron IPC `invoke('fetch-companies')`

```javascript
// File: src/renderer/pages/import-company.js

async fetchTallyCompanies() {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const tallyPort = appSettings.tallyPort || 9000;

    if (window.electronAPI && window.electronAPI.invoke) {
        const result = await window.electronAPI.invoke('fetch-companies', { tallyPort });

        if (result.success && Array.isArray(result.data)) {
            tallyCompanies = result.data;
            await displayCompanies(tallyCompanies);
            showStatus(`✅ Found ${tallyCompanies.length} companies in Tally`, 'success');
        } else {
            throw new Error(result.error || 'Failed to fetch companies');
        }
    }
}
```

**Returns:**
```json
{
    "success": true,
    "data": [
        {
            "name": "ABC Corporation",
            "code": "ABC",
            "guid": "550e8400-e29b-41d4-a716-446655440000",
            "state": "Maharashtra",
            "email": "info@abc.com",
            "phoneNumber": "9876543210",
            ...56 fields total...
        }
    ]
}
```

### 2. Import Selected Companies
**Endpoint:** `POST /companies` (for each selected company)

```javascript
// File: src/renderer/pages/import-company.js

async importSelectedCompanies() {
    const importProgress = document.getElementById('importProgress');
    importProgress.style.display = 'block';

    for (const company of selectedCompanies) {
        try {
            // Send company data to backend
            const result = await sendCompanyToBackend(company);

            if (result.success) {
                // Sync groups for this company
                await syncGroupsForCompany(result.backendId, company);
                addImportLog(`✅ ${company.name} imported successfully`, 'success');
            } else {
                addImportLog(`❌ Failed to import ${company.name}: ${result.error}`, 'error');
            }
        } catch (error) {
            addImportLog(`❌ Error importing ${company.name}: ${error.message}`, 'error');
        }
    }
}
```

---

## Response Formats

### Success Response
```json
{
    "success": true,
    "data": { /* ... */ },
    "message": "Operation completed successfully"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error message",
    "message": "User-friendly message",
    "details": {
        "fieldName": "Field-specific error message"
    }
}
```

### Paginated Response (if applicable)
```json
{
    "success": true,
    "data": [ /* ... */ ],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "totalRecords": 150,
        "totalPages": 8
    }
}
```

### List Response
```json
{
    "success": true,
    "data": [
        { /* item 1 */ },
        { /* item 2 */ }
    ],
    "count": 2
}
```

---

## Error Handling

### Common HTTP Status Codes
- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Token expired or invalid
- **403 Forbidden** - Access denied
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Server maintenance

### Retry Logic
```javascript
// API Service automatically retries on:
// - Network timeouts
// - 5xx errors
// - Connection errors

// Does NOT retry on:
// - 401 Unauthorized
// - 403 Forbidden
// - 404 Not Found
// - Invalid request

// Max retries: 3
// Retry delay: 1000ms * attempt_number
```

### Session Management
```javascript
// Automatic session handling:
// 1. If 401 detected, clear auth data
// 2. Redirect to login page
// 3. Show: "Session Expired - Logged in from another device"
// 4. Force reload after 2 seconds
```

---

## Best Practices

### 1. Always Include Headers
```javascript
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'X-Device-Token': deviceToken,
    'X-CSRF-Token': csrfToken
};
```

### 2. Error Handling
```javascript
try {
    const result = await ApiService.get('/endpoint');
    if (!result.success) {
        console.error('API Error:', result.error);
        showErrorNotification(result.error);
        return;
    }
    // Process result.data
} catch (error) {
    console.error('Unexpected error:', error);
    showErrorNotification('An unexpected error occurred');
}
```

### 3. Loading States
```javascript
// Show loader before request
showLoader(true);

try {
    const result = await ApiService.post('/endpoint', data);
    // Handle result
} finally {
    // Hide loader after request completes
    showLoader(false);
}
```

### 4. Authentication Check
```javascript
if (!window.authService.isAuthenticated()) {
    window.location.hash = '#auth';
    return;
}

const headers = window.authService.getHeaders();
```

---

## Environment Configuration

### .env File
```env
BACKEND_URL=http://3.80.124.37:8080
API_TIMEOUT=10000
MAX_RETRIES=3
```

### config/upgrade-config.js
```javascript
window.AppConfig = {
    API_BASE_URL: 'http://3.80.124.37:8080',
    TIMEOUT_MS: 10000,
    MAX_RETRIES: 3
};
```

---

**Last Updated:** January 27, 2026
**Version:** 1.0.0
