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


def clean_xml(text):
    """Remove invalid XML characters."""
    return re.sub(r'[^\x09\x0A\x0D\x20-\x7E\x80-\xFF\u0100-\uFFFF]', '', text)


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
        <SVCOMPANY>{company_name}</SVCOMPANY>
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

        results = {}

        for report_name, report_type in [('Bills Receivable', 'receivable'), ('Bills Payable', 'payable')]:
            logger.info(f"Fetching {report_name} from Tally...")
            bills = fetch_bills_from_tally(tally_url, company_name, report_name)
            logger.info(f"  -> {len(bills)} bills fetched")

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
