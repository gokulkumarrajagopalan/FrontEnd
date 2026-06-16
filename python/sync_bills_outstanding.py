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

from sync_logger import get_sync_logger

# Setup logging
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

if not logger.handlers:
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s' if VERBOSE_MODE else '%(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))
    logger.addHandler(console_handler)
    # Use global file logger
    global_logger = get_sync_logger()
    logger.handlers.extend(global_logger.handlers)


def verify_tally_company(tally_url, expected_company_name):
    """Verify that the expected company is loaded/open in Tally Prime.
    
    Tally's XML API silently returns data from the currently active company
    if the requested company (via SVCOMPANY/SVCURRENTCOMPANY) is not loaded.
    This pre-flight check prevents syncing wrong data with wrong company IDs.
    
    Returns: (is_loaded: bool, matched_name: str|None, active_companies: list[str])
        matched_name is Tally's EXACT company name on an exact match; the caller
        should use it for SVCURRENTCOMPANY so Tally targets the right company.
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
            return True, None, []  # Fail-open: cannot determine, don't block

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
            logger.warning(f"⚠️ Could not parse company list from Tally (empty)")
            return True, None, []  # Fail-open: cannot read the list

        # STRICT exact match only. A partial/substring match is NOT acceptable:
        # Tally would silently fall back to the active company and we'd persist the
        # wrong company's bills under this company's ID.
        expected_lower = expected_company_name.strip().lower()
        for company in companies:
            if company.strip().lower() == expected_lower:
                logger.info(f"✅ Company '{expected_company_name}' is loaded in Tally (exact match: '{company}')")
                return True, company, companies

        logger.error(f"❌ Company '{expected_company_name}' is NOT loaded in Tally!")
        logger.error(f"   Loaded companies: {companies}")
        logger.error(f"   Tally would return data from the wrong company — aborting.")
        return False, None, companies

    except requests.exceptions.ConnectionError:
        logger.error(f"❌ Cannot connect to Tally at {tally_url}")
        return False, None, []
    except Exception as e:
        logger.warning(f"⚠️ Error verifying Tally company: {e}")
        return True, None, []  # Fail-open on unexpected errors


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
    from xml.sax.saxutils import escape
    escaped_company = escape(company_name) if company_name else ""
    xml_req = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>{report_name}</REPORTNAME>
    <STATICVARIABLES>
        <SVCOMPANY>{escaped_company}</SVCOMPANY>
        <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>
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
        tally_host = sys.argv[2] if len(sys.argv) > 2 else 'localhost'
        tally_port = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
        backend_url = (sys.argv[4] if len(sys.argv) > 4 else os.getenv('BACKEND_URL', '')).rstrip('/')
        auth_token = sys.argv[5] if len(sys.argv) > 5 else ''
        device_token = sys.argv[6] if len(sys.argv) > 6 else ''
        company_name = (sys.argv[7] if len(sys.argv) > 7 else '').strip()

        # Company name is mandatory: without it the request is unscoped and Tally
        # returns the active company's bills — corrupting this company's data.
        if not company_name:
            logger.error("❌ Company name is required (arg 7) — refusing to sync the active Tally company")
            print(json.dumps({'success': False, 'message': 'Company name is required', 'count': 0}))
            sys.exit(1)

        tally_url = f"http://{tally_host}:{tally_port}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}' if auth_token else '',
            'X-Device-Token': device_token or ''
        }

        logger.info(f"Bills Outstanding Sync: company={company_name} (ID={company_id}), tally={tally_url}")

        # Pre-flight check: verify company is loaded in Tally
        if company_name:
            is_loaded, matched_company_name, loaded_companies = verify_tally_company(tally_url, company_name)
            # Use Tally's EXACT company name so the bills request targets the right
            # company (Tally won't switch context on a casing/whitespace mismatch).
            if is_loaded and matched_company_name:
                company_name = matched_company_name
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
