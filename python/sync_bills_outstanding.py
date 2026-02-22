#!/usr/bin/env python3
"""
Bills Outstanding Sync — Fetch from Tally's built-in reports and push to Backend.

This is the missing link: Tally dashboard shows SUM of individual pending bills,
NOT net ledger closing balance. Without this sync, the backend falls back to
voucher-based computation which gives wrong Receivables/Payables totals.

Usage:
    python sync_bills_outstanding.py <company_id> <tally_port> <backend_url> <auth_token> <device_token> <company_name>
"""

import requests
import json
import logging
import sys
import re
import os
import xml.etree.ElementTree as ET
from datetime import datetime

# Setup logging
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(levelname)s - %(message)s' if VERBOSE_MODE else '%(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def verify_tally_company(tally_url, expected_company_name):
    """Verify that the expected company is loaded/open in Tally Prime.
    
    Tally's XML API silently returns data from the currently active company
    if the requested company (via SVCOMPANY/SVCURRENTCOMPANY) is not loaded.
    This pre-flight check prevents syncing wrong data with wrong company IDs.
    
    Returns: (is_loaded: bool, active_companies: list[str])
    """
    xml_req = """<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>List of Companies</REPORTNAME>
    <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""

    try:
        resp = requests.post(tally_url, data=xml_req.encode('utf-8'),
                             headers={'Content-Type': 'application/xml'},
                             timeout=10)
        if resp.status_code != 200:
            logger.warning(f"⚠️ Could not verify Tally companies (HTTP {resp.status_code})")
            return True, []  # Fail-open: proceed if we can't verify

        text = clean_xml(resp.text)
        root = ET.fromstring(text)
        
        # Extract all company names from Tally's response
        companies = []
        for elem in root.iter('COMPANY'):
            name = elem.findtext('NAME') or elem.get('NAME', '')
            if name:
                companies.append(name.strip())
        
        # Also check SVCURRENTCOMPANY in TALLYMESSAGE
        for elem in root.iter('TALLYMESSAGE'):
            for child in elem:
                if child.tag == 'COMPANY':
                    name = child.get('NAME', '') or child.text or ''
                    if name.strip() and name.strip() not in companies:
                        companies.append(name.strip())

        if not companies:
            # Fallback: try finding company names in any text node
            for elem in root.iter():
                if elem.text and expected_company_name.lower() in elem.text.lower():
                    logger.info(f"✅ Found company reference in Tally response")
                    return True, [expected_company_name]
            logger.warning(f"⚠️ Could not parse company list from Tally (empty)")
            return True, []  # Fail-open

        # Check if expected company is loaded (case-insensitive match)
        expected_lower = expected_company_name.strip().lower()
        for company in companies:
            if company.lower() == expected_lower:
                logger.info(f"✅ Company '{expected_company_name}' is loaded in Tally")
                return True, companies
        
        # Fuzzy match: check for partial/substring matches
        for company in companies:
            if expected_lower in company.lower() or company.lower() in expected_lower:
                logger.warning(f"⚠️ Partial company name match: expected='{expected_company_name}', found='{company}'")
                logger.warning(f"⚠️ Please ensure company names match exactly between app and Tally")
                return True, companies  # Allow partial match with warning
        
        logger.error(f"❌ Company '{expected_company_name}' is NOT loaded in Tally!")
        logger.error(f"   Loaded companies: {companies}")
        logger.error(f"   Tally will return data from the wrong company.")
        return False, companies

    except requests.exceptions.ConnectionError:
        logger.error(f"❌ Cannot connect to Tally at {tally_url}")
        return False, []
    except Exception as e:
        logger.warning(f"⚠️ Error verifying Tally company: {e}")
        return True, []  # Fail-open on unexpected errors


def parse_tally_date(date_str):
    """Convert Tally date formats (yyyyMMdd, dd-MMM-yyyy, etc.) to ISO yyyy-MM-dd."""
    if not date_str:
        return None
    date_str = date_str.strip()
    if not date_str:
        return None
    for fmt in ('%Y%m%d', '%d-%b-%Y', '%d-%B-%Y', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def clean_xml(xml_string):
    """Remove invalid XML characters and strip namespace prefixes (e.g. UDF:)"""
    # Strip namespace prefixes like <UDF:FIELD> → <UDF_FIELD>
    xml_string = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', xml_string)
    # Remove invalid XML character entities that are non-printable
    return re.sub(
        r'&#([0-9]+);',
        lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
        xml_string
    )


def fetch_bills_from_tally(tally_url, company_name, report_name):
    """Fetch bill-wise outstanding using Tally's built-in report export.
    
    report_name: 'Bills Receivable' or 'Bills Payable'
    Returns list of bill dicts.
    """
    xml_req = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>{report_name}</REPORTNAME>
    <STATICVARIABLES>
        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""

    try:
        resp = requests.post(tally_url, data=xml_req.encode('utf-8'),
                             headers={'Content-Type': 'application/xml'},
                             timeout=30)
        if resp.status_code != 200:
            logger.error(f"Tally returned {resp.status_code} for {report_name}")
            return []

        text = clean_xml(resp.text)
        root = ET.fromstring(text)
        elements = list(root)
        bills = []
        i = 0
        while i < len(elements):
            el = elements[i]
            if el.tag == 'BILLFIXED':
                bill_date = (el.findtext('BILLDATE') or '').strip()
                bill_ref = (el.findtext('BILLREF') or '').strip()
                bill_party = (el.findtext('BILLPARTY') or '').strip()
                bill_party = ' '.join(bill_party.split())  # normalize whitespace

                bill_cl = 0.0
                bill_due = ''
                bill_overdue = 0
                credit_period = ''

                j = i + 1
                while j < len(elements) and elements[j].tag != 'BILLFIXED':
                    tag = elements[j].tag
                    txt = (elements[j].text or '').strip()
                    if tag == 'BILLCL':
                        try:
                            bill_cl = float(txt.replace(',', ''))
                        except (ValueError, TypeError):
                            bill_cl = 0.0
                    elif tag == 'BILLDUE':
                        bill_due = txt
                    elif tag == 'BILLOVERDUE':
                        try:
                            bill_overdue = int(''.join(c for c in txt if c.isdigit() or c == '-')) if txt else 0
                        except ValueError:
                            bill_overdue = 0
                    elif tag == 'BILLCREDITPERIOD':
                        credit_period = txt
                    j += 1

                pending = abs(bill_cl)
                if pending > 0.001:
                    bills.append({
                        'partyName': bill_party,
                        'billRef': bill_ref,
                        'billDate': parse_tally_date(bill_date),
                        'pendingAmount': round(pending, 2),
                        'drCr': 'Dr' if bill_cl < 0 else 'Cr',
                        'dueDate': parse_tally_date(bill_due),
                        'overdueDays': bill_overdue,
                        'creditPeriod': credit_period
                    })
                i = j
            else:
                i += 1

        return bills
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to Tally at {tally_url}")
        return []
    except Exception as e:
        logger.error(f"Error fetching {report_name}: {e}")
        return []


def push_to_backend(backend_url, headers, company_id, report_type, bills):
    """Push bill data to backend's /bills-outstanding/sync endpoint."""
    payload = {
        'cmpId': company_id,
        'reportType': report_type,
        'bills': bills
    }
    try:
        resp = requests.post(
            f"{backend_url}/bills-outstanding/sync",
            json=payload,
            headers=headers,
            timeout=30
        )
        if resp.status_code == 200:
            result = resp.json()
            return True, result.get('count', len(bills))
        else:
            logger.error(f"Backend returned {resp.status_code}: {resp.text[:200]}")
            return False, 0
    except Exception as e:
        logger.error(f"Error pushing {report_type} to backend: {e}")
        return False, 0


def main():
    """Main entry point — called by Electron via spawn."""
    try:
        # Parse positional arguments (same pattern as sync_vouchers.py)
        company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
        tally_port = int(sys.argv[2]) if len(sys.argv) > 2 else 9000
        backend_url = (sys.argv[3] if len(sys.argv) > 3 else os.getenv('BACKEND_URL', '')).rstrip('/')
        auth_token = sys.argv[4] if len(sys.argv) > 4 else ''
        device_token = sys.argv[5] if len(sys.argv) > 5 else ''
        company_name = sys.argv[6] if len(sys.argv) > 6 else ''

        tally_url = f"http://localhost:{tally_port}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}' if auth_token else '',
            'X-Device-Token': device_token or ''
        }

        logger.info(f"Bills Outstanding Sync: company={company_name} (ID={company_id}), tally={tally_url}")

        # Pre-flight check: verify company is loaded in Tally
        if company_name:
            is_loaded, loaded_companies = verify_tally_company(tally_url, company_name)
            if not is_loaded:
                error_msg = (f"Company '{company_name}' is not loaded in Tally. "
                            f"Loaded companies: {loaded_companies}. "
                            f"Aborting sync to prevent data mismatch.")
                logger.error(error_msg)
                print(json.dumps({'success': False, 'message': error_msg}))
                return
        else:
            logger.warning("⚠️ No company name provided — cannot verify Tally company context")

        results = {}

        for report_name, report_type in [('Bills Receivable', 'receivable'), ('Bills Payable', 'payable')]:
            logger.info(f"Fetching {report_name} for '{company_name}' (forcing context)...")
            bills = fetch_bills_from_tally(tally_url, company_name, report_name)
            logger.info(f"  -> {len(bills)} {report_type} bills fetched from Tally")

            if bills:
                total = sum(b['pendingAmount'] for b in bills)
                logger.info(f"  -> Total {report_type}: {total:,.2f}")

                success, count = push_to_backend(backend_url, headers, company_id, report_type, bills)
                results[report_type] = {
                    'success': success,
                    'billCount': len(bills),
                    'savedCount': count,
                    'total': round(total, 2)
                }
            else:
                # No bills — clear existing data by sending empty list
                push_to_backend(backend_url, headers, company_id, report_type, [])
                results[report_type] = {
                    'success': True,
                    'billCount': 0,
                    'savedCount': 0,
                    'total': 0
                }

        all_success = all(r['success'] for r in results.values())
        print(json.dumps({
            'success': all_success,
            'message': 'Bills outstanding synced from Tally' if all_success else 'Partial failure',
            'receivable': results.get('receivable', {}),
            'payable': results.get('payable', {}),
        }))

    except Exception as e:
        logger.error(f"Bills outstanding sync error: {e}")
        print(json.dumps({'success': False, 'message': str(e)}))


if __name__ == '__main__':
    main()
