# Tally XML Request Formats

This document contains all XML request formats used to fetch data from Tally Prime ERP.

## 1. Fetch License Information

**Function**: Get Tally license number, version, and system info
**Endpoint**: POST http://localhost:9000/
**Python Method**: `client.get_license_info()`

### Request XML

```xml
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Function</TYPE>
<ID>$$LicenseInfo</ID>
</HEADER>
<BODY>
<DESC>
<FUNCPARAMLIST>
<PARAM>Serial Number</PARAM>
</FUNCPARAMLIST>
</DESC>
</BODY>
</ENVELOPE>
```

### Response Format

```json
{
  "license_number": "738480645",
  "product_version": "1.1.6.2",
  "status": "active",
  "company_count": 0,
  "ledger_count": 0,
  "voucher_count": 0
}
```

### Key Elements

- **$$LicenseInfo**: Special Tally function to fetch license details
- **PARAM**: Parameter name (Serial Number)
- **Response Path**: BODY → DATA → RESULT (contains license number)

---

## 2. Fetch Companies List

**Function**: Get all companies defined in Tally
**Endpoint**: POST http://localhost:9000/
**Python Method**: `client.get_companies()`

### Request XML

```xml
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>Company</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<REPORTTYPE>Masters</REPORTTYPE>
<TALLYCOMPANYNAME></TALLYCOMPANYNAME>
<FETCH>ALL</FETCH>
</STATICVARIABLES>
<TallyOfset>0</TallyOfset>
<PAGECONTEXT>
<PAGE>1</PAGE>
<PAGESIZE>100</PAGESIZE>
</PAGECONTEXT>
</DESC>
</BODY>
</ENVELOPE>
```

### Response Format

```json
[
  {
    "code": "DEF",
    "name": "Default Company",
    "guid": "00000000-0000-0000-0000-000000000001",
    "businessType": "General Business"
  },
  {
    "code": "MFG",
    "name": "Manufacturing Co Ltd",
    "guid": "00000000-0000-0000-0000-000000000002",
    "businessType": "Manufacturing"
  }
]
```

### Key Elements

- **TYPE**: Collection (for fetching lists)
- **ID**: Company (entity type to fetch)
- **REPORTTYPE**: Masters (fetch master data)
- **FETCH**: ALL (fetch all records)
- **PAGESIZE**: 100 (max records per page)
- **Response Path**: BODY → DESC → TALLYMESSAGE → COMPANY (array of companies)

---

## 3. Generic Function Request Template

For other functions that accept parameters:

```xml
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Function</TYPE>
<ID>[FUNCTION_ID]</ID>
</HEADER>
<BODY>
<DESC>
<FUNCPARAMLIST>
<PARAM>
<NAME>[PARAM_NAME]</NAME>
<VALUE>[PARAM_VALUE]</VALUE>
</PARAM>
</FUNCPARAMLIST>
</DESC>
</BODY>
</ENVELOPE>
```

### Parameters

| Component | Value | Description |
|-----------|-------|-------------|
| VERSION | 1 | API version |
| TALLYREQUEST | Export | Request type (Export/Import/Report) |
| TYPE | Function/Collection | Type of request |
| ID | Function ID | e.g., $$LicenseInfo, $$Masters.Company, Company |
| REPORTTYPE | Masters/Report | Data category |
| FETCH | ALL/FIRST | How many records |
| PAGESIZE | 100 | Max records per request |

---

## 4. Common Tally Function IDs

| Function ID | Description | Type |
|------------|-------------|------|
| $$LicenseInfo | License information | Function |
| $$Masters.Company | Company list | Function |
| $$Masters.Ledger | Ledger list | Function |
| $$Masters.Item | Item/Product list | Function |
| $$Masters.Group | Ledger groups | Function |
| Company | Companies collection | Collection |
| Ledger | Ledgers collection | Collection |
| Item | Items collection | Collection |

---

## 5. Error Handling

### Connection Errors

```python
# Caught by send_request()
- requests.exceptions.ConnectionError
- requests.exceptions.Timeout
- requests.exceptions.RequestException
```

### Parsing Errors

```python
# Caught by parse_response() and _extract_*() methods
- ElementTree parsing errors
- Missing expected XML elements
- Type conversion errors
```

### Fallback Behavior

When actual Tally data cannot be fetched:
- `get_companies()` → Returns 4 mock companies
- `get_license_info()` → Returns mock license data
- Other functions → Return error message

---

## 6. Integration Points

### Frontend (Electron + React)

```javascript
// Fetch companies via IPC
const result = await window.electronAPI.fetchCompanies();

// Result structure
{
  success: true,
  data: [/* companies array */],
  error: null
}
```

### Backend (Python)

```python
client = TallyAPIClient(host='localhost', port=9000, timeout=10)
success, result = client.get_companies()

if success:
    print(result)  # List of companies
else:
    print(result.get('error'))  # Error message
```

### Main Process (Electron)

```javascript
ipcMain.handle("fetch-companies", async () => {
  // Spawns Python subprocess to call get_companies()
  // Returns JSON response via stdout
  return { success: true, data: [...] }
});
```

---

## 7. Testing Commands

### Test License Fetch

```bash
cd c:\Users\HP\DesktopApp\python
python -c "
from tally_api import TallyAPIClient
import json
client = TallyAPIClient()
success, result = client.get_license_info()
print(json.dumps(result, indent=2))
"
```

### Test Company Fetch

```bash
cd c:\Users\HP\DesktopApp\python
python -c "
from tally_api import TallyAPIClient
import json
client = TallyAPIClient()
success, result = client.get_companies()
print(json.dumps(result, indent=2))
"
```

---

## 8. Tally Server Configuration

- **Default Host**: localhost
- **Default Port**: 9000
- **Protocol**: HTTP
- **Method**: POST
- **Content-Type**: text/xml
- **Timeout**: 10 seconds (configurable)

---

## 9. Response XML Structure (Example)

```xml
<ENVELOPE>
<BODY>
<DESC>
<CMPINFO>
<COMPANY>0</COMPANY>
<GROUP>0</GROUP>
<LEDGER>0</LEDGER>
</CMPINFO>
</DESC>
<DATA>
<RESULT>738480645</RESULT>
</DATA>
</BODY>
</ENVELOPE>
```

---

## 10. Updates Log

| Date | Change | Details |
|------|--------|---------|
| 2025-12-02 | Initial XML Formats | Created documentation for license and company fetch |
| 2025-12-02 | Company Request | Added Collection-type request for fetching all companies |
| 2025-12-02 | Mock Data | Added fallback mock companies when Tally unavailable |

