#!/usr/bin/env python3
"""
Tally Report Generator for HSP IT SOLUTIONS
============================================
Pulls all master data (Groups, Ledgers, Voucher Types) and Vouchers from Tally,
exports to Excel/CSV, and generates financial reports:
  - Sales Report
  - Purchase Report
  - Receipt Report
  - Receivable Report
  - Payable Report

Usage:
    python tally_report_generator.py
    python tally_report_generator.py --company "HSP IT SOLUTIONS" --port 9000
"""

import requests
import xml.etree.ElementTree as ET
import json
import re
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

try:
    import pandas as pd
except ImportError:
    print("Installing pandas...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd

# ─── Configuration ───────────────────────────────────────────────────
COMPANY_NAME = "HSP IT SOLUTIONS"
TALLY_PORT = 9000
TALLY_URL = f"http://localhost:{TALLY_PORT}"

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


# ─── XML Utilities ───────────────────────────────────────────────────

def clean_xml(xml_string: str) -> str:
    """Remove invalid XML characters and namespace prefixes"""
    xml_string = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', xml_string)
    xml_string = re.sub(
        r'&#([0-9]+);',
        lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
        xml_string
    )
    xml_string = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_string)
    return xml_string


def send_to_tally(xml_request: str) -> Optional[str]:
    """Send XML request to Tally and return response text"""
    try:
        response = requests.post(
            TALLY_URL,
            data=xml_request.encode('utf-8'),
            headers={'Content-Type': 'application/xml'},
            timeout=120
        )
        if response.status_code == 200:
            return response.text
        else:
            logger.error(f"Tally HTTP {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to Tally at {TALLY_URL}. Ensure Tally is running with ODBC enabled.")
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        return None


def get_text(elem, tag: str, default='') -> str:
    """Safely get text from XML element"""
    if elem is None:
        return default
    child = elem.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def parse_amount(value: str) -> float:
    """Parse Tally amount string to float"""
    if not value:
        return 0.0
    value = value.strip()
    # Forex: extract after '=' sign
    if '=' in value:
        after_eq = value.split('=')[-1].strip()
        cleaned = re.sub(r'[^\d.\-]', '', after_eq)
        try:
            return float(cleaned)
        except ValueError:
            pass
    cleaned = re.sub(r'[^\d.\-]', '', value.replace(',', ''))
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def parse_tally_date(date_str: str) -> Optional[str]:
    """Convert Tally date (20250612) to readable date (2025-06-12)"""
    if not date_str or len(date_str) < 8:
        return None
    try:
        return f"{date_str[0:4]}-{date_str[4:6]}-{date_str[6:8]}"
    except:
        return None


# ─── FY Date Helpers ─────────────────────────────────────────────────

def get_fy_dates() -> Tuple[str, str]:
    """Get Indian Financial Year start/end dates in Tally format"""
    now = datetime.now()
    if now.month >= 4:
        fy_start = f"01-Apr-{now.year}"
    else:
        fy_start = f"01-Apr-{now.year - 1}"
    fy_end = now.strftime('%d-%b-%Y')
    return fy_start, fy_end


# ═══════════════════════════════════════════════════════════════════════
#  FETCH MASTER DATA
# ═══════════════════════════════════════════════════════════════════════

def fetch_groups() -> List[Dict]:
    """Fetch all Groups from Tally"""
    logger.info("Fetching Groups...")
    from_date, to_date = get_fy_dates()
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllGroups</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="AllGroups" ISMODIFY="No">
        <TYPE>Group</TYPE>
        <FETCH>GUID, MASTERID, ALTERID, Name, Parent, Nature, IsRevenue, RESERVEDNAME</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    if not resp:
        return []

    groups = []
    try:
        root = ET.fromstring(clean_xml(resp))
        for elem in root.iter('GROUP'):
            name = elem.get('NAME') or get_text(elem, 'NAME')
            if not name:
                continue
            groups.append({
                'Name': name,
                'Parent': get_text(elem, 'PARENT'),
                'Nature': get_text(elem, 'NATURE'),
                'IsRevenue': get_text(elem, 'ISREVENUE'),
                'GUID': get_text(elem, 'GUID'),
                'MasterID': get_text(elem, 'MASTERID'),
                'AlterID': get_text(elem, 'ALTERID'),
            })
    except Exception as e:
        logger.error(f"Error parsing groups: {e}")
    
    logger.info(f"  -> {len(groups)} groups fetched")
    return groups


def fetch_ledgers() -> List[Dict]:
    """Fetch all Ledgers from Tally"""
    logger.info("Fetching Ledgers...")
    from_date, to_date = get_fy_dates()
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllLedgers</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="AllLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>GUID, MASTERID, ALTERID, Name, Parent, OpeningBalance, ClosingBalance, 
               LEDGERPHONE, LEDGERMOBILE, EMAIL, INCOMETAXNUMBER, LEDGSTREGDETAILS.*</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    if not resp:
        return []

    ledgers = []
    try:
        root = ET.fromstring(clean_xml(resp))
        for elem in root.iter('LEDGER'):
            name = elem.get('NAME') or get_text(elem, 'NAME')
            if not name:
                continue

            # Try to get GSTIN from nested details
            gstin = ''
            gst_list = elem.find('LEDGSTREGDETAILS.LIST')
            if gst_list is not None:
                gstin = get_text(gst_list, 'GSTIN')

            ledgers.append({
                'Name': name,
                'Parent Group': get_text(elem, 'PARENT'),
                'Opening Balance': parse_amount(get_text(elem, 'OPENINGBALANCE')),
                'Closing Balance': parse_amount(get_text(elem, 'CLOSINGBALANCE')),
                'Phone': get_text(elem, 'LEDGERPHONE'),
                'Mobile': get_text(elem, 'LEDGERMOBILE'),
                'Email': get_text(elem, 'EMAIL'),
                'PAN': get_text(elem, 'INCOMETAXNUMBER'),
                'GSTIN': gstin,
                'GUID': get_text(elem, 'GUID'),
            })
    except Exception as e:
        logger.error(f"Error parsing ledgers: {e}")
    
    logger.info(f"  -> {len(ledgers)} ledgers fetched")
    return ledgers


def fetch_voucher_types() -> List[Dict]:
    """Fetch all Voucher Types"""
    logger.info("Fetching Voucher Types...")
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllVoucherTypes</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="AllVoucherTypes" ISMODIFY="No">
        <TYPE>VoucherType</TYPE>
        <FETCH>GUID, MASTERID, ALTERID, Name, PARENT, ISACTIVE</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    if not resp:
        return []

    vtypes = []
    try:
        root = ET.fromstring(clean_xml(resp))
        for elem in root.iter('VOUCHERTYPE'):
            name = elem.get('NAME') or get_text(elem, 'NAME')
            if not name:
                continue
            vtypes.append({
                'Name': name,
                'Parent': get_text(elem, 'PARENT'),
                'IsActive': get_text(elem, 'ISACTIVE'),
                'GUID': get_text(elem, 'GUID'),
            })
    except Exception as e:
        logger.error(f"Error parsing voucher types: {e}")
    
    logger.info(f"  -> {len(vtypes)} voucher types fetched")
    return vtypes


# ═══════════════════════════════════════════════════════════════════════
#  FETCH VOUCHERS (Sales, Purchase, Receipt, Payment, Journal, etc.)
# ═══════════════════════════════════════════════════════════════════════

def _fetch_vouchers_for_period(from_dt: str, to_dt: str) -> Optional[str]:
    """Fetch vouchers XML for a specific date range"""
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllVouchers</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_dt}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_dt}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="AllVouchers" ISMODIFY="No">
        <TYPE>Voucher</TYPE>
        <FETCH>GUID, MASTERID, ALTERID, DATE, VOUCHERTYPENAME,
               VOUCHERNUMBER, PARTYLEDGERNAME, PARTYNAME,
               NARRATION, REFERENCE,
               ISOPTIONAL, ISDELETED, ISCANCELLED,
               ALLLEDGERENTRIES.LIST, ALLINVENTORYENTRIES.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="AllLedgerEntries">
        <TYPE>Voucher : AllLedgerEntries</TYPE>
        <FETCH>LEDGERNAME, AMOUNT, ISDEEMEDPOSITIVE, ISPARTYLEDGER,
               BILLALLOCATIONS.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="BillAllocations">
        <TYPE>Voucher : AllLedgerEntries : BillAllocations</TYPE>
        <FETCH>NAME, BILLTYPE, AMOUNT, BILLDATE, BILLCREDITPERIOD</FETCH>
    </COLLECTION>
    <COLLECTION NAME="AllInventoryEntries">
        <TYPE>Voucher : AllInventoryEntries</TYPE>
        <FETCH>STOCKITEMNAME, ACTUALQTY, BILLEDQTY, RATE, AMOUNT, GODOWNNAME</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""
    return send_to_tally(xml)


def _parse_voucher_xml(resp: str) -> List[Dict]:
    """Parse voucher XML response into list of dicts"""
    vouchers = []
    try:
        root = ET.fromstring(clean_xml(resp))
        for velem in root.iter('VOUCHER'):
            guid = get_text(velem, 'GUID')
            alter_id = get_text(velem, 'ALTERID')
            if not guid or alter_id == '0':
                continue
            
            voucher_type = get_text(velem, 'VOUCHERTYPENAME')
            date_raw = get_text(velem, 'DATE')
            date_str = parse_tally_date(date_raw) or date_raw
            
            # Parse ledger entries
            ledger_entries = []
            for le in velem.iter('ALLLEDGERENTRIES.LIST'):
                le_name = get_text(le, 'LEDGERNAME')
                le_amount = parse_amount(get_text(le, 'AMOUNT'))
                le_deemed = get_text(le, 'ISDEEMEDPOSITIVE')
                le_is_party = get_text(le, 'ISPARTYLEDGER')
                
                # Bill allocations
                bills = []
                for ba in le.iter('BILLALLOCATIONS.LIST'):
                    bill_name = get_text(ba, 'NAME')
                    if bill_name:
                        bills.append({
                            'BillName': bill_name,
                            'BillType': get_text(ba, 'BILLTYPE'),
                            'Amount': parse_amount(get_text(ba, 'AMOUNT')),
                            'BillDate': parse_tally_date(get_text(ba, 'BILLDATE')) or '',
                            'CreditPeriod': get_text(ba, 'BILLCREDITPERIOD'),
                        })
                
                if le_name:
                    ledger_entries.append({
                        'LedgerName': le_name,
                        'Amount': le_amount,
                        'IsDeemedPositive': le_deemed,
                        'IsPartyLedger': le_is_party,
                        'Bills': bills,
                    })
            
            # Parse inventory entries
            inventory_entries = []
            for ie in velem.iter('ALLINVENTORYENTRIES.LIST'):
                item_name = get_text(ie, 'STOCKITEMNAME')
                if item_name:
                    inventory_entries.append({
                        'StockItem': item_name,
                        'Qty': parse_amount(get_text(ie, 'ACTUALQTY')),
                        'BilledQty': parse_amount(get_text(ie, 'BILLEDQTY')),
                        'Rate': parse_amount(get_text(ie, 'RATE')),
                        'Amount': parse_amount(get_text(ie, 'AMOUNT')),
                        'Godown': get_text(ie, 'GODOWNNAME'),
                    })
            
            vouchers.append({
                'Date': date_str,
                'VoucherType': voucher_type,
                'VoucherNumber': get_text(velem, 'VOUCHERNUMBER'),
                'PartyLedger': get_text(velem, 'PARTYLEDGERNAME'),
                'PartyName': get_text(velem, 'PARTYNAME'),
                'Narration': get_text(velem, 'NARRATION'),
                'Reference': get_text(velem, 'REFERENCE'),
                'IsCancelled': get_text(velem, 'ISCANCELLED'),
                'IsDeleted': get_text(velem, 'ISDELETED'),
                'GUID': guid,
                'AlterID': alter_id,
                'LedgerEntries': ledger_entries,
                'InventoryEntries': inventory_entries,
            })
    except Exception as e:
        logger.error(f"Error parsing vouchers: {e}")
        import traceback
        traceback.print_exc()
    return vouchers


def get_monthly_ranges() -> List[Tuple[str, str]]:
    """Generate monthly date ranges for the current FY in Tally format"""
    now = datetime.now()
    if now.month >= 4:
        fy_start_year = now.year
    else:
        fy_start_year = now.year - 1
    
    ranges = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    # FY: Apr to Mar
    for m in range(4, 16):  # 4=Apr to 15=Mar(next year)
        actual_month = ((m - 1) % 12) + 1
        year = fy_start_year if m <= 12 else fy_start_year + 1
        
        start_date = datetime(year, actual_month, 1)
        if actual_month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, actual_month + 1, 1) - timedelta(days=1)
        
        # Don't go past today
        if start_date > now:
            break
        if end_date > now:
            end_date = now
        
        s = start_date.strftime('%d-%b-%Y')
        e = end_date.strftime('%d-%b-%Y')
        ranges.append((s, e))
    
    return ranges


def fetch_all_vouchers() -> List[Dict]:
    """Fetch ALL vouchers in monthly chunks for the current FY"""
    logger.info("Fetching Vouchers (month by month)...")
    
    monthly_ranges = get_monthly_ranges()
    all_vouchers = []
    
    for i, (from_dt, to_dt) in enumerate(monthly_ranges, 1):
        logger.info(f"  Fetching {from_dt} to {to_dt} [{i}/{len(monthly_ranges)}]...")
        resp = _fetch_vouchers_for_period(from_dt, to_dt)
        if resp:
            batch = _parse_voucher_xml(resp)
            all_vouchers.extend(batch)
            logger.info(f"    -> {len(batch)} vouchers")
        else:
            logger.warning(f"    -> No response for {from_dt} to {to_dt}")
    
    logger.info(f"  TOTAL: {len(all_vouchers)} vouchers fetched")
    return all_vouchers


# ═══════════════════════════════════════════════════════════════════════
#  FETCH RECEIVABLE / PAYABLE (Bill-wise Outstanding)
# ═══════════════════════════════════════════════════════════════════════

def fetch_bills_receivable() -> List[Dict]:
    """Fetch outstanding receivable bills (Sundry Debtors)"""
    logger.info("Fetching Receivable (Sundry Debtors) Outstanding...")
    from_date, to_date = get_fy_dates()
    
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>BillsReceivable</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="BillsReceivable" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>Name, Parent, ClosingBalance, BILLALLOCATIONS.*</FETCH>
        <FILTER>IsDebtor</FILTER>
    </COLLECTION>
    <SYSTEM TYPE="Formulae" NAME="IsDebtor">$$GroupSundryDebtors:$Parent OR $Parent = "Sundry Debtors"</SYSTEM>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    records = []
    
    if resp:
        try:
            root = ET.fromstring(clean_xml(resp))
            for ledger in root.iter('LEDGER'):
                name = ledger.get('NAME') or get_text(ledger, 'NAME')
                closing = parse_amount(get_text(ledger, 'CLOSINGBALANCE'))
                
                # Get bill-wise details
                has_bills = False
                for bill in ledger.iter('BILLALLOCATIONS.LIST'):
                    bill_name = get_text(bill, 'NAME')
                    if bill_name:
                        has_bills = True
                        records.append({
                            'Party': name,
                            'BillName': bill_name,
                            'BillType': get_text(bill, 'BILLTYPE'),
                            'Amount': parse_amount(get_text(bill, 'AMOUNT')),
                            'BillDate': parse_tally_date(get_text(bill, 'BILLDATE')) or '',
                            'CreditPeriod': get_text(bill, 'BILLCREDITPERIOD'),
                        })
                
                if not has_bills and closing != 0:
                    records.append({
                        'Party': name,
                        'BillName': '-',
                        'BillType': '-',
                        'Amount': closing,
                        'BillDate': '',
                        'CreditPeriod': '',
                    })
        except Exception as e:
            logger.error(f"Error parsing receivables: {e}")
    
    logger.info(f"  -> {len(records)} receivable records")
    return records


def fetch_bills_payable() -> List[Dict]:
    """Fetch outstanding payable bills (Sundry Creditors)"""
    logger.info("Fetching Payable (Sundry Creditors) Outstanding...")
    from_date, to_date = get_fy_dates()
    
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>BillsPayable</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="BillsPayable" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>Name, Parent, ClosingBalance, BILLALLOCATIONS.*</FETCH>
        <FILTER>IsCreditor</FILTER>
    </COLLECTION>
    <SYSTEM TYPE="Formulae" NAME="IsCreditor">$$GroupSundryCreditors:$Parent OR $Parent = "Sundry Creditors"</SYSTEM>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    records = []
    
    if resp:
        try:
            root = ET.fromstring(clean_xml(resp))
            for ledger in root.iter('LEDGER'):
                name = ledger.get('NAME') or get_text(ledger, 'NAME')
                closing = parse_amount(get_text(ledger, 'CLOSINGBALANCE'))
                
                has_bills = False
                for bill in ledger.iter('BILLALLOCATIONS.LIST'):
                    bill_name = get_text(bill, 'NAME')
                    if bill_name:
                        has_bills = True
                        records.append({
                            'Party': name,
                            'BillName': bill_name,
                            'BillType': get_text(bill, 'BILLTYPE'),
                            'Amount': parse_amount(get_text(bill, 'AMOUNT')),
                            'BillDate': parse_tally_date(get_text(bill, 'BILLDATE')) or '',
                            'CreditPeriod': get_text(bill, 'BILLCREDITPERIOD'),
                        })
                
                if not has_bills and closing != 0:
                    records.append({
                        'Party': name,
                        'BillName': '-',
                        'BillType': '-',
                        'Amount': closing,
                        'BillDate': '',
                        'CreditPeriod': '',
                    })
        except Exception as e:
            logger.error(f"Error parsing payables: {e}")
    
    logger.info(f"  -> {len(records)} payable records")
    return records


# ═══════════════════════════════════════════════════════════════════════
#  FETCH LEDGER CLOSING BALANCES FOR RECEIVABLE/PAYABLE SUMMARY
# ═══════════════════════════════════════════════════════════════════════

def fetch_group_outstanding(group_name: str) -> List[Dict]:
    """Fetch closing balances for all ledgers under a group"""
    from_date, to_date = get_fy_dates()
    
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>GroupOutstanding</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="GroupOutstanding" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>Name, Parent, OpeningBalance, ClosingBalance</FETCH>
        <FILTER>GroupFilter</FILTER>
    </COLLECTION>
    <SYSTEM TYPE="Formulae" NAME="GroupFilter">$Parent = "{group_name}"</SYSTEM>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    records = []
    if resp:
        try:
            root = ET.fromstring(clean_xml(resp))
            for ledger in root.iter('LEDGER'):
                name = ledger.get('NAME') or get_text(ledger, 'NAME')
                if name:
                    records.append({
                        'Ledger': name,
                        'Parent Group': group_name,
                        'Opening Balance': parse_amount(get_text(ledger, 'OPENINGBALANCE')),
                        'Closing Balance': parse_amount(get_text(ledger, 'CLOSINGBALANCE')),
                    })
        except Exception as e:
            logger.error(f"Error parsing {group_name} outstanding: {e}")
    return records


# ═══════════════════════════════════════════════════════════════════════
#  REPORT GENERATION
# ═══════════════════════════════════════════════════════════════════════

def generate_voucher_report(vouchers: List[Dict], voucher_type: str) -> pd.DataFrame:
    """Generate a flat report for a specific voucher type.
    For Sales, also matches: Tax Invoice, TAX INVOICE, Sales Invoice
    """
    type_lower = voucher_type.lower()
    
    # Map logical report type to all possible Tally voucher type names
    type_aliases = {
        'sales': ['sales', 'tax invoice', 'sales invoice'],
        'purchase': ['purchase', 'purchase invoice'],
        'receipt': ['receipt'],
        'payment': ['payment'],
        'journal': ['journal'],
        'contra': ['contra'],
        'debit note': ['debit note'],
        'credit note': ['credit note'],
    }
    
    match_types = type_aliases.get(type_lower, [type_lower])
    
    filtered = [v for v in vouchers if v['VoucherType'].lower() in match_types
                and v.get('IsCancelled', 'No').lower() != 'yes'
                and v.get('IsDeleted', 'No').lower() != 'yes']
    
    rows = []
    for v in filtered:
        # Calculate total debit and credit from ledger entries
        total_debit = 0.0
        total_credit = 0.0
        ledger_names = []
        
        for le in v.get('LedgerEntries', []):
            amt = le['Amount']
            if amt < 0:
                total_debit += abs(amt)
            else:
                total_credit += amt
            ledger_names.append(le['LedgerName'])
        
        # Inventory details
        items = []
        for ie in v.get('InventoryEntries', []):
            items.append(ie['StockItem'])
        
        rows.append({
            'Date': v['Date'],
            'Voucher No': v['VoucherNumber'],
            'Party': v.get('PartyLedger') or v.get('PartyName') or '',
            'Narration': v.get('Narration', ''),
            'Reference': v.get('Reference', ''),
            'Debit (Rs)': round(total_debit, 2),
            'Credit (Rs)': round(total_credit, 2),
            'Amount (Rs)': round(max(total_debit, total_credit), 2),
            'Ledger Accounts': ' | '.join(ledger_names),
            'Items': ' | '.join(items) if items else '',
        })
    
    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values('Date')
    return df


def build_summary(df: pd.DataFrame, report_name: str) -> pd.DataFrame:
    """Build summary statistics"""
    if df.empty:
        return pd.DataFrame([{
            'Report': report_name,
            'Total Transactions': 0,
            'Total Amount (Rs)': 0,
            'Average Amount (Rs)': 0,
            'Min Amount (Rs)': 0,
            'Max Amount (Rs)': 0,
        }])
    
    return pd.DataFrame([{
        'Report': report_name,
        'Total Transactions': len(df),
        'Total Amount (Rs)': round(df['Amount (Rs)'].sum(), 2),
        'Average Amount (Rs)': round(df['Amount (Rs)'].mean(), 2),
        'Min Amount (Rs)': round(df['Amount (Rs)'].min(), 2),
        'Max Amount (Rs)': round(df['Amount (Rs)'].max(), 2),
    }])


# ═══════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    global COMPANY_NAME, TALLY_PORT, TALLY_URL
    
    # Parse command line args
    import argparse
    parser = argparse.ArgumentParser(description="Tally Report Generator")
    parser.add_argument("--company", default=COMPANY_NAME, help="Tally company name")
    parser.add_argument("--port", type=int, default=TALLY_PORT, help="Tally port")
    args = parser.parse_args()
    
    COMPANY_NAME = args.company
    TALLY_PORT = args.port
    TALLY_URL = f"http://localhost:{TALLY_PORT}"
    
    from_date, to_date = get_fy_dates()
    
    print("=" * 70)
    print(f"  TALLY REPORT GENERATOR")
    print(f"  Company: {COMPANY_NAME}")
    print(f"  Period : {from_date} to {to_date}")
    print(f"  Tally  : {TALLY_URL}")
    print("=" * 70)
    print()
    
    # ── Step 1: Check Tally Connection ────────────────────────────────
    logger.info("Checking Tally connection...")
    test_resp = send_to_tally(f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>CompanyCheck</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="CompanyCheck"><TYPE>Company</TYPE><FETCH>NAME</FETCH></COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>""")
    
    if not test_resp:
        print("\n[ERROR] Cannot connect to Tally!")
        print("  Make sure:")
        print("  1. Tally Prime/ERP is running")
        print("  2. Company 'HSP IT SOLUTIONS' is opened in Tally")
        print("  3. Tally ODBC Server is enabled (Gateway of Tally > F12 > Connectivity)")
        print(f"  4. Port {TALLY_PORT} is accessible")
        sys.exit(1)
    
    print("[OK] Connected to Tally\n")
    
    # ── Step 2: Fetch Master Data ─────────────────────────────────────
    print("─" * 50)
    print("FETCHING MASTER DATA")
    print("─" * 50)
    
    groups = fetch_groups()
    ledgers = fetch_ledgers()
    voucher_types = fetch_voucher_types()
    
    # ── Step 3: Fetch Vouchers ────────────────────────────────────────
    print("\n" + "─" * 50)
    print("FETCHING VOUCHERS")
    print("─" * 50)
    
    vouchers = fetch_all_vouchers()
    
    # ── Step 4: Fetch Receivable/Payable ──────────────────────────────
    print("\n" + "─" * 50)
    print("FETCHING RECEIVABLE / PAYABLE")
    print("─" * 50)
    
    receivables_outstanding = fetch_group_outstanding("Sundry Debtors")
    payables_outstanding = fetch_group_outstanding("Sundry Creditors")
    bills_receivable = fetch_bills_receivable()
    bills_payable = fetch_bills_payable()
    
    # ── Step 5: Generate Reports ──────────────────────────────────────
    print("\n" + "─" * 50)
    print("GENERATING REPORTS")
    print("─" * 50)
    
    # Master Data DataFrames
    df_groups = pd.DataFrame(groups) if groups else pd.DataFrame()
    df_ledgers = pd.DataFrame(ledgers) if ledgers else pd.DataFrame()
    df_vtypes = pd.DataFrame(voucher_types) if voucher_types else pd.DataFrame()
    
    # Voucher Reports
    df_sales = generate_voucher_report(vouchers, 'Sales')
    df_purchase = generate_voucher_report(vouchers, 'Purchase')
    df_receipt = generate_voucher_report(vouchers, 'Receipt')
    df_payment = generate_voucher_report(vouchers, 'Payment')
    df_journal = generate_voucher_report(vouchers, 'Journal')
    df_contra = generate_voucher_report(vouchers, 'Contra')
    df_debit_note = generate_voucher_report(vouchers, 'Debit Note')
    df_credit_note = generate_voucher_report(vouchers, 'Credit Note')
    
    # All Vouchers flat
    all_voucher_rows = []
    for v in vouchers:
        for le in v.get('LedgerEntries', []):
            all_voucher_rows.append({
                'Date': v['Date'],
                'Voucher Type': v['VoucherType'],
                'Voucher No': v['VoucherNumber'],
                'Party': v.get('PartyLedger') or v.get('PartyName') or '',
                'Ledger': le['LedgerName'],
                'Amount': le['Amount'],
                'Narration': v.get('Narration', ''),
                'Reference': v.get('Reference', ''),
                'GUID': v['GUID'],
            })
    df_all_vouchers = pd.DataFrame(all_voucher_rows) if all_voucher_rows else pd.DataFrame()

    # Receivable / Payable
    df_receivable = pd.DataFrame(receivables_outstanding) if receivables_outstanding else pd.DataFrame()
    df_payable = pd.DataFrame(payables_outstanding) if payables_outstanding else pd.DataFrame()
    df_bills_recv = pd.DataFrame(bills_receivable) if bills_receivable else pd.DataFrame()
    df_bills_pay = pd.DataFrame(bills_payable) if bills_payable else pd.DataFrame()
    
    # ── Step 6: Summary ───────────────────────────────────────────────
    summaries = []
    summaries.append(build_summary(df_sales, 'Sales'))
    summaries.append(build_summary(df_purchase, 'Purchase'))
    summaries.append(build_summary(df_receipt, 'Receipt'))
    summaries.append(build_summary(df_payment, 'Payment'))
    
    # Receivable total
    recv_total = df_receivable['Closing Balance'].sum() if not df_receivable.empty else 0.0
    summaries.append(pd.DataFrame([{
        'Report': 'Receivable (Sundry Debtors)',
        'Total Transactions': len(df_receivable) if not df_receivable.empty else 0,
        'Total Amount (Rs)': round(recv_total, 2),
        'Average Amount (Rs)': round(recv_total / max(len(df_receivable), 1), 2) if not df_receivable.empty else 0,
        'Min Amount (Rs)': round(df_receivable['Closing Balance'].min(), 2) if not df_receivable.empty else 0,
        'Max Amount (Rs)': round(df_receivable['Closing Balance'].max(), 2) if not df_receivable.empty else 0,
    }]))
    
    # Payable total
    pay_total = df_payable['Closing Balance'].sum() if not df_payable.empty else 0.0
    summaries.append(pd.DataFrame([{
        'Report': 'Payable (Sundry Creditors)',
        'Total Transactions': len(df_payable) if not df_payable.empty else 0,
        'Total Amount (Rs)': round(abs(pay_total), 2),
        'Average Amount (Rs)': round(abs(pay_total) / max(len(df_payable), 1), 2) if not df_payable.empty else 0,
        'Min Amount (Rs)': round(df_payable['Closing Balance'].min(), 2) if not df_payable.empty else 0,
        'Max Amount (Rs)': round(df_payable['Closing Balance'].max(), 2) if not df_payable.empty else 0,
    }]))
    
    df_summary = pd.concat(summaries, ignore_index=True)
    
    # ── Step 7: Write to Excel ────────────────────────────────────────
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_file = os.path.join(OUTPUT_DIR, f"HSP_IT_SOLUTIONS_Report_{timestamp}.xlsx")
    csv_dir = os.path.join(OUTPUT_DIR, f"csv_{timestamp}")
    os.makedirs(csv_dir, exist_ok=True)
    
    logger.info(f"Writing Excel file: {excel_file}")
    
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        # Summary sheet first
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        
        # Master Data
        if not df_groups.empty:
            df_groups.to_excel(writer, sheet_name='Groups', index=False)
        if not df_ledgers.empty:
            df_ledgers.to_excel(writer, sheet_name='Ledgers', index=False)
        if not df_vtypes.empty:
            df_vtypes.to_excel(writer, sheet_name='Voucher Types', index=False)
        
        # Voucher Reports
        if not df_sales.empty:
            df_sales.to_excel(writer, sheet_name='Sales', index=False)
        if not df_purchase.empty:
            df_purchase.to_excel(writer, sheet_name='Purchase', index=False)
        if not df_receipt.empty:
            df_receipt.to_excel(writer, sheet_name='Receipt', index=False)
        if not df_payment.empty:
            df_payment.to_excel(writer, sheet_name='Payment', index=False)
        if not df_journal.empty:
            df_journal.to_excel(writer, sheet_name='Journal', index=False)
        if not df_contra.empty:
            df_contra.to_excel(writer, sheet_name='Contra', index=False)
        if not df_debit_note.empty:
            df_debit_note.to_excel(writer, sheet_name='Debit Notes', index=False)
        if not df_credit_note.empty:
            df_credit_note.to_excel(writer, sheet_name='Credit Notes', index=False)
        
        # All Vouchers
        if not df_all_vouchers.empty:
            df_all_vouchers.to_excel(writer, sheet_name='All Vouchers', index=False)
        
        # Receivable / Payable
        if not df_receivable.empty:
            df_receivable.to_excel(writer, sheet_name='Receivable Summary', index=False)
        if not df_payable.empty:
            df_payable.to_excel(writer, sheet_name='Payable Summary', index=False)
        if not df_bills_recv.empty:
            df_bills_recv.to_excel(writer, sheet_name='Bills Receivable', index=False)
        if not df_bills_pay.empty:
            df_bills_pay.to_excel(writer, sheet_name='Bills Payable', index=False)
    
    # Also write CSVs
    csv_files = {
        'summary': df_summary,
        'groups': df_groups,
        'ledgers': df_ledgers,
        'voucher_types': df_vtypes,
        'sales': df_sales,
        'purchase': df_purchase,
        'receipt': df_receipt,
        'payment': df_payment,
        'all_vouchers': df_all_vouchers,
        'receivable_summary': df_receivable,
        'payable_summary': df_payable,
        'bills_receivable': df_bills_recv,
        'bills_payable': df_bills_pay,
    }
    
    for name, df in csv_files.items():
        if not df.empty:
            csv_path = os.path.join(csv_dir, f"{name}.csv")
            df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    
    # ── Step 8: Print Summary ─────────────────────────────────────────
    print("\n" + "=" * 70)
    print(f"  REPORT SUMMARY - {COMPANY_NAME}")
    print(f"  Period: {from_date} to {to_date}")
    print("=" * 70)
    print()
    print(f"  Master Data:")
    print(f"    Groups       : {len(groups)}")
    print(f"    Ledgers      : {len(ledgers)}")
    print(f"    Voucher Types: {len(voucher_types)}")
    print(f"    Total Vouchers: {len(vouchers)}")
    print()
    print(f"  Financial Summary:")
    print(f"  {'─' * 60}")
    print(f"  {'Report':<30} {'Count':>8} {'Total Amount (Rs)':>20}")
    print(f"  {'─' * 60}")
    
    for _, row in df_summary.iterrows():
        print(f"  {row['Report']:<30} {int(row['Total Transactions']):>8} {row['Total Amount (Rs)']:>20,.2f}")
    
    print(f"  {'─' * 60}")
    print()
    print(f"  Output Files:")
    print(f"    Excel: {excel_file}")
    print(f"    CSVs : {csv_dir}\\")
    print()
    print("=" * 70)
    print("  DONE!")
    print("=" * 70)


if __name__ == '__main__':
    main()
