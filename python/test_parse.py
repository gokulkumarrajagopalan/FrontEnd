#!/usr/bin/env python
"""Test XML parsing"""

from tally_api import TallyAPIClient
import json

# Test the actual response
client = TallyAPIClient(host='localhost', port=9000, timeout=10)

# Send the request directly
xml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Function</TYPE><ID>$$LicenseInfo</ID></HEADER><BODY><DESC><FUNCPARAMLIST><PARAM>Serial Number</PARAM></FUNCPARAMLIST></DESC></BODY></ENVELOPE>"

import requests
response = requests.post('http://localhost:9000', data=xml, headers={'Content-Type': 'text/xml'}, timeout=10)

print("Raw Response:")
print(response.text[:1500])
print("\n" + "=" * 60 + "\n")

# Parse it
parsed = client.parse_response(response.text)
print("Parsed Response Structure:")
print(json.dumps(parsed, indent=2)[:2000])
print("\n" + "=" * 60 + "\n")

# Check specific paths
print("DESC:", parsed.get("DESC", {}).keys() if isinstance(parsed.get("DESC", {}), dict) else type(parsed.get("DESC")))
desc = parsed.get("DESC", {})
print("DESC keys:", desc.keys() if isinstance(desc, dict) else "Not a dict")

if isinstance(desc, dict):
    print("\nCMPINFO:", desc.get("CMPINFO", {}).keys() if isinstance(desc.get("CMPINFO", {}), dict) else type(desc.get("CMPINFO")))
    print("DATA:", desc.get("DATA", {}).keys() if isinstance(desc.get("DATA", {}), dict) else type(desc.get("DATA")))
    
    # Check DATA for RESULT
    data = desc.get("DATA", {})
    if isinstance(data, dict):
        print("DATA contents:", data)
