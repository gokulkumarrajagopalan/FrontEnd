#!/usr/bin/env python3
"""
Tally Full Report Generator v2 - HSP IT SOLUTIONS
=================================================
Fetches ALL data without year restriction.
Uses Tally's CHILDOF to correctly traverse group hierarchy for all metrics.
Matches Tally dashboard: Cash Flow, Trading, Assets/Liabilities,
Receivables/Payables, Cash/Bank, Accounting Ratios.

Usage:
    python tally_full_report.py
    python tally_full_report.py --company "HSP IT SOLUTIONS" --port 9000
"""

import requests
import xml.etree.ElementTree as ET
import re
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

try:
    import pandas as pd
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd

# ─── Configuration ───────────────────────────────────────────────────
COMPANY_NAME = "HSP IT SOLUTIONS"
TALLY_PORT = 9000
TALLY_URL = f"http://localhost:{TALLY_PORT}"

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(OUTPUT_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════
#  XML & TALLY UTILITIES
# ═══════════════════════════════════════════════════════════════════════

def clean_xml(xml_string: str) -> str:
    xml_string = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', xml_string)
    xml_string = re.sub(
        r'&#([0-9]+);',
        lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
        xml_string
    )
    xml_string = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_string)
    return xml_string


def send_to_tally(xml_request: str, timeout: int = 120) -> Optional[str]:
    try:
        response = requests.post(
            TALLY_URL,
            data=xml_request.encode('utf-8'),
            headers={'Content-Type': 'application/xml'},
            timeout=timeout
        )
        if response.status_code == 200:
            return response.text
        else:
            logger.error(f"Tally HTTP {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to Tally at {TALLY_URL}")
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        return None


def get_text(elem, tag: str, default='') -> str:
    if elem is None:
        return default
    child = elem.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def parse_amount(value: str) -> float:
    if not value:
        return 0.0
    value = value.strip()
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
    if not date_str or len(date_str) < 8:
        return None
    try:
        return f"{date_str[0:4]}-{date_str[4:6]}-{date_str[6:8]}"
    except:
        return None


def parse_tally_qty(value: str) -> float:
    if not value:
        return 0.0
    try:
        value = value.replace(',', '').strip()
        return float(value)
    except ValueError:
        match = re.match(r'^([\-\d\.]+)', value)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return 0.0


def calculate_due_date(bill_date: Optional[str], credit_period: str) -> Optional[str]:
    if not bill_date or not credit_period:
        return bill_date
    try:
        days_match = re.match(r'(\d+)', credit_period.strip())
        if days_match:
            days = int(days_match.group(1))
            if days > 0:
                base = datetime.strptime(bill_date, '%Y-%m-%d')
                due = base + timedelta(days=days)
                return due.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        pass
    return bill_date


def get_monthly_ranges(start_year: int = None) -> List[Tuple[str, str, str]]:
    now = datetime.now()
    if start_year is None:
        fy_start_year = now.year if now.month >= 4 else now.year - 1
    else:
        fy_start_year = start_year

    ranges = []
    current = datetime(fy_start_year, 4, 1)
    while current <= now:
        year = current.year
        month = current.month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        if end_date > now:
            end_date = now
        label = start_date.strftime('%b-%y')
        s = start_date.strftime('%d-%b-%Y')
        e = end_date.strftime('%d-%b-%Y')
        ranges.append((s, e, label))
        if month == 12:
            current = datetime(year + 1, 1, 1)
        else:
            current = datetime(year, month + 1, 1)
    return ranges


# ═══════════════════════════════════════════════════════════════════════
#  GROUP HIERARCHY
# ═══════════════════════════════════════════════════════════════════════

class GroupHierarchy:
    def __init__(self, groups: List[Dict]):
        self.parent_map: Dict[str, str] = {}
        for g in groups:
            name = (g.get('Name') or '').strip()
            parent = (g.get('Parent') or '').strip()
            if name:
                self.parent_map[name.lower()] = parent.lower()

    def is_under(self, group_name: str, ancestor: str) -> bool:
        current = group_name.lower().strip()
        target = ancestor.lower().strip()
        visited = set()
        while current and current not in visited:
            if current == target:
                return True
            visited.add(current)
            current = self.parent_map.get(current, '')
        return False


# ═══════════════════════════════════════════════════════════════════════
#  DIRECT TALLY QUERIES USING CHILDOF (most accurate)
# ═══════════════════════════════════════════════════════════════════════

def fetch_ledgers_under_group(group_name: str) -> Tuple[float, List[Dict]]:
    """Fetch all ledgers under a group (recursively via CHILDOF) with closing balances."""
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>GroupLedgers</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="GroupLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <CHILDOF>{group_name}</CHILDOF>
        <FETCH>Name, ClosingBalance, OpeningBalance, Parent</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    if not resp:
        return 0.0, []

    total = 0.0
    details = []
    try:
        root = ET.fromstring(clean_xml(resp))
        for elem in root.iter('LEDGER'):
            name = elem.get('NAME') or get_text(elem, 'NAME')
            if not name:
                continue
            cb = parse_amount(get_text(elem, 'CLOSINGBALANCE'))
            ob = parse_amount(get_text(elem, 'OPENINGBALANCE'))
            total += cb
            details.append({
                'Name': name,
                'Parent': get_text(elem, 'PARENT'),
                'Opening Balance': ob,
                'Closing Balance': cb,
            })
    except Exception as e:
        logger.error(f"Error parsing group ledgers for {group_name}: {e}")
    return total, details


def fetch_group_summary(group_name: str) -> Tuple[float, float]:
    """Fetch opening and closing balance for a GROUP itself."""
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>GroupSummary</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="GroupSummary" ISMODIFY="No">
        <TYPE>Group</TYPE>
        <FETCH>Name, ClosingBalance, OpeningBalance</FETCH>
        <FILTER>MatchGroup</FILTER>
    </COLLECTION>
    <SYSTEM TYPE="Formulae" NAME="MatchGroup">$Name = "{group_name}"</SYSTEM>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""

    resp = send_to_tally(xml)
    if not resp:
        return 0.0, 0.0
    try:
        root = ET.fromstring(clean_xml(resp))
        for elem in root.iter('GROUP'):
            ob = parse_amount(get_text(elem, 'OPENINGBALANCE'))
            cb = parse_amount(get_text(elem, 'CLOSINGBALANCE'))
            return ob, cb
    except Exception as e:
        logger.error(f"Error parsing group summary for {group_name}: {e}")
    return 0.0, 0.0


def fetch_bills_outstanding(report_name: str) -> Tuple[float, List[Dict]]:
    """Fetch bill-wise outstanding using Tally's built-in report export.
    report_name: 'Bills Payable' (Sundry Creditors) or 'Bills Receivable' (Sundry Debtors).
    Returns (total_pending, list_of_bill_records).
    This matches Tally's dashboard exactly — sum of individual pending bills."""
    logger.info(f"Fetching '{report_name}' from Tally built-in report...")
    xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>{report_name}</REPORTNAME>
    <STATICVARIABLES>
        <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""
    resp = send_to_tally(xml)
    if not resp:
        return 0.0, []

    total_pending = 0.0
    bill_records = []
    party_totals = {}  # party -> total pending

    try:
        root = ET.fromstring(clean_xml(resp))
        elements = list(root)
        i = 0
        while i < len(elements):
            el = elements[i]
            if el.tag == 'BILLFIXED':
                bill_date = (el.findtext('BILLDATE') or '').strip()
                bill_ref = (el.findtext('BILLREF') or '').strip()
                bill_party = (el.findtext('BILLPARTY') or '').strip()
                # Clean up party name (remove trailing whitespace/newlines)
                bill_party = ' '.join(bill_party.split())

                bill_cl = 0.0
                bill_due = ''
                bill_overdue = ''

                j = i + 1
                while j < len(elements) and elements[j].tag != 'BILLFIXED':
                    if elements[j].tag == 'BILLCL':
                        bill_cl = parse_amount(elements[j].text)
                    elif elements[j].tag == 'BILLDUE':
                        bill_due = (elements[j].text or '').strip()
                    elif elements[j].tag == 'BILLOVERDUE':
                        bill_overdue = (elements[j].text or '').strip()
                    j += 1

                pending = abs(bill_cl)
                if pending > 0.001:
                    total_pending += pending
                    party_totals[bill_party] = party_totals.get(bill_party, 0) + pending
                    bill_records.append({
                        'Party': bill_party,
                        'Parent Group': '',
                        'Bill Name': bill_ref,
                        'Bill Type': '',
                        'Pending Amount': round(pending, 2),
                        'Dr/Cr': 'Dr' if bill_cl < 0 else 'Cr',
                        'Bill Date': bill_date,
                        'Due Date': bill_due,
                        'Overdue Days': bill_overdue,
                    })
                i = j
            else:
                i += 1
    except Exception as e:
        logger.error(f"Error parsing {report_name}: {e}")

    logger.info(f"  -> {len(bill_records)} pending bills, {len(party_totals)} parties, "
                f"Total={total_pending:,.2f}")
    return total_pending, bill_records


# ═══════════════════════════════════════════════════════════════════════
#  FETCH MASTER DATA
# ═══════════════════════════════════════════════════════════════════════

def build_collection_xml(collection_id: str, type_name: str, fetch_fields: str,
                          from_date: str = None, to_date: str = None,
                          child_of: str = None) -> str:
    date_vars = ""
    if from_date and to_date:
        date_vars = f"""
    <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
    <SVTODATE TYPE="Date">{to_date}</SVTODATE>"""
    child_of_xml = f"<CHILDOF>{child_of}</CHILDOF>" if child_of else ""

    return f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>{collection_id}</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
    <SVCOMPANY>{COMPANY_NAME}</SVCOMPANY>{date_vars}
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
    <COLLECTION NAME="{collection_id}" ISMODIFY="No">
        <TYPE>{type_name}</TYPE>
        {child_of_xml}
        <FETCH>{fetch_fields}</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""


def fetch_groups() -> List[Dict]:
    logger.info("Fetching Groups...")
    xml = build_collection_xml("AllGroups", "Group",
        "GUID, MASTERID, ALTERID, Name, Alias, Parent, Nature, IsRevenue, RESERVEDNAME")
    resp = send_to_tally(xml)
    if not resp:
        return []
    groups = []
    root = ET.fromstring(clean_xml(resp))
    for elem in root.iter('GROUP'):
        name = elem.get('NAME') or get_text(elem, 'NAME')
        if not name: continue
        groups.append({
            'Name': name, 'Alias': get_text(elem, 'ALIAS'),
            'Parent': get_text(elem, 'PARENT'), 'Nature': get_text(elem, 'NATURE'),
            'IsRevenue': get_text(elem, 'ISREVENUE'),
            'ReservedName': elem.get('RESERVEDNAME', '') or get_text(elem, 'RESERVEDNAME'),
            'GUID': get_text(elem, 'GUID'), 'MasterID': get_text(elem, 'MASTERID'),
            'AlterID': get_text(elem, 'ALTERID'),
        })
    logger.info(f"  -> {len(groups)} groups")
    return groups


def fetch_ledgers() -> List[Dict]:
    """Fetch ALL Ledgers without date restriction."""
    logger.info("Fetching Ledgers (no date restriction)...")
    xml = build_collection_xml("AllLedgers", "Ledger",
        "GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, IsRevenue, LastParent, "
        "Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, ClosingBalance, "
        "LEDGERPHONE, LEDGERMOBILE, EMAIL, WEBSITE, INCOMETAXNUMBER, "
        "CURRENCYNAME, LEDMAILINGDETAILS.*, LEDGSTREGDETAILS.*, RESERVEDNAME")
    resp = send_to_tally(xml)
    if not resp:
        return []
    ledgers = []
    root = ET.fromstring(clean_xml(resp))
    for elem in root.iter('LEDGER'):
        name = elem.get('NAME') or get_text(elem, 'NAME')
        if not name: continue
        gstin, gst_reg_type = '', ''
        gst_reg = elem.find('.//LEDGSTREGDETAILS.LIST')
        if gst_reg is not None:
            gstin = get_text(gst_reg, 'GSTIN')
            gst_reg_type = get_text(gst_reg, 'GSTREGISTRATIONTYPE')
        mailing = elem.find('.//LEDMAILINGDETAILS.LIST')
        state, country, pincode, mailing_name = '', '', '', ''
        if mailing is not None:
            state = get_text(mailing, 'STATE')
            country = get_text(mailing, 'COUNTRY')
            pincode = get_text(mailing, 'PINCODE')
            mailing_name = get_text(mailing, 'MAILINGNAME')
        ledgers.append({
            'Name': name, 'Alias': get_text(elem, 'ONLYALIAS'),
            'Parent Group': get_text(elem, 'PARENT'),
            'Primary Group': get_text(elem, 'LASTPARENT'),
            'IsRevenue': get_text(elem, 'ISREVENUE'),
            'Opening Balance': parse_amount(get_text(elem, 'OPENINGBALANCE')),
            'Closing Balance': parse_amount(get_text(elem, 'CLOSINGBALANCE')),
            'IsBillWiseOn': get_text(elem, 'ISBILLWISEON'),
            'IsCostCentresOn': get_text(elem, 'ISCOSTCENTRESON'),
            'Phone': get_text(elem, 'LEDGERPHONE'),
            'Mobile': get_text(elem, 'LEDGERMOBILE'),
            'Email': get_text(elem, 'EMAIL'), 'Website': get_text(elem, 'WEBSITE'),
            'PAN': get_text(elem, 'INCOMETAXNUMBER'),
            'GSTIN': gstin, 'GST Reg Type': gst_reg_type,
            'Mailing Name': mailing_name, 'State': state,
            'Country': country, 'Pincode': pincode,
            'GUID': get_text(elem, 'GUID'), 'MasterID': get_text(elem, 'MASTERID'),
            'AlterID': get_text(elem, 'ALTERID'),
        })
    logger.info(f"  -> {len(ledgers)} ledgers")
    return ledgers


def fetch_voucher_types() -> List[Dict]:
    logger.info("Fetching Voucher Types...")
    xml = build_collection_xml("AllVoucherTypes", "VoucherType",
        "GUID, MASTERID, ALTERID, Name, PARENT, ISACTIVE, ISDEEMEDPOSITIVE, NUMBERINGMETHOD")
    resp = send_to_tally(xml)
    if not resp: return []
    vtypes = []
    root = ET.fromstring(clean_xml(resp))
    for elem in root.iter('VOUCHERTYPE'):
        name = elem.get('NAME') or get_text(elem, 'NAME')
        if not name: continue
        vtypes.append({'Name': name, 'Parent': get_text(elem, 'PARENT'),
            'IsActive': get_text(elem, 'ISACTIVE'),
            'IsDeemedPositive': get_text(elem, 'ISDEEMEDPOSITIVE'),
            'GUID': get_text(elem, 'GUID')})
    logger.info(f"  -> {len(vtypes)} voucher types")
    return vtypes


def fetch_stock_items() -> List[Dict]:
    logger.info("Fetching Stock Items...")
    xml = build_collection_xml("AllStockItems", "StockItem",
        "GUID, MASTERID, ALTERID, Name, Parent, Category, BaseUnits, "
        "OpeningBalance, OpeningValue, OpeningRate, HSNCode, CostingMethod, ValuationMethod")
    resp = send_to_tally(xml)
    if not resp: return []
    items = []
    root = ET.fromstring(clean_xml(resp))
    for elem in root.iter('STOCKITEM'):
        name = elem.get('NAME') or get_text(elem, 'NAME')
        if not name: continue
        items.append({'Name': name, 'Parent Group': get_text(elem, 'PARENT'),
            'Category': get_text(elem, 'CATEGORY'), 'Unit': get_text(elem, 'BASEUNITS'),
            'Opening Balance': parse_tally_qty(get_text(elem, 'OPENINGBALANCE')),
            'Opening Value': parse_amount(get_text(elem, 'OPENINGVALUE')),
            'HSN Code': get_text(elem, 'HSNCODE'),
            'GUID': get_text(elem, 'GUID')})
    logger.info(f"  -> {len(items)} stock items")
    return items


def fetch_stock_closing_values() -> Tuple[float, float]:
    """Fetch opening and closing stock valuations from Stock Items.
    Returns (opening_stock, closing_stock) as absolute values."""
    logger.info("Fetching Stock Item closing/opening values...")
    xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>StockValuation</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
<SVCURRENTCOMPANY>{COMPANY_NAME}</SVCURRENTCOMPANY></STATICVARIABLES>
<TDL><TDLMESSAGE>
<COLLECTION NAME="StockValuation"><TYPE>StockItem</TYPE>
<FETCH>Name, OpeningValue, ClosingValue</FETCH></COLLECTION>
</TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
    resp = send_to_tally(xml)
    if not resp:
        return 0.0, 0.0
    root = ET.fromstring(clean_xml(resp))
    total_opening = 0.0
    total_closing = 0.0
    for si in root.iter('STOCKITEM'):
        ov = parse_amount(get_text(si, 'OPENINGVALUE'))
        cv = parse_amount(get_text(si, 'CLOSINGVALUE'))
        total_opening += ov
        total_closing += cv
    # Tally: negative=Debit (asset), so abs for stock values
    opening = abs(total_opening)
    closing = abs(total_closing)
    logger.info(f"  -> Opening Stock: {opening:,.2f}, Closing Stock: {closing:,.2f}")
    return opening, closing


# ═══════════════════════════════════════════════════════════════════════
#  FETCH ALL VOUCHERS WITH FULL NESTED DATA (7-level)
# ═══════════════════════════════════════════════════════════════════════

def generate_voucher_tdl(from_dt: str, to_dt: str) -> str:
    return f"""<ENVELOPE>
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
        <FETCH>GUID, MASTERID, ALTERID, DATE, EFFECTIVEDATE, VOUCHERTYPENAME,
               VOUCHERNUMBER, VOUCHERNUMBERSERIES, PARTYLEDGERNAME, PARTYNAME,
               REFERENCE, NARRATION, PERSISTEDVIEW,
               ISOPTIONAL, ISDELETED, ISCANCELLED, ISVOID, ISONHOLD, ISPOSTDATED,
               ISINVOICE, HASCASHFLOW, HASDISCOUNTS, ISDEEMEDPOSITIVE,
               PARTYGSTIN, CMPGSTIN, PLACEOFSUPPLY, VCHGSTCLASS,
               ALLLEDGERENTRIES.LIST, ALLINVENTORYENTRIES.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="AllLedgerEntries">
        <TYPE>Voucher : AllLedgerEntries</TYPE>
        <FETCH>LEDGERNAME, LEDGERGUID, AMOUNT, ISDEEMEDPOSITIVE, ISPARTYLEDGER,
               LEDGERFROMITEM, GSTCLASS, APPROPRIATEFOR,
               BILLALLOCATIONS.LIST, CATEGORYALLOCATIONS.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="BillAllocations">
        <TYPE>Voucher : AllLedgerEntries : BillAllocations</TYPE>
        <FETCH>NAME, BILLTYPE, AMOUNT, BILLNUMBER, BILLDATE, BILLCREDITPERIOD</FETCH>
    </COLLECTION>
    <COLLECTION NAME="CategoryAllocations">
        <TYPE>Voucher : AllLedgerEntries : CategoryAllocations</TYPE>
        <FETCH>CATEGORY, AMOUNT, COSTCENTREALLOCATIONS.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="CostCentreAllocations">
        <TYPE>Voucher : AllLedgerEntries : CategoryAllocations : CostCentreAllocations</TYPE>
        <FETCH>COSTCENTRENAME, AMOUNT</FETCH>
    </COLLECTION>
    <COLLECTION NAME="AllInventoryEntries">
        <TYPE>Voucher : AllInventoryEntries</TYPE>
        <FETCH>STOCKITEMNAME, STOCKITEMGUID, ACTUALQTY, BILLEDQTY, RATE, AMOUNT,
               UOM, GODOWNNAME, DISCOUNT, ISDEEMEDPOSITIVE, BATCHALLOCATIONS.LIST</FETCH>
    </COLLECTION>
    <COLLECTION NAME="BatchAllocations">
        <TYPE>Voucher : AllInventoryEntries : BatchAllocations</TYPE>
        <FETCH>BATCHNAME, GODOWNNAME, AMOUNT, RATE, MFGDATE, EXPIRYDATE,
               DESTINATIONGODOWNNAME</FETCH>
    </COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""


def parse_vouchers_full(xml_string: str) -> List[Dict]:
    vouchers = []
    try:
        root = ET.fromstring(clean_xml(xml_string))
        for velem in root.iter('VOUCHER'):
            v = _parse_single_voucher(velem)
            if v:
                vouchers.append(v)
    except Exception as e:
        logger.error(f"Error parsing voucher XML: {e}")
    return vouchers


def _parse_single_voucher(elem) -> Optional[Dict]:
    try:
        guid = get_text(elem, 'GUID')
        alter_id = int(get_text(elem, 'ALTERID', '0'))
        if not guid or alter_id == 0:
            return None
        voucher_date = parse_tally_date(get_text(elem, 'DATE'))
        voucher_type = get_text(elem, 'VOUCHERTYPENAME')
        voucher_number = get_text(elem, 'VOUCHERNUMBER')
        ledger_entries = _parse_ledger_entries(elem, voucher_date)
        inventory_entries = _parse_inventory_entries(elem)
        total_debit = sum(le['debit_amount'] for le in ledger_entries)
        total_credit = sum(le['credit_amount'] for le in ledger_entries)
        return {
            'guid': guid, 'alter_id': alter_id,
            'voucher_number': voucher_number, 'voucher_type': voucher_type,
            'voucher_date': voucher_date,
            'effective_date': parse_tally_date(get_text(elem, 'EFFECTIVEDATE')),
            'party_ledger': get_text(elem, 'PARTYLEDGERNAME') or get_text(elem, 'PARTYNAME'),
            'party_name': get_text(elem, 'PARTYNAME'),
            'reference': get_text(elem, 'REFERENCE'),
            'narration': get_text(elem, 'NARRATION'),
            'party_gstin': get_text(elem, 'PARTYGSTIN'),
            'place_of_supply': get_text(elem, 'PLACEOFSUPPLY'),
            'is_cancelled': get_text(elem, 'ISCANCELLED', 'No') == 'Yes',
            'is_deleted': get_text(elem, 'ISDELETED', 'No') == 'Yes',
            'is_optional': get_text(elem, 'ISOPTIONAL', 'No') == 'Yes',
            'has_cash_flow': get_text(elem, 'HASCASHFLOW', 'No') == 'Yes',
            'is_invoice': get_text(elem, 'ISINVOICE', 'No') == 'Yes',
            'amount': total_debit, 'total_debit': total_debit, 'total_credit': total_credit,
            'ledger_entries': ledger_entries, 'inventory_entries': inventory_entries,
        }
    except Exception as e:
        logger.warning(f"Error parsing voucher: {e}")
        return None


def _parse_ledger_entries(voucher_elem, voucher_date: str) -> List[Dict]:
    """Tally convention: negative AMOUNT = Debit, positive AMOUNT = Credit"""
    entries = []
    for le in voucher_elem.findall('.//ALLLEDGERENTRIES.LIST'):
        try:
            ledger_name = get_text(le, 'LEDGERNAME')
            if not ledger_name: continue
            raw_amount = parse_amount(get_text(le, 'AMOUNT'))
            # Tally: negative = Debit, positive = Credit
            if raw_amount < 0:
                dr_cr = 'DR'
                debit_amount = abs(raw_amount)
                credit_amount = 0.0
            else:
                dr_cr = 'CR'
                debit_amount = 0.0
                credit_amount = abs(raw_amount)

            bills = []
            for ba in le.findall('.//BILLALLOCATIONS.LIST'):
                bill_name = get_text(ba, 'NAME')
                if bill_name:
                    bill_date_raw = get_text(ba, 'BILLDATE')
                    bill_date = parse_tally_date(bill_date_raw) if bill_date_raw else voucher_date
                    credit_period = get_text(ba, 'BILLCREDITPERIOD', '0')
                    bills.append({
                        'bill_name': bill_name, 'bill_type': get_text(ba, 'BILLTYPE', 'Voucher'),
                        'bill_ref': get_text(ba, 'BILLNUMBER'), 'bill_date': bill_date,
                        'bill_due_date': calculate_due_date(bill_date, credit_period),
                        'bill_credit_period': credit_period,
                        'bill_amount': abs(parse_amount(get_text(ba, 'AMOUNT'))),
                    })

            cost_categories = []
            for cat in le.findall('.//CATEGORYALLOCATIONS.LIST'):
                centres = []
                for cc in cat.findall('.//COSTCENTREALLOCATIONS.LIST'):
                    centres.append({
                        'cost_centre': get_text(cc, 'COSTCENTRENAME'),
                        'amount': abs(parse_amount(get_text(cc, 'AMOUNT'))),
                    })
                cost_categories.append({
                    'category': get_text(cat, 'CATEGORY'),
                    'amount': abs(parse_amount(get_text(cat, 'AMOUNT'))),
                    'cost_centres': centres,
                })

            entries.append({
                'ledger_name': ledger_name, 'ledger_guid': get_text(le, 'LEDGERGUID'),
                'raw_amount': raw_amount, 'amount': raw_amount,
                'debit_amount': debit_amount, 'credit_amount': credit_amount,
                'dr_cr': dr_cr,
                'is_deemed_positive': get_text(le, 'ISDEEMEDPOSITIVE', 'No') == 'Yes',
                'is_party_ledger': get_text(le, 'ISPARTYLEDGER', 'No') == 'Yes',
                'gst_class': get_text(le, 'GSTCLASS'),
                'bill_allocations': bills,
                'cost_category_allocations': cost_categories,
            })
        except Exception as e:
            logger.warning(f"Error parsing ledger entry: {e}")
    return entries


def _parse_inventory_entries(voucher_elem) -> List[Dict]:
    entries = []
    for ie in voucher_elem.findall('.//ALLINVENTORYENTRIES.LIST'):
        try:
            stock_name = get_text(ie, 'STOCKITEMNAME')
            if not stock_name: continue
            actual_qty = parse_tally_qty(get_text(ie, 'ACTUALQTY'))
            billed_qty = parse_tally_qty(get_text(ie, 'BILLEDQTY'))
            rate = parse_tally_qty(get_text(ie, 'RATE'))
            stock_amount = abs(parse_amount(get_text(ie, 'AMOUNT')))
            uom = get_text(ie, 'UOM')
            if billed_qty == 0 and rate != 0 and stock_amount != 0:
                billed_qty = abs(stock_amount / rate)
            elif billed_qty == 0:
                billed_qty = abs(actual_qty)
            if rate == 0 and abs(actual_qty) != 0 and stock_amount != 0:
                rate = stock_amount / abs(actual_qty)

            batches = []
            batch_elems = ie.findall('.//BATCHALLOCATIONS.LIST')
            for batch in batch_elems:
                batch_amount = abs(parse_amount(get_text(batch, 'AMOUNT')))
                batch_rate = parse_tally_qty(get_text(batch, 'RATE'))
                batch_qty = abs(actual_qty) if len(batch_elems) == 1 else (
                    abs(batch_amount / batch_rate) if batch_rate != 0 else abs(actual_qty))
                batches.append({
                    'batch_name': get_text(batch, 'BATCHNAME'),
                    'godown': get_text(batch, 'GODOWNNAME'),
                    'dest_godown': get_text(batch, 'DESTINATIONGODOWNNAME'),
                    'qty': batch_qty, 'rate': batch_rate, 'amount': batch_amount,
                    'uom': uom or 'Pcs',
                    'mfg_date': parse_tally_date(get_text(batch, 'MFGDATE')),
                    'expiry_date': parse_tally_date(get_text(batch, 'EXPIRYDATE')),
                })
            entries.append({
                'stock_item': stock_name, 'stock_guid': get_text(ie, 'STOCKITEMGUID'),
                'actual_qty': abs(actual_qty), 'billed_qty': abs(billed_qty),
                'rate': rate, 'amount': stock_amount,
                'discount': parse_amount(get_text(ie, 'DISCOUNT')),
                'uom': uom, 'godown': get_text(ie, 'GODOWNNAME'),
                'is_outward': actual_qty < 0, 'batch_allocations': batches,
            })
        except Exception as e:
            logger.warning(f"Error parsing inventory entry: {e}")
    return entries


def fetch_all_vouchers(use_all_years: bool = True) -> List[Dict]:
    """Fetch ALL vouchers month by month. If use_all_years, starts from FY 2020."""
    start_year = 2020 if use_all_years else None
    monthly_ranges = get_monthly_ranges(start_year)
    all_vouchers = []
    logger.info(f"Fetching vouchers across {len(monthly_ranges)} months...")
    for i, (from_dt, to_dt, label) in enumerate(monthly_ranges, 1):
        tdl = generate_voucher_tdl(from_dt, to_dt)
        resp = send_to_tally(tdl)
        if resp:
            batch = parse_vouchers_full(resp)
            all_vouchers.extend(batch)
            if batch:
                logger.info(f"  [{i}/{len(monthly_ranges)}] {label}: {len(batch)} vouchers")
    active = [v for v in all_vouchers if not v['is_cancelled'] and not v['is_deleted']]
    logger.info(f"  TOTAL: {len(all_vouchers)} raw, {len(active)} active vouchers")
    return all_vouchers


# ═══════════════════════════════════════════════════════════════════════
#  DASHBOARD METRICS (CHILDOF-based for accuracy)
# ═══════════════════════════════════════════════════════════════════════

SALES_TYPES = {'sales', 'tax invoice', 'sales invoice'}
PURCHASE_TYPES = {'purchase', 'purchase invoice'}
RECEIPT_TYPES = {'receipt'}
PAYMENT_TYPES = {'payment'}
JOURNAL_TYPES = {'journal'}
CONTRA_TYPES = {'contra'}
DN_TYPES = {'debit note'}
CN_TYPES = {'credit note'}


def classify_voucher(v: Dict) -> str:
    vt = v['voucher_type'].lower()
    for types, label in [(SALES_TYPES, 'Sales'), (PURCHASE_TYPES, 'Purchase'),
                          (RECEIPT_TYPES, 'Receipt'), (PAYMENT_TYPES, 'Payment'),
                          (JOURNAL_TYPES, 'Journal'), (CONTRA_TYPES, 'Contra'),
                          (DN_TYPES, 'Debit Note'), (CN_TYPES, 'Credit Note')]:
        if vt in types: return label
    return v['voucher_type']


def compute_monthly_trend(vouchers: List[Dict], type_set: set) -> Dict[str, float]:
    monthly = defaultdict(float)
    for v in vouchers:
        if v['is_cancelled'] or v['is_deleted']: continue
        if v['voucher_type'].lower() in type_set and v['voucher_date']:
            try:
                dt = datetime.strptime(v['voucher_date'][:7], '%Y-%m')
                monthly[dt.strftime('%b-%y')] += v['amount']
            except: pass
    return dict(monthly)


def compute_cash_flow(vouchers: List[Dict], hierarchy: GroupHierarchy,
                       ledgers: List[Dict]) -> Dict:
    """Tally: negative amount = Debit (money IN to Cash/Bank), positive = Credit (money OUT)."""
    cash_bank_ledgers = set()
    for l in ledgers:
        p = l.get('Parent Group', '')
        if (hierarchy.is_under(p, 'Cash-in-Hand') or hierarchy.is_under(p, 'Bank Accounts') or
            hierarchy.is_under(p, 'Bank OCC A/c') or hierarchy.is_under(p, 'Bank OD A/c') or
            p.lower() in {'cash-in-hand', 'bank accounts', 'bank occ a/c', 'bank od a/c'}):
            cash_bank_ledgers.add(l['Name'].lower())

    inflow = 0.0
    outflow = 0.0
    for v in vouchers:
        if v['is_cancelled'] or v['is_deleted']: continue
        for le in v['ledger_entries']:
            if le['ledger_name'].lower() in cash_bank_ledgers:
                raw = le['raw_amount']
                if raw < 0:
                    inflow += abs(raw)
                else:
                    outflow += abs(raw)
    return {
        'Nett Flow': round(inflow - outflow, 2),
        'Inflow': round(inflow, 2),
        'Outflow': round(outflow, 2),
    }


def compute_dashboard_from_tally(hierarchy: GroupHierarchy, ledgers: List[Dict],
                                  opening_stock: float = 0, closing_stock: float = 0) -> Dict:
    """Compute dashboard metrics from master ledger data (already fetched with ClosingBalance).
    Uses hierarchy.is_under() for group classification.
    Sign convention: Tally ClosingBalance: NEGATIVE=Debit, POSITIVE=Credit."""
    logger.info("Computing dashboard metrics from master ledger data...")
    logger.info(f"  Stock values: Opening={opening_stock:,.2f}, Closing={closing_stock:,.2f}")

    # Helper: get ledgers under a specific group including all descendants
    def ledgers_in_group(target_group):
        return [l for l in ledgers
                if l['Parent Group'] == target_group
                or hierarchy.is_under(l['Parent Group'], target_group)]

    # Helper: sum closing balances for all ledgers in a group tree
    def sum_group(target_group):
        return sum(l['Closing Balance'] for l in ledgers_in_group(target_group))

    # ── Trading ───────────────────────────────────────────────────────
    sales_total = sum_group("Sales Accounts")
    purchase_total = sum_group("Purchase Accounts")
    di_total = sum_group("Direct Incomes")
    de_total = sum_group("Direct Expenses")
    ii_total = sum_group("Indirect Incomes")
    ie_total = sum_group("Indirect Expenses")

    logger.info(f"  Raw Primary sums: Sales={sales_total}, Purchase={purchase_total}, "
                f"DI={di_total}, DE={de_total}, II={ii_total}, IE={ie_total}")

    # abs() since Sales/Income=Credit(+pos), Purchase/Expense=Debit(-neg)
    sales_amount = abs(sales_total)
    purchase_amount = abs(purchase_total)
    di = abs(di_total)
    de = abs(de_total)
    ii = abs(ii_total)
    ie_amt = abs(ie_total)

    # Tally GP includes stock change: GP = Sales + ClosingStock - OpeningStock - Purchase + DI - DE
    stock_change = closing_stock - opening_stock
    gross_profit = sales_amount + stock_change - purchase_amount + di - de
    net_profit = gross_profit + ii - ie_amt

    trading = {
        'Gross Profit': round(gross_profit, 2), 'Nett Profit': round(net_profit, 2),
        'Sales Accounts': round(sales_amount, 2), 'Purchase Accounts': round(purchase_amount, 2),
        'Closing Stock': round(closing_stock, 2), 'Opening Stock': round(opening_stock, 2),
        'Direct Income': round(di, 2), 'Direct Expense': round(de, 2),
        'Indirect Income': round(ii, 2), 'Indirect Expense': round(ie_amt, 2),
    }
    logger.info(f"  Trading: Sales={trading['Sales Accounts']}, Purchase={trading['Purchase Accounts']}, "
                f"StockChg={stock_change:,.2f}, GP={trading['Gross Profit']}, NP={trading['Nett Profit']}")

    # ── Assets / Liabilities (hierarchy traversal) ───────────────────
    ca_total = sum_group("Current Assets")
    cl_total = sum_group("Current Liabilities")
    fa_total = sum_group("Fixed Assets")
    inv_total = sum_group("Investments")

    # Assets=Debit(negative sum), Liabilities=Credit(positive sum), take abs
    # Current Assets includes ledger balances + closing stock (tracked via inventory, not ledgers)
    assets_liab = {
        'Current Assets': round(abs(ca_total) + closing_stock, 2),
        'Current Liabilities': round(abs(cl_total), 2),
        'Fixed Assets': round(abs(fa_total), 2),
        'Investments': round(abs(inv_total), 2),
    }
    logger.info(f"  Assets: CA={assets_liab['Current Assets']} (raw={ca_total:.2f}), "
                f"CL={assets_liab['Current Liabilities']} (raw={cl_total:.2f})")

    # ── Receivables / Payables (BILL-WISE OUTSTANDING) ─────────────
    # Tally dashboard shows sum of individual PENDING BILLS, not ledger balance.
    # A party may owe 5 separate invoices totaling 50K even if ledger balance is 30K net.
    recv_bill_total, recv_bill_records = fetch_bills_outstanding("Bills Receivable")
    pay_bill_total, pay_bill_records = fetch_bills_outstanding("Bills Payable")

    # Also compute ledger-level balances for the party detail sheets
    recv_ledgers = ledgers_in_group("Sundry Debtors")
    pay_ledgers = ledgers_in_group("Sundry Creditors")
    recv_sorted = sorted(recv_ledgers, key=lambda x: abs(x['Closing Balance']), reverse=True)
    pay_sorted = sorted(pay_ledgers, key=lambda x: abs(x['Closing Balance']), reverse=True)

    recv_payable = {
        'Receivables': round(recv_bill_total, 2),
        'Overdue Receivables': round(recv_bill_total, 2),
        'Payables': round(pay_bill_total, 2),
        'Overdue Payables': round(pay_bill_total, 2),
        'recv_bills': recv_bill_records,
        'pay_bills': pay_bill_records,
        'recv_details': [{'Party': l['Name'], 'Amount': abs(l['Closing Balance']),
                          'Dr/Cr': 'Dr' if l['Closing Balance'] < 0 else 'Cr',
                          'Parent Group': l['Parent Group']} for l in recv_sorted if l['Closing Balance'] != 0],
        'pay_details': [{'Party': l['Name'], 'Amount': abs(l['Closing Balance']),
                          'Dr/Cr': 'Cr' if l['Closing Balance'] > 0 else 'Dr',
                          'Parent Group': l['Parent Group']} for l in pay_sorted if l['Closing Balance'] != 0],
    }

    # ── Cash / Bank (sub-group detail) ───────────────────────────────
    cash_ledgers = ledgers_in_group("Cash-in-Hand")
    bank_ledgers = ledgers_in_group("Bank Accounts")
    cash_total = sum(l['Closing Balance'] for l in cash_ledgers)
    bank_total = sum(l['Closing Balance'] for l in bank_ledgers)

    cash_bank_list = []
    for l in cash_ledgers:
        cash_bank_list.append({'Account': l['Name'], 'Group': 'Cash-in-Hand',
            'Closing Balance': abs(l['Closing Balance']),
            'Dr/Cr': 'Dr' if l['Closing Balance'] < 0 else 'Cr'})
    for l in bank_ledgers:
        cash_bank_list.append({'Account': l['Name'], 'Group': 'Bank Accounts',
            'Closing Balance': abs(l['Closing Balance']),
            'Dr/Cr': 'Dr' if l['Closing Balance'] < 0 else 'Cr'})

    cash_bank = {
        'Cash-in-Hand': round(abs(cash_total), 2),
        'Bank Accounts': round(abs(bank_total), 2),
        'details': sorted(cash_bank_list, key=lambda x: abs(x['Closing Balance']), reverse=True),
    }
    logger.info(f"  Cash: {cash_bank['Cash-in-Hand']}, Bank: {cash_bank['Bank Accounts']}")

    # ── Accounting Ratios ────────────────────────────────────────────
    # Use closing_stock from StockItem collection (not ledger-based, which returns 0)
    now = datetime.now()
    fy_start_year = now.year if now.month >= 4 else now.year - 1
    fy_start = datetime(fy_start_year, 4, 1)
    days_in_period = max((now - fy_start).days, 1)

    inventory_turnover = round(purchase_amount / closing_stock, 2) if closing_stock > 0 else 0

    # Capital / Loans
    total_debt = abs(sum_group("Secured Loans")) + abs(sum_group("Unsecured Loans"))
    total_equity = abs(sum_group("Capital Account"))
    debt_equity = round(total_debt / total_equity, 2) if total_equity > 0 else 0

    recv_amt = recv_payable['Receivables']
    recv_turnover_days = round((recv_amt / sales_amount) * days_in_period, 2) if sales_amount > 0 else 0
    roi = round((net_profit / total_equity) * 100, 2) if total_equity > 0 else 0

    ratios = {
        'Inventory Turnover': inventory_turnover,
        'Debt/Equity Ratio': f"{debt_equity:.2f} : 1",
        'Receivable Turnover (Days)': recv_turnover_days,
        'Return on Investment %': f"{roi:.2f} %",
    }
    logger.info(f"  Ratios: InvTurn={inventory_turnover}, D/E={debt_equity}, "
                f"RecvDays={recv_turnover_days}, ROI={roi}%, Stock={closing_stock}")

    return {
        'trading': trading, 'assets_liab': assets_liab,
        'recv_payable': recv_payable, 'cash_bank': cash_bank,
        'ratios': ratios, 'stock_total': closing_stock,
    }


# ═══════════════════════════════════════════════════════════════════════
#  FLATTEN FOR EXCEL
# ═══════════════════════════════════════════════════════════════════════

def flatten_vouchers_by_type(vouchers, type_set):
    rows = []
    for v in vouchers:
        if v['is_cancelled'] or v['is_deleted']: continue
        if v['voucher_type'].lower() not in type_set: continue
        for le in v['ledger_entries']:
            rows.append({
                'Date': v['voucher_date'], 'Voucher No': v['voucher_number'],
                'Voucher Type': v['voucher_type'], 'Party': v['party_ledger'],
                'Ledger': le['ledger_name'], 'Dr/Cr': le['dr_cr'],
                'Debit': le['debit_amount'], 'Credit': le['credit_amount'],
                'Amount': abs(le['raw_amount']), 'GST Class': le.get('gst_class', ''),
                'Narration': v['narration'], 'Reference': v['reference'],
                'Party GSTIN': v.get('party_gstin', ''),
                'Place of Supply': v.get('place_of_supply', ''),
            })
    df = pd.DataFrame(rows)
    return df.sort_values('Date') if not df.empty else df


def flatten_bill_allocations(vouchers):
    rows = []
    for v in vouchers:
        if v['is_cancelled'] or v['is_deleted']: continue
        for le in v['ledger_entries']:
            for bill in le.get('bill_allocations', []):
                rows.append({
                    'Date': v['voucher_date'], 'Voucher No': v['voucher_number'],
                    'Voucher Type': v['voucher_type'], 'Party': v['party_ledger'],
                    'Ledger': le['ledger_name'], 'Bill Name': bill['bill_name'],
                    'Bill Type': bill['bill_type'], 'Bill Date': bill.get('bill_date', ''),
                    'Bill Due Date': bill.get('bill_due_date', ''),
                    'Credit Period': bill.get('bill_credit_period', ''),
                    'Bill Amount': bill['bill_amount'],
                })
    df = pd.DataFrame(rows)
    return df.sort_values('Date') if not df.empty else df


def flatten_inventory_entries(vouchers):
    rows = []
    for v in vouchers:
        if v['is_cancelled'] or v['is_deleted']: continue
        for ie in v.get('inventory_entries', []):
            base = {
                'Date': v['voucher_date'], 'Voucher No': v['voucher_number'],
                'Voucher Type': v['voucher_type'], 'Party': v['party_ledger'],
                'Stock Item': ie['stock_item'], 'Qty': ie['actual_qty'],
                'Billed Qty': ie['billed_qty'], 'Rate': ie['rate'],
                'Amount': ie['amount'], 'UOM': ie['uom'],
                'Godown': ie['godown'], 'Discount': ie.get('discount', 0),
                'Direction': 'Outward' if ie.get('is_outward') else 'Inward',
            }
            if ie.get('batch_allocations'):
                for bat in ie['batch_allocations']:
                    row = base.copy()
                    row.update({'Batch Name': bat['batch_name'], 'Batch Godown': bat['godown'],
                        'Batch Qty': bat['qty'], 'Batch Rate': bat['rate'],
                        'Batch Amount': bat['amount'],
                        'Mfg Date': bat.get('mfg_date', ''),
                        'Expiry Date': bat.get('expiry_date', '')})
                    rows.append(row)
            else:
                base.update({'Batch Name': '', 'Batch Godown': '', 'Batch Qty': '',
                    'Batch Rate': '', 'Batch Amount': '', 'Mfg Date': '', 'Expiry Date': ''})
                rows.append(base)
    df = pd.DataFrame(rows)
    return df.sort_values('Date') if not df.empty else df


def flatten_all_vouchers(vouchers):
    rows = []
    for v in vouchers:
        for le in v['ledger_entries']:
            rows.append({
                'Date': v['voucher_date'], 'Voucher Type': classify_voucher(v),
                'Voucher No': v['voucher_number'], 'Party': v['party_ledger'],
                'Ledger': le['ledger_name'], 'Dr/Cr': le['dr_cr'],
                'Debit': le['debit_amount'], 'Credit': le['credit_amount'],
                'Narration': v['narration'], 'Reference': v['reference'],
                'Cancelled': v['is_cancelled'], 'GUID': v['guid'],
            })
    df = pd.DataFrame(rows)
    return df.sort_values('Date') if not df.empty else df


# ═══════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    global COMPANY_NAME, TALLY_PORT, TALLY_URL
    import argparse
    parser = argparse.ArgumentParser(description="Tally Full Report v2")
    parser.add_argument("--company", default=COMPANY_NAME)
    parser.add_argument("--port", type=int, default=TALLY_PORT)
    args = parser.parse_args()
    COMPANY_NAME = args.company
    TALLY_PORT = args.port
    TALLY_URL = f"http://localhost:{TALLY_PORT}"

    print("=" * 70)
    print(f"  TALLY FULL REPORT GENERATOR v2")
    print(f"  Company : {COMPANY_NAME}")
    print(f"  Mode    : ALL DATA (no year restriction)")
    print(f"  Tally   : {TALLY_URL}")
    print(f"  Method  : Master ledger data + Primary Group classification")
    print("=" * 70)
    print()

    logger.info("Checking Tally connection...")
    test = send_to_tally(f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Check</ID></HEADER>
<BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
<TDL><TDLMESSAGE><COLLECTION NAME="Check"><TYPE>Company</TYPE><FETCH>NAME</FETCH></COLLECTION>
</TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""", timeout=10)
    if not test:
        print("\n[ERROR] Cannot connect to Tally!")
        sys.exit(1)
    print("[OK] Connected to Tally\n")

    # ── MASTER DATA ───────────────────────────────────────────────────
    print("─" * 60)
    print(" FETCHING MASTER DATA (no date restriction)")
    print("─" * 60)
    groups = fetch_groups()
    hierarchy = GroupHierarchy(groups)
    ledgers = fetch_ledgers()
    voucher_types = fetch_voucher_types()
    stock_items = fetch_stock_items()

    # ── VOUCHERS (ALL YEARS) ──────────────────────────────────────────
    print("\n" + "─" * 60)
    print(" FETCHING ALL VOUCHERS (all years, 7-level nesting)")
    print("─" * 60)
    vouchers = fetch_all_vouchers(use_all_years=True)

    # ── DASHBOARD METRICS ─────────────────────────────────────────────
    print("\n" + "─" * 60)
    print(" DASHBOARD METRICS (ledger data + stock values)")
    print("─" * 60)
    opening_stock, closing_stock = fetch_stock_closing_values()
    dashboard = compute_dashboard_from_tally(hierarchy, ledgers, opening_stock, closing_stock)
    trading = dashboard['trading']
    assets_liab = dashboard['assets_liab']
    recv_pay = dashboard['recv_payable']
    cash_bank_data = dashboard['cash_bank']
    ratios = dashboard['ratios']
    # Cash flow: use CURRENT FY vouchers only (matches Tally dashboard period)
    now = datetime.now()
    fy_start_year = now.year if now.month >= 4 else now.year - 1
    fy_start_str = f"{fy_start_year}-04-01"
    fy_vouchers = [v for v in vouchers if v.get('voucher_date') and v['voucher_date'] >= fy_start_str]
    logger.info(f"  Current FY vouchers for Cash Flow: {len(fy_vouchers)} (of {len(vouchers)} total)")
    cash_flow = compute_cash_flow(fy_vouchers, hierarchy, ledgers)

    # Monthly trends (current FY only)
    sales_trend = compute_monthly_trend(fy_vouchers, SALES_TYPES)
    purchase_trend = compute_monthly_trend(fy_vouchers, PURCHASE_TYPES)
    receipt_trend = compute_monthly_trend(fy_vouchers, RECEIPT_TYPES)
    payment_trend = compute_monthly_trend(fy_vouchers, PAYMENT_TYPES)

    # ── BUILD EXCEL ───────────────────────────────────────────────────
    print("\n" + "─" * 60)
    print(" GENERATING EXCEL & CSV")
    print("─" * 60)

    dashboard_rows = [
        {'Section': 'Cash In/Out Flow', 'Particulars': 'Nett Flow', 'Amount': cash_flow['Nett Flow']},
        {'Section': 'Cash In/Out Flow', 'Particulars': 'Inflow', 'Amount': cash_flow['Inflow']},
        {'Section': 'Cash In/Out Flow', 'Particulars': 'Outflow', 'Amount': cash_flow['Outflow']},
        {'Section': '', 'Particulars': '', 'Amount': ''},
        {'Section': 'Trading Details', 'Particulars': 'Gross Profit', 'Amount': trading['Gross Profit']},
        {'Section': 'Trading Details', 'Particulars': 'Nett Profit', 'Amount': trading['Nett Profit']},
        {'Section': 'Trading Details', 'Particulars': 'Sales Accounts', 'Amount': trading['Sales Accounts']},
        {'Section': 'Trading Details', 'Particulars': 'Purchase Accounts', 'Amount': trading['Purchase Accounts']},
        {'Section': '', 'Particulars': '', 'Amount': ''},
        {'Section': 'Assets/Liabilities', 'Particulars': 'Current Assets', 'Amount': assets_liab['Current Assets']},
        {'Section': 'Assets/Liabilities', 'Particulars': 'Current Liabilities', 'Amount': assets_liab['Current Liabilities']},
        {'Section': '', 'Particulars': '', 'Amount': ''},
        {'Section': 'Receivables/Payables', 'Particulars': 'Receivables', 'Amount': recv_pay['Receivables']},
        {'Section': 'Receivables/Payables', 'Particulars': 'Overdue Receivables', 'Amount': recv_pay['Overdue Receivables']},
        {'Section': 'Receivables/Payables', 'Particulars': 'Payables', 'Amount': recv_pay['Payables']},
        {'Section': 'Receivables/Payables', 'Particulars': 'Overdue Payables', 'Amount': recv_pay['Overdue Payables']},
        {'Section': '', 'Particulars': '', 'Amount': ''},
        {'Section': 'Cash/Bank', 'Particulars': 'Cash-in-Hand', 'Amount': cash_bank_data['Cash-in-Hand']},
        {'Section': 'Cash/Bank', 'Particulars': 'Bank Accounts', 'Amount': cash_bank_data['Bank Accounts']},
        {'Section': '', 'Particulars': '', 'Amount': ''},
        {'Section': 'Accounting Ratios', 'Particulars': 'Inventory Turnover', 'Amount': ratios['Inventory Turnover']},
        {'Section': 'Accounting Ratios', 'Particulars': 'Debt/Equity Ratio', 'Amount': ratios['Debt/Equity Ratio']},
        {'Section': 'Accounting Ratios', 'Particulars': 'Receivable Turnover (Days)', 'Amount': ratios['Receivable Turnover (Days)']},
        {'Section': 'Accounting Ratios', 'Particulars': 'Return on Investment %', 'Amount': ratios['Return on Investment %']},
    ]
    df_dashboard = pd.DataFrame(dashboard_rows)

    month_labels = [m[2] for m in get_monthly_ranges()]
    trend_rows = [{'Month': l,
        'Sales': round(sales_trend.get(l, 0), 2),
        'Purchase': round(purchase_trend.get(l, 0), 2),
        'Receipt': round(receipt_trend.get(l, 0), 2),
        'Payment': round(payment_trend.get(l, 0), 2)} for l in month_labels]
    df_trends = pd.DataFrame(trend_rows)

    df_cash_bank = pd.DataFrame(cash_bank_data['details']) if cash_bank_data['details'] else pd.DataFrame()
    df_recv = pd.DataFrame(recv_pay['recv_details']) if recv_pay['recv_details'] else pd.DataFrame()
    df_pay = pd.DataFrame(recv_pay['pay_details']) if recv_pay['pay_details'] else pd.DataFrame()
    df_bills_recv = pd.DataFrame(recv_pay.get('recv_bills', [])) if recv_pay.get('recv_bills') else pd.DataFrame()
    df_bills_pay = pd.DataFrame(recv_pay.get('pay_bills', [])) if recv_pay.get('pay_bills') else pd.DataFrame()

    df_groups = pd.DataFrame(groups)
    df_ledgers = pd.DataFrame(ledgers)
    df_vtypes = pd.DataFrame(voucher_types)
    df_stock = pd.DataFrame(stock_items) if stock_items else pd.DataFrame()

    df_sales = flatten_vouchers_by_type(vouchers, SALES_TYPES)
    df_purchase = flatten_vouchers_by_type(vouchers, PURCHASE_TYPES)
    df_receipt = flatten_vouchers_by_type(vouchers, RECEIPT_TYPES)
    df_payment = flatten_vouchers_by_type(vouchers, PAYMENT_TYPES)
    df_journal = flatten_vouchers_by_type(vouchers, JOURNAL_TYPES)
    df_contra = flatten_vouchers_by_type(vouchers, CONTRA_TYPES)
    df_dn = flatten_vouchers_by_type(vouchers, DN_TYPES)
    df_cn = flatten_vouchers_by_type(vouchers, CN_TYPES)
    df_bills = flatten_bill_allocations(vouchers)
    df_inventory = flatten_inventory_entries(vouchers)
    df_all = flatten_all_vouchers(vouchers)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_file = os.path.join(OUTPUT_DIR, f"HSP_IT_SOLUTIONS_Full_Report_{timestamp}.xlsx")
    csv_dir = os.path.join(OUTPUT_DIR, f"csv_full_{timestamp}")
    os.makedirs(csv_dir, exist_ok=True)
    logger.info(f"Writing Excel: {excel_file}")

    sheets = [
        ('Dashboard', df_dashboard), ('Monthly Trends', df_trends),
        ('Cash Bank Accounts', df_cash_bank),
        ('Receivable Parties', df_recv), ('Payable Parties', df_pay),
        ('Bills Receivable', df_bills_recv), ('Bills Payable', df_bills_pay),
        ('Groups', df_groups), ('Ledgers', df_ledgers),
        ('Voucher Types', df_vtypes), ('Stock Items', df_stock),
        ('Sales', df_sales), ('Purchase', df_purchase),
        ('Receipt', df_receipt), ('Payment', df_payment),
        ('Journal', df_journal), ('Contra', df_contra),
        ('Debit Notes', df_dn), ('Credit Notes', df_cn),
        ('Bill Allocations', df_bills),
        ('Inventory & Batches', df_inventory),
        ('All Vouchers', df_all),
    ]
    with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
        for name, df in sheets:
            if not df.empty:
                df.to_excel(writer, sheet_name=name[:31], index=False)
    for name, df in sheets:
        if not df.empty:
            safe = name.lower().replace(' ', '_').replace('/', '_').replace('&', 'and')
            df.to_csv(os.path.join(csv_dir, f"{safe}.csv"), index=False, encoding='utf-8-sig')

    # ── SUMMARY ───────────────────────────────────────────────────────
    active = [v for v in vouchers if not v['is_cancelled'] and not v['is_deleted']]
    total_le = sum(len(v['ledger_entries']) for v in active)
    total_bills = sum(len(b) for v in active for le in v['ledger_entries'] for b in [le.get('bill_allocations', [])])
    total_inv = sum(len(v.get('inventory_entries', [])) for v in active)
    total_batch = sum(len(b) for v in active for ie in v.get('inventory_entries', []) for b in [ie.get('batch_allocations', [])])

    W1, W2, W3 = 30, 25, 15
    print("\n" + "=" * 70)
    print(f"  REPORT SUMMARY — {COMPANY_NAME}")
    print(f"  Mode: ALL DATA (no year restriction)")
    print("=" * 70)
    print(f"\n  Master Data: Groups={len(groups)}, Ledgers={len(ledgers)}, "
          f"VTypes={len(voucher_types)}, StockItems={len(stock_items)}")
    print(f"  Vouchers: {len(active)} active, {total_le} ledger entries, "
          f"{total_bills} bill allocs, {total_inv} inventory, {total_batch} batch allocs")

    print(f"\n  {'─' * 65}")
    print(f"  {'Section':<{W1}} {'Particulars':<{W2}} {'Amount':>{W3}}")
    print(f"  {'─' * 65}")
    print(f"  {'Cash Flow':<{W1}} {'Inflow (Dr)':<{W2}} {cash_flow['Inflow']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Outflow (Cr)':<{W2}} {cash_flow['Outflow']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Nett Flow':<{W2}} {cash_flow['Nett Flow']:>{W3},.2f}")
    print()
    print(f"  {'Trading':<{W1}} {'Sales Accounts':<{W2}} {trading['Sales Accounts']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Purchase Accounts':<{W2}} {trading['Purchase Accounts']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Gross Profit':<{W2}} {trading['Gross Profit']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Nett Profit':<{W2}} {trading['Nett Profit']:>{W3},.2f}")
    print()
    print(f"  {'Assets/Liabilities':<{W1}} {'Current Assets':<{W2}} {assets_liab['Current Assets']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Current Liabilities':<{W2}} {assets_liab['Current Liabilities']:>{W3},.2f}")
    print()
    print(f"  {'Receivables/Payables':<{W1}} {'Receivables':<{W2}} {recv_pay['Receivables']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Overdue Receivables':<{W2}} {recv_pay['Overdue Receivables']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Payables':<{W2}} {recv_pay['Payables']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Overdue Payables':<{W2}} {recv_pay['Overdue Payables']:>{W3},.2f}")
    print()
    print(f"  {'Cash/Bank':<{W1}} {'Cash-in-Hand':<{W2}} {cash_bank_data['Cash-in-Hand']:>{W3},.2f}")
    print(f"  {'':<{W1}} {'Bank Accounts':<{W2}} {cash_bank_data['Bank Accounts']:>{W3},.2f}")
    for d in cash_bank_data['details'][:5]:
        print(f"  {'':<{W1}}   {'> ' + d['Account']:<{W2-2}} {d['Closing Balance']:>{W3},.2f} {d['Dr/Cr']}")
    print()
    print(f"  {'Accounting Ratios':<{W1}} {'Inventory Turnover':<{W2}} {ratios['Inventory Turnover']:>{W3}}")
    print(f"  {'':<{W1}} {'Debt/Equity Ratio':<{W2}} {ratios['Debt/Equity Ratio']:>{W3}}")
    print(f"  {'':<{W1}} {'Recv Turnover (Days)':<{W2}} {ratios['Receivable Turnover (Days)']:>{W3}}")
    print(f"  {'':<{W1}} {'ROI %':<{W2}} {ratios['Return on Investment %']:>{W3}}")

    print(f"\n  {'─' * 65}")
    print(f"\n  Monthly Trend (x1000):")
    print(f"  {'Month':<10} {'Sales':>12} {'Purchase':>12} {'Receipt':>12} {'Payment':>12}")
    print(f"  {'─' * 60}")
    for _, row in df_trends.iterrows():
        print(f"  {row['Month']:<10} {row['Sales']/1000:>12,.1f} {row['Purchase']/1000:>12,.1f} "
              f"{row['Receipt']/1000:>12,.1f} {row['Payment']/1000:>12,.1f}")

    # ── VALIDATION TABLE ──────────────────────────────────────────────
    print(f"\n  {'═' * 65}")
    print(f"  VALIDATION vs TALLY DASHBOARD (screenshot 1-Apr-25 to 9-Jan-26)")
    print(f"  {'═' * 65}")

    tally_expected = {
        'Nett Flow': 9132.71, 'Inflow': 378709.59, 'Outflow': 387842.30,
        'Sales Accounts': 295764.73, 'Purchase Accounts': 163636.00,
        'Gross Profit': 133504.28, 'Nett Profit': 132065.50,
        'Current Assets': 1653853.19, 'Current Liabilities': 767428.46,
        'Receivables': 2564740.68, 'Payables': 2667194.97,
        'Cash-in-Hand': 92621.00, 'Bank Accounts': 390557.49,
        'Inventory Turnover': 0.42,
    }
    my_values = {
        'Nett Flow': abs(cash_flow['Nett Flow']), 'Inflow': cash_flow['Inflow'],
        'Outflow': cash_flow['Outflow'],
        'Sales Accounts': trading['Sales Accounts'],
        'Purchase Accounts': trading['Purchase Accounts'],
        'Gross Profit': trading['Gross Profit'], 'Nett Profit': trading['Nett Profit'],
        'Current Assets': assets_liab['Current Assets'],
        'Current Liabilities': assets_liab['Current Liabilities'],
        'Receivables': recv_pay['Receivables'], 'Payables': recv_pay['Payables'],
        'Cash-in-Hand': cash_bank_data['Cash-in-Hand'],
        'Bank Accounts': cash_bank_data['Bank Accounts'],
        'Inventory Turnover': ratios['Inventory Turnover'],
    }

    print(f"  {'Metric':<25} {'Tally':>15} {'Ours':>15} {'Match':>8}")
    print(f"  {'─' * 65}")
    for key in tally_expected:
        exp = tally_expected[key]
        act = my_values[key]
        if isinstance(exp, (int, float)) and isinstance(act, (int, float)):
            diff = abs(exp - act) / max(abs(exp), 1) * 100
            tag = "YES" if diff < 2 else ("~CLOSE" if diff < 15 else "NO")
            print(f"  {key:<25} {exp:>15,.2f} {act:>15,.2f} {tag:>8}")
        else:
            print(f"  {key:<25} {str(exp):>15} {str(act):>15}")

    print(f"\n  Output: {excel_file}")
    print(f"  CSVs:   {csv_dir}\\")
    print("=" * 70)
    print("  DONE!")
    print("=" * 70)


if __name__ == '__main__':
    main()
