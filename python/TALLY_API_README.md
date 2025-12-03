# Tally API Client Documentation

## Overview

The Tally API Client provides a Python interface to communicate with Tally ERP using XML-based requests. It handles encoding/decoding, request/response management, and provides convenient wrapper methods for common operations.

## Installation

### Requirements
- Python 3.6+
- requests library
- urllib3 (usually included with requests)

### Install dependencies
```bash
pip install requests
```

## Quick Start

### Basic Usage

```python
from tally_api import TallyAPIClient

# Initialize client
client = TallyAPIClient(host="localhost", port=9000)

# Get license information
success, result = client.get_license_info()
if success:
    print("License Info:", result)
else:
    print("Error:", result)

# Get companies
success, companies = client.get_companies()

# Get ledgers
success, ledgers = client.get_ledgers(company="My Company")

# Close connection
client.close()
```

## API Methods

### Core Methods

#### `send_request(xml_data: str) -> Tuple[bool, Dict]`
Send raw XML request to Tally.

```python
xml = client.build_envelope(
    request_type="Export",
    function_id="$$LicenseInfo",
    params={"Serial Number": ""}
)
success, response = client.send_request(xml)
```

#### `build_envelope(request_type, function_id, params=None, version="1") -> str`
Build Tally XML envelope.

```python
xml = client.build_envelope(
    request_type="Export",
    function_id="$$Masters.Ledger",
    params={"Company": "My Company"}
)
```

### Convenience Methods

#### `get_license_info() -> Tuple[bool, Dict]`
Get Tally license information.

```python
success, license_data = client.get_license_info()
```

#### `get_companies() -> Tuple[bool, Dict]`
Get list of companies.

```python
success, companies = client.get_companies()
```

#### `get_ledgers(company=None) -> Tuple[bool, Dict]`
Get ledgers for a company.

```python
success, ledgers = client.get_ledgers(company="My Company")
```

#### `get_items(company=None) -> Tuple[bool, Dict]`
Get items/products.

```python
success, items = client.get_items(company="My Company")
```

#### `get_groups(company=None) -> Tuple[bool, Dict]`
Get ledger groups.

```python
success, groups = client.get_groups(company="My Company")
```

#### `get_cost_centers(company=None) -> Tuple[bool, Dict]`
Get cost centers.

```python
success, cost_centers = client.get_cost_centers(company="My Company")
```

#### `get_vouchers(company=None, from_date=None, to_date=None) -> Tuple[bool, Dict]`
Get vouchers for a date range.

```python
success, vouchers = client.get_vouchers(
    company="My Company",
    from_date="01-Jan-2024",
    to_date="31-Dec-2024"
)
```

#### `get_server_info() -> Tuple[bool, Dict]`
Get Tally server information.

```python
success, server_info = client.get_server_info()
```

#### `custom_request(function_id, request_type="Export", params=None) -> Tuple[bool, Dict]`
Send custom request to Tally.

```python
success, result = client.custom_request(
    function_id="$$Masters.Company",
    request_type="Export",
    params={"Name": "My Company"}
)
```

## Example XML Envelope

### License Info Request
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
                <PARAM>
                    <NAME>Serial Number</NAME>
                    <VALUE></VALUE>
                </PARAM>
            </FUNCPARAMLIST>
        </DESC>
    </BODY>
</ENVELOPE>
```

### Response Format
```xml
<ENVELOPE>
    <HEADER>
        <RESPONSE>$$LicenseInfo</RESPONSE>
    </HEADER>
    <BODY>
        <LICENSEINFO>
            <SERIALNO>123456</SERIALNO>
            <EDITION>Professional</EDITION>
            ...
        </LICENSEINFO>
    </BODY>
</ENVELOPE>
```

## Common Tally Functions

| Function ID | Purpose | Parameters |
|---|---|---|
| `$$LicenseInfo` | Get license details | Serial Number |
| `$$Masters.Company` | Get companies | Company |
| `$$Masters.Ledger` | Get ledgers | Company |
| `$$Masters.Item` | Get items | Company |
| `$$Masters.Group` | Get ledger groups | Company |
| `$$Masters.CostCenter` | Get cost centers | Company |
| `$$Vouchers` | Get vouchers | Company, FromDate, ToDate |
| `$$SystemInfo` | Get system information | - |

## Error Handling

```python
from tally_api import TallyAPIClient

client = TallyAPIClient(host="localhost", port=9000)

success, result = client.get_companies()

if success:
    print("Companies retrieved:", result)
else:
    # Handle error
    error = result.get("error")
    details = result.get("details")
    print(f"Error: {error} - {details}")
```

## Exception Handling

```python
try:
    success, result = client.get_ledgers(company="My Company")
    if not success:
        print(f"Error: {result}")
except Exception as e:
    print(f"Exception: {e}")
finally:
    client.close()
```

## Response Parsing

Responses are automatically parsed from XML to Python dictionaries:

```python
success, result = client.get_companies()

# Access nested data
for key, value in result.items():
    print(f"{key}: {value}")

# JSON representation
import json
print(json.dumps(result, indent=2))
```

## Advanced Usage

### Custom Parameters
```python
success, result = client.custom_request(
    function_id="$$Masters.Ledger",
    request_type="Export",
    params={
        "Company": "My Company",
        "FilterName": "Ledger Group",
        "FilterValue": "Assets"
    }
)
```

### Connection Management
```python
# Reuse connection for multiple requests
client = TallyAPIClient(host="localhost", port=9000, timeout=10)

# Make multiple requests
for company in companies:
    success, ledgers = client.get_ledgers(company=company)
    if success:
        process_ledgers(ledgers)

# Close connection when done
client.close()
```

### Logging
```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

client = TallyAPIClient(host="localhost", port=9000)
success, result = client.get_license_info()
# Logs will show request/response details
```

## Troubleshooting

### Connection Failed
- Ensure Tally is running on the specified host:port
- Check firewall settings
- Verify host and port configuration

### Invalid XML Response
- Ensure Tally server is properly configured for XML requests
- Check Tally server logs for errors
- Verify function_id is valid

### Timeout Errors
- Increase timeout value in client initialization
- Check network connectivity
- Reduce data volume if fetching large datasets

## Testing

Run the included test script:

```bash
python test_tally_api.py
```

This will test various Tally functions and report results.

## Integration with Sync Worker

The Tally API client is integrated with the sync_worker.py:

```python
from sync_worker import SyncWorker

worker = SyncWorker()
worker.initialize_tally_client()

# Fetch specific data
license_info = worker.fetch_license_info()
companies = worker.fetch_companies()
ledgers = worker.fetch_ledgers(company="My Company")
```

## License

This implementation is designed for use with Tally ERP solutions.

## References

- Tally API Documentation
- XML Envelope Specification
- HTTP Request Format for Tally
