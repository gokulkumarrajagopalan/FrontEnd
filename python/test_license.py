#!/usr/bin/env python
"""Test license fetching"""

import requests
import json

# Test with LicenseInfo function
xml_license = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Function</TYPE><ID>$$LicenseInfo</ID></HEADER><BODY><DESC><FUNCPARAMLIST></FUNCPARAMLIST></DESC></BODY></ENVELOPE>'

# Test with SystemInfo function
xml_system = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Function</TYPE><ID>$$SystemInfo</ID></HEADER><BODY><DESC><FUNCPARAMLIST></FUNCPARAMLIST></DESC></BODY></ENVELOPE>'

# Test with Masters.Company to get list of companies
xml_companies = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Function</TYPE><ID>$$Masters.Company</ID></HEADER><BODY><DESC><FUNCPARAMLIST></FUNCPARAMLIST></DESC></BODY></ENVELOPE>'

print("=" * 60)
print("Testing $$LicenseInfo")
print("=" * 60)
try:
    response = requests.post('http://localhost:9000', data=xml_license, headers={'Content-Type': 'text/xml'}, timeout=5)
    print('Status:', response.status_code)
    print('Response:')
    print(response.text[:1000])
except Exception as e:
    print('Error:', str(e))

print("\n" + "=" * 60)
print("Testing $$SystemInfo")
print("=" * 60)
try:
    response = requests.post('http://localhost:9000', data=xml_system, headers={'Content-Type': 'text/xml'}, timeout=5)
    print('Status:', response.status_code)
    print('Response:')
    print(response.text[:1000])
except Exception as e:
    print('Error:', str(e))

print("\n" + "=" * 60)
print("Testing $$Masters.Company")
print("=" * 60)
try:
    response = requests.post('http://localhost:9000', data=xml_companies, headers={'Content-Type': 'text/xml'}, timeout=5)
    print('Status:', response.status_code)
    print('Response:')
    print(response.text[:1000])
except Exception as e:
    print('Error:', str(e))
