"""
Voucher Sync - Fetch ALL voucher data from Tally and send to Backend
Supports incremental sync via AlterID filtering.
Handles compound quantities, forex amounts, due date calculations.

Usage:
    python sync_vouchers.py <company_id> <company_guid> <tally_port> <backend_url> 
                            <auth_token> <device_token> <from_date> <to_date> 
                            <last_alter_id> <company_name> <user_id>
"""

import requests
import json
import logging
import sys
import time
import re
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from sync_logger import get_sync_logger
import xml.etree.ElementTree as ET

# Production logging configuration
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

if __name__ == "__main__":
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL),
        format='%(asctime)s - %(levelname)s - %(message)s' if VERBOSE_MODE else '%(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)


class VoucherSyncManager:
    """Production voucher sync from Tally to Backend with ALL fields.
    
    Supports:
    - Incremental sync via AlterID
    - Compound quantity parsing (e.g. '10 Nos', '5 Kg')
    - Forex amount parsing (e.g. '-$1890.00 @ ₹96.55/$ = -₹182483.30')
    - Bill due date calculation (bill_date + credit_period)
    - 7-level nested data: Voucher → LedgerEntries → Bills/CostCategories → CostCentres
    -                       Voucher → InventoryEntries → BatchAllocations
    """
    
    BATCH_SIZE = 50   # Smaller batch for deeply nested voucher data
    BATCH_DELAY = 0.3  # 300ms delay between batches
    
    def __init__(self, backend_url: str, auth_token: str, device_token: str):
        self.backend_url = backend_url.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
    
    def verify_tally_company(self, tally_host: str, tally_port: int, expected_company_name: str) -> tuple:
        """Verify that the expected company is loaded/open in Tally Prime.
        
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

        tally_url = f"http://{tally_host}:{tally_port}"
        try:
            resp = requests.post(tally_url, data=xml_req.encode('utf-8'),
                                 headers={'Content-Type': 'application/xml'},
                                 timeout=10)
            if resp.status_code != 200:
                logger.warning(f"⚠️ Could not verify Tally companies (HTTP {resp.status_code})")
                return True, []

            text = self.clean_xml(resp.text)
            root = ET.fromstring(text)
            
            companies = []
            for elem in root.iter('COMPANY'):
                name = elem.findtext('NAME') or elem.get('NAME', '')
                if name:
                    companies.append(name.strip())
            
            for elem in root.iter('TALLYMESSAGE'):
                for child in elem:
                    if child.tag == 'COMPANY':
                        name = child.get('NAME', '') or child.text or ''
                        if name.strip() and name.strip() not in companies:
                            companies.append(name.strip())

            if not companies:
                for elem in root.iter():
                    if elem.text and expected_company_name.lower() in elem.text.lower():
                        return True, [expected_company_name]
                logger.warning(f"⚠️ Could not parse company list from Tally (empty)")
                return True, []

            expected_lower = expected_company_name.strip().lower()
            for company in companies:
                if company.lower() == expected_lower:
                    logger.info(f"✅ Company '{expected_company_name}' is loaded in Tally")
                    return True, companies
            
            for company in companies:
                if expected_lower in company.lower() or company.lower() in expected_lower:
                    logger.warning(f"⚠️ Partial company name match: expected='{expected_company_name}', found='{company}'")
                    return True, companies

            logger.error(f"❌ Company '{expected_company_name}' is NOT loaded in Tally!")
            logger.error(f"   Loaded companies: {companies}")
            return False, companies

        except requests.exceptions.ConnectionError:
            logger.error(f"❌ Cannot connect to Tally at {tally_url}")
            return False, []
        except Exception as e:
            logger.warning(f"⚠️ Error verifying Tally company: {e}")
            return True, []
    
    # ─── AlterID Management ──────────────────────────────────────────
    
    def get_last_alter_id(self, company_id: int) -> int:
        """Fetch last synced voucher AlterID from backend"""
        try:
            url = f"{self.backend_url}/api/companies/{company_id}/last-voucher-alter-id"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                last_id = data.get('lastAlterID', 0)
                logger.info(f"📌 Last synced voucher AlterID: {last_id}")
                return last_id
            else:
                logger.warning(f"⚠️ Could not fetch last AlterID (HTTP {response.status_code}), starting from 0")
                return 0
        except Exception as e:
            logger.warning(f"⚠️ Error fetching last AlterID: {e}")
            return 0
    
    def save_last_alter_id(self, company_id: int, alter_id: int) -> bool:
        """Save last synced voucher AlterID to backend"""
        try:
            url = f"{self.backend_url}/api/companies/{company_id}/last-voucher-alter-id"
            payload = {
                'lastAlterID': alter_id
            }
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            return response.status_code in [200, 201]
        except Exception as e:
            logger.warning(f"⚠️ Error saving AlterID: {e}")
            return False
    
    # ─── XML Parsing Utilities ───────────────────────────────────────
    
    def get_text(self, elem, tag: str, default='') -> str:
        """Safely extract text from XML element"""
        if elem is None:
            return default
        child = elem.find(tag)
        if child is not None and child.text:
            return child.text.strip()
        return default
    
    def get_bool(self, elem, tag: str) -> bool:
        """Convert Tally Yes/No to boolean"""
        return self.get_text(elem, tag, 'No').lower() == 'yes'
    
    def parse_tally_date(self, date_str: str) -> Optional[str]:
        """Convert Tally date (20250612) to SQL date (2025-06-12)"""
        if not date_str or len(date_str) != 8:
            return None
        try:
            return f"{date_str[0:4]}-{date_str[4:6]}-{date_str[6:8]}"
        except Exception:
            return None
    
    def parse_amount(self, value: str) -> float:
        """Parse Tally amount - handles forex like '-$1890.00 @ ₹96.55/$ = -₹182483.30'"""
        if not value:
            return 0.0
        value = value.strip()
        
        # Forex: extract base currency amount after '=' sign
        if '=' in value:
            after_eq = value.split('=')[-1].strip()
            # Remove currency symbols (₹, ?, $, etc.) and commas
            cleaned = re.sub(r'[^\d.\-]', '', after_eq)
            try:
                return float(cleaned)
            except ValueError:
                pass
        
        # Standard: remove commas and currency symbols
        cleaned = re.sub(r'[^\d.\-]', '', value.replace(',', ''))
        try:
            return float(cleaned) if cleaned else 0.0
        except ValueError:
            return 0.0
    
    def get_amount(self, elem, tag: str) -> float:
        """Extract amount from XML element"""
        value = self.get_text(elem, tag, '0')
        return self.parse_amount(value)
    
    def parse_tally_qty(self, value: str) -> float:
        """Parse Tally compound quantity like '10 Nos', '5 Pcs', '-3 Kg'"""
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
    
    def get_qty(self, elem, tag: str) -> float:
        """Get quantity - handles compound quantities"""
        value = self.get_text(elem, tag, '0')
        return self.parse_tally_qty(value)
    
    # ─── Backend Format Conversion ────────────────────────────────
    
    def _snake_to_camel(self, name: str) -> str:
        """Convert snake_case to camelCase: 'voucher_number' → 'voucherNumber'"""
        components = name.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])
    
    def _convert_keys_to_camel(self, data):
        """Recursively convert all dict keys from snake_case to camelCase.
        Also renames: all_ledger_entries → ledgerEntries, all_inventory_entries → inventoryEntries
        """
        RENAMES = {
            'allLedgerEntries': 'ledgerEntries',
            'allInventoryEntries': 'inventoryEntries',
            'costCategoryAllocations': 'costCategoryAllocations',
            'costCentreAllocations': 'costCentreAllocations',
        }
        if isinstance(data, dict):
            result = {}
            for k, v in data.items():
                camel = self._snake_to_camel(k)
                camel = RENAMES.get(camel, camel)
                result[camel] = self._convert_keys_to_camel(v)
            return result
        elif isinstance(data, list):
            return [self._convert_keys_to_camel(item) for item in data]
        return data
    
    def calculate_due_date(self, bill_date: Optional[str], credit_period: str) -> Optional[str]:
        """Calculate due date = bill_date + credit_period days"""
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
    
    def clean_xml(self, xml_string: str) -> str:
        """Remove invalid XML characters and strip namespace prefixes (e.g. UDF:)"""
        # Strip namespace prefixes like <UDF:FIELD> → <UDF_FIELD>
        xml_string = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', xml_string)
        # Remove invalid XML character entities
        return re.sub(
            r'&#([0-9]+);',
            lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
            xml_string
        )
    
    # ─── TDL Generation ─────────────────────────────────────────────

    def generate_voucher_identity_tdl(self, from_date: str, to_date: str,
                                       company_name: str = None) -> str:
        """Generate lightweight TDL to fetch ALL voucher identity records (NO AlterID filter).
        Used for reconciliation — only GUID, MASTERID, ALTERID, voucher number/type."""
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        return f"""<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of Vouchers</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
                <SVTODATE TYPE="Date">{to_date}</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>{company_var}
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of Vouchers" ISMODIFY="No">
                        <TYPE>Voucher</TYPE>
                        <FETCH>GUID, MASTERID, ALTERID, VOUCHERNUMBER, VOUCHERTYPENAME, DATE</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""

    def _parse_voucher_identity_xml(self, xml_string: str) -> List[Dict]:
        """Parse lightweight voucher identity XML for reconciliation"""
        try:
            xml_string = self.clean_xml(xml_string)
            root = ET.fromstring(xml_string)
            records = []
            for elem in root.iter('VOUCHER'):
                guid = (elem.findtext('GUID') or '').strip()
                master_id = (elem.findtext('MASTERID') or '').strip()
                alter_id_str = (elem.findtext('ALTERID') or '0').strip()
                try:
                    alter_id = int(alter_id_str)
                except (ValueError, TypeError):
                    alter_id = 0
                if not guid or alter_id == 0:
                    continue
                voucher_number = (elem.findtext('VOUCHERNUMBER') or '').strip()
                voucher_type = (elem.findtext('VOUCHERTYPENAME') or '').strip()
                records.append({
                    'guid': guid,
                    'masterID': master_id,
                    'alterID': alter_id,
                    'name': f"{voucher_type} {voucher_number}".strip() or guid
                })
            return records
        except Exception as e:
            logger.error(f"❌ Error parsing voucher identity XML: {e}")
            return []

    def _fetch_db_vouchers(self, company_id: int) -> List[Dict]:
        """Fetch ALL voucher records from database for reconciliation comparison"""
        try:
            url = f"{self.backend_url}/vouchers/company/{company_id}"
            response = requests.get(url, headers=self.headers, timeout=300)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    return data.get('data', data.get('content', []))
                return []
            else:
                logger.error(f"❌ Failed to fetch DB vouchers: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"❌ Error fetching DB vouchers: {e}")
            return []

    def _reconcile_vouchers_inline(self, company_id: int, tally_host: str, tally_port: int,
                                    from_date: str, to_date: str, company_name: str = None) -> Dict:
        """Inline voucher reconciliation: ONE Tally identity fetch + DB comparison.
        
        Returns reconciliation results: {tallyCount, dbCount, missing, updated, synced}
        """
        logger.info(f"   🔍 Voucher reconciliation: fetching identity records from Tally...")

        # 1. Fetch ALL voucher identities from Tally (lightweight, 1 HTTP call)
        tdl = self.generate_voucher_identity_tdl(from_date, to_date, company_name)
        xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)
        if not xml_response:
            logger.warning(f"   ⚠️ Could not fetch voucher identities for reconciliation")
            return {'tallyCount': 0, 'dbCount': 0, 'missing': 0, 'updated': 0, 'synced': 0, 'error': 'Tally fetch failed'}

        tally_records = self._parse_voucher_identity_xml(xml_response)
        tally_count = len(tally_records)

        # 2. Fetch ALL vouchers from DB
        db_records = self._fetch_db_vouchers(company_id)
        db_count = len(db_records)

        logger.info(f"   📊 Reconciliation: Tally={tally_count}, DB={db_count}")

        if tally_count == 0 and db_count > 0:
            logger.warning(f"   ⚠️ Tally returned 0 vouchers but DB has {db_count} — skipping reconciliation")
            return {'tallyCount': 0, 'dbCount': db_count, 'missing': 0, 'updated': 0, 'synced': 0}

        # 3. Compare by GUID
        tally_guid_map = {r['guid']: r for r in tally_records}
        db_guid_set = set()
        db_alter_map = {}
        for rec in db_records:
            guid = rec.get('guid') or rec.get('GUID') or ''
            if guid:
                db_guid_set.add(guid)
                alter_val = rec.get('alterId') or rec.get('alterID') or rec.get('alter_id') or 0
                if isinstance(alter_val, str):
                    try:
                        alter_val = int(alter_val)
                    except (ValueError, TypeError):
                        alter_val = 0
                db_alter_map[guid] = alter_val

        missing_count = 0
        stale_count = 0
        for guid, tally_rec in tally_guid_map.items():
            if guid in db_guid_set:
                if tally_rec['alterID'] > db_alter_map.get(guid, 0):
                    stale_count += 1
            else:
                missing_count += 1

        total_issues = missing_count + stale_count
        if total_issues > 0:
            logger.info(f"   ⚠️ Reconciliation found: {missing_count} missing, {stale_count} stale")
        else:
            logger.info(f"   ✅ Reconciliation: all vouchers in sync")

        return {
            'tallyCount': tally_count,
            'dbCount': db_count,
            'missing': missing_count,
            'updated': stale_count,
            'synced': 0  # Not auto-syncing vouchers inline (too complex with nested data)
        }

    def generate_voucher_tdl(self, last_alter_id: int, from_date: str, to_date: str,
                              company_name: str = None) -> str:
        """Generate TDL to fetch ALL voucher fields with 7 nested collections"""
        
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        
        return f"""<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of Vouchers</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">{from_date}</SVFROMDATE>
                <SVTODATE TYPE="Date">{to_date}</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>{company_var}
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of Vouchers" ISMODIFY="No">
                        <TYPE>Voucher</TYPE>
                        <FETCH>GUID, MASTERID, ALTERID, DATE, EFFECTIVEDATE, VOUCHERTYPENAME,
                               VOUCHERNUMBER, VOUCHERNUMBERSERIES, PARTYLEDGERNAME, PARTYNAME,
                               REFERENCE, NARRATION, PERSISTEDVIEW,
                               ISOPTIONAL, ISDELETED, ISCANCELLED, ISVOID, ISONHOLD, ISPOSTDATED,
                               ISINVOICE, HASCASHFLOW, HASDISCOUNTS, ISDEEMEDPOSITIVE,
                               ISREVERSECHARGEAPPLICABLE,
                               VOUCHERKEY, VOUCHERRETAINKEY, REMOTEID, REMOTEALTGUID,
                               PARTYGSTIN, CMPGSTIN, CMPGSTREGISTRATIONTYPE, CMPGSTSTATE,
                               GSTREGISTRATION, PLACEOFSUPPLY, IRN, IRNACKNO, IRNACKDATE,
                               IRNQRCODE, VCHGSTCLASS,
                               ALLLEDGERENTRIES.LIST, ALLINVENTORYENTRIES.LIST</FETCH>
                        <FILTERS>AlterIdFilter</FILTERS>
                    </COLLECTION>
                    <COLLECTION NAME="AllLedgerEntries">
                        <TYPE>Voucher : AllLedgerEntries</TYPE>
                        <FETCH>LEDGERNAME, LEDGERGUID, AMOUNT, ISDEEMEDPOSITIVE, ISPARTYLEDGER,
                               LEDGERFROMITEM, GSTCLASS, APPROPRIATEFOR,
                               BILLALLOCATIONS.LIST, CATEGORYALLOCATIONS.LIST</FETCH>
                    </COLLECTION>
                    <COLLECTION NAME="BillAllocations">
                        <TYPE>Voucher : AllLedgerEntries : BillAllocations</TYPE>
                        <FETCH>NAME, BILLTYPE, AMOUNT, BILLNUMBER, BILLDATE, BILLCREDITPERIOD,
                               TDSDEDUCTEEISSPECIALRATE</FETCH>
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
                               UOM, ALTERNATEUOM, GODOWNNAME, DISCOUNT, TRACKINGNUMBER,
                               ISDEEMEDPOSITIVE, BATCHALLOCATIONS.LIST</FETCH>
                    </COLLECTION>
                    <COLLECTION NAME="BatchAllocations">
                        <TYPE>Voucher : AllInventoryEntries : BatchAllocations</TYPE>
                        <FETCH>BATCHNAME, GODOWNNAME, AMOUNT, RATE, MFGDATE, EXPIRYDATE,
                               DESTINATIONGODOWNNAME</FETCH>
                    </COLLECTION>
                    <SYSTEM TYPE="FORMULAE" NAME="AlterIdFilter"> $Alterid > {last_alter_id} </SYSTEM>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    # ─── Fetch from Tally ────────────────────────────────────────────
    
    def fetch_from_tally(self, tdl: str, tally_host: str, tally_port: int) -> Optional[str]:
        """Fetch voucher XML from Tally"""
        try:
            url = f"http://{tally_host}:{tally_port}"
            response = requests.post(
                url,
                data=tdl,
                headers={'Content-Type': 'application/xml'},
                timeout=30  # Reduced from 300 for better responsiveness
            )
            if response.status_code == 200:
                logger.info(f"✅ Fetched voucher data from Tally ({len(response.text):,} bytes)")
                return response.text
            else:
                logger.error(f"❌ Tally HTTP {response.status_code}")
                return None
        except requests.exceptions.ConnectionError:
            logger.error("❌ Could not connect to Tally Prime")
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching from Tally: {e}")
            return None
    
    # ─── XML Parsing ─────────────────────────────────────────────────
    
    def parse_voucher_xml(self, xml_string: str) -> List[Dict]:
        """Parse full voucher XML with all nested collections"""
        try:
            xml_string = self.clean_xml(xml_string)
            root = ET.fromstring(xml_string)
            vouchers = []
            
            for voucher_elem in root.iter('VOUCHER'):
                v = self.parse_single_voucher(voucher_elem)
                if v:
                    vouchers.append(v)
            
            logger.info(f"✅ Parsed {len(vouchers)} vouchers")
            return vouchers
        except Exception as e:
            logger.error(f"❌ Error parsing voucher XML: {e}")
            return []
    
    def parse_single_voucher(self, elem) -> Optional[Dict]:
        """Parse single voucher element with ALL nested data"""
        try:
            guid = self.get_text(elem, 'GUID')
            alter_id = int(self.get_text(elem, 'ALTERID', '0'))
            if not guid or alter_id == 0:
                return None
            
            voucher_number = self.get_text(elem, 'VOUCHERNUMBER')
            voucher_date = self.parse_tally_date(self.get_text(elem, 'DATE'))
            voucher_type = self.get_text(elem, 'VOUCHERTYPENAME')
            
            # Parse all ledger entries
            ledger_entries = self._parse_ledger_entries(elem, guid, voucher_number, voucher_date, voucher_type)
            
            # Calculate total amount = sum of all debit-side entries (Dr amounts)
            # In Tally ALLLEDGERENTRIES: positive AMOUNT = Debit, negative = Credit
            total_debit = sum(le['debit_amount'] for le in ledger_entries)
            total_credit = sum(le['credit_amount'] for le in ledger_entries)
            total_amount = total_debit  # Voucher total = debit side (equals credit side)
            
            # Parse all inventory entries
            inventory_entries = self._parse_inventory_entries(elem, guid, voucher_number, voucher_date, voucher_type)
            
            return {
                # Tally Identity
                'guid': guid,
                'master_id': int(self.get_text(elem, 'MASTERID', '0')),
                'alter_id': alter_id,
                'voucher_key': int(self.get_text(elem, 'VOUCHERKEY', '0')),
                'voucher_retain_key': int(self.get_text(elem, 'VOUCHERRETAINKEY', '0')),
                'remote_id': self.get_text(elem, 'REMOTEID'),
                'remote_alt_guid': self.get_text(elem, 'REMOTEALTGUID'),
                
                # Voucher Info
                'voucher_number': voucher_number,
                'voucher_type': voucher_type,
                'voucher_date': voucher_date,
                'effective_date': self.parse_tally_date(self.get_text(elem, 'EFFECTIVEDATE')),
                'voucher_number_series': self.get_text(elem, 'VOUCHERNUMBERSERIES'),
                'persisted_view': self.get_text(elem, 'PERSISTEDVIEW'),
                
                # Party Info
                'party_ledger_name': self.get_text(elem, 'PARTYLEDGERNAME') or self.get_text(elem, 'PARTYNAME'),
                'party_name': self.get_text(elem, 'PARTYNAME'),
                'amount': total_amount,
                'total_debit': total_debit,
                'total_credit': total_credit,
                
                # Reference
                'reference': self.get_text(elem, 'REFERENCE'),
                'narration': self.get_text(elem, 'NARRATION'),
                
                # GST
                'party_gstin': self.get_text(elem, 'PARTYGSTIN'),
                'company_gstin': self.get_text(elem, 'CMPGSTIN'),
                'company_gst_registration_type': self.get_text(elem, 'CMPGSTREGISTRATIONTYPE'),
                'company_gst_state': self.get_text(elem, 'CMPGSTSTATE'),
                'gst_registration': self.get_text(elem, 'GSTREGISTRATION'),
                'place_of_supply': self.get_text(elem, 'PLACEOFSUPPLY'),
                'vch_gst_class': self.get_text(elem, 'VCHGSTCLASS'),
                
                # E-Invoice
                'irn': self.get_text(elem, 'IRN'),
                'irn_ack_no': self.get_text(elem, 'IRNACKNO'),
                'irn_ack_date': self.parse_tally_date(self.get_text(elem, 'IRNACKDATE')),
                'irn_qr_code': self.get_text(elem, 'IRNQRCODE'),
                
                # Status Flags
                'is_optional': self.get_bool(elem, 'ISOPTIONAL'),
                'is_deleted': self.get_bool(elem, 'ISDELETED'),
                'is_cancelled': self.get_bool(elem, 'ISCANCELLED'),
                'is_void': self.get_bool(elem, 'ISVOID'),
                'is_on_hold': self.get_bool(elem, 'ISONHOLD'),
                'is_invoice': self.get_bool(elem, 'ISINVOICE'),
                'is_post_dated': self.get_bool(elem, 'ISPOSTDATED'),
                'has_cash_flow': self.get_bool(elem, 'HASCASHFLOW'),
                'has_discounts': self.get_bool(elem, 'HASDISCOUNTS'),
                'is_deemed_positive': self.get_bool(elem, 'ISDEEMEDPOSITIVE'),
                'is_reverse_charge_applicable': self.get_bool(elem, 'ISREVERSECHARGEAPPLICABLE'),
                
                # Nested Data
                'all_ledger_entries': ledger_entries,
                'all_inventory_entries': inventory_entries
            }
        except Exception as e:
            logger.warning(f"⚠️ Error parsing voucher: {e}")
            return None
    
    def _parse_ledger_entries(self, voucher_elem, guid, vch_num, vch_date, vch_type) -> List[Dict]:
        """Parse all ledger entries with nested bills and cost allocations"""
        entries = []
        
        for ledger_elem in voucher_elem.findall('.//ALLLEDGERENTRIES.LIST'):
            try:
                ledger_name = self.get_text(ledger_elem, 'LEDGERNAME')
                if not ledger_name:
                    continue
                
                amount = self.get_amount(ledger_elem, 'AMOUNT')
                is_deemed_positive = self.get_bool(ledger_elem, 'ISDEEMEDPOSITIVE')
                
                # Tally ALLLEDGERENTRIES AMOUNT convention:
                #   Positive amount = Debit (Dr) entry
                #   Negative amount = Credit (Cr) entry
                # ISDEEMEDPOSITIVE indicates the voucher type's default flow direction
                dr_cr = 'DR' if amount > 0 else 'CR'
                debit_amount = abs(amount) if amount > 0 else 0.0
                credit_amount = abs(amount) if amount < 0 else 0.0
                
                # Parse nested bill allocations
                bills = self._parse_bill_allocations(
                    ledger_elem, guid, vch_num, vch_date, vch_type, ledger_name
                )
                
                # Parse nested cost category allocations (with cost centres inside)
                cost_categories = self._parse_cost_category_allocations(
                    ledger_elem, guid, vch_num, vch_date, vch_type
                )
                
                entries.append({
                    'ledger_name': ledger_name,
                    'ledger_guid': self.get_text(ledger_elem, 'LEDGERGUID'),
                    'amount': amount,
                    'debit_amount': debit_amount,
                    'credit_amount': credit_amount,
                    'dr_cr': dr_cr,
                    'is_deemed_positive': is_deemed_positive,
                    'is_party_ledger': self.get_bool(ledger_elem, 'ISPARTYLEDGER'),
                    'ledger_from_item': self.get_bool(ledger_elem, 'LEDGERFROMITEM'),
                    'gst_class': self.get_text(ledger_elem, 'GSTCLASS'),
                    'appropriate_for': self.get_text(ledger_elem, 'APPROPRIATEFOR'),
                    'bill_allocations': bills,
                    'cost_category_allocations': cost_categories
                })
                
            except Exception as e:
                logger.warning(f"⚠️ Error parsing ledger entry: {e}")
                continue
        
        return entries
    
    def _parse_bill_allocations(self, ledger_elem, guid, vch_num, vch_date, vch_type, ledger_name) -> List[Dict]:
        """Parse bill allocations with due date calculation"""
        bills = []
        
        for bill_elem in ledger_elem.findall('.//BILLALLOCATIONS.LIST'):
            try:
                bill_date_str = self.get_text(bill_elem, 'BILLDATE')
                bill_date = self.parse_tally_date(bill_date_str) if bill_date_str else vch_date
                credit_period = self.get_text(bill_elem, 'BILLCREDITPERIOD', '0')
                bill_due_date = self.calculate_due_date(bill_date, credit_period)
                bill_amount = abs(self.get_amount(bill_elem, 'AMOUNT'))
                
                bills.append({
                    'bill_type': self.get_text(bill_elem, 'BILLTYPE', 'Voucher'),
                    'bill_name': self.get_text(bill_elem, 'NAME'),
                    'bill_ref': self.get_text(bill_elem, 'BILLNUMBER'),
                    'bill_date': bill_date,
                    'bill_due_date': bill_due_date,
                    'bill_credit_period': credit_period,
                    'bill_amount': bill_amount,
                    'tds_deductee_is_special_rate': self.get_bool(bill_elem, 'TDSDEDUCTEEISSPECIALRATE')
                })
            except Exception as e:
                logger.warning(f"⚠️ Error parsing bill allocation: {e}")
                continue
        
        return bills
    
    def _parse_cost_category_allocations(self, ledger_elem, guid, vch_num, vch_date, vch_type) -> List[Dict]:
        """Parse cost category allocations with nested cost centres"""
        categories = []
        
        for cat_elem in ledger_elem.findall('.//CATEGORYALLOCATIONS.LIST'):
            try:
                # Parse nested cost centres
                centres = []
                for centre_elem in cat_elem.findall('.//COSTCENTREALLOCATIONS.LIST'):
                    try:
                        centres.append({
                            'cost_centre_name': self.get_text(centre_elem, 'COSTCENTRENAME'),
                            'amount': abs(self.get_amount(centre_elem, 'AMOUNT'))
                        })
                    except Exception as e:
                        logger.warning(f"⚠️ Error parsing cost centre: {e}")
                        continue
                
                categories.append({
                    'category_name': self.get_text(cat_elem, 'CATEGORY'),
                    'amount': abs(self.get_amount(cat_elem, 'AMOUNT')),
                    'is_deemed_positive': self.get_bool(ledger_elem, 'ISDEEMEDPOSITIVE'),
                    'cost_centre_allocations': centres
                })
            except Exception as e:
                logger.warning(f"⚠️ Error parsing cost category: {e}")
                continue
        
        return categories
    
    def _parse_inventory_entries(self, voucher_elem, guid, vch_num, vch_date, vch_type) -> List[Dict]:
        """Parse all inventory entries with nested batch allocations"""
        entries = []
        
        for inv_elem in voucher_elem.findall('.//ALLINVENTORYENTRIES.LIST'):
            try:
                stock_name = self.get_text(inv_elem, 'STOCKITEMNAME')
                if not stock_name:
                    continue
                
                actual_qty = self.get_qty(inv_elem, 'ACTUALQTY')
                billed_qty = self.get_qty(inv_elem, 'BILLEDQTY')
                rate = self.get_qty(inv_elem, 'RATE')
                stock_amount = abs(self.get_amount(inv_elem, 'AMOUNT'))
                is_outward = actual_qty < 0
                uom = self.get_text(inv_elem, 'UOM')
                
                # Derive missing quantities
                if billed_qty == 0 and rate != 0 and stock_amount != 0:
                    billed_qty = abs(stock_amount / rate)
                elif billed_qty == 0:
                    billed_qty = abs(actual_qty)
                
                # Derive missing rate
                if rate == 0 and abs(actual_qty) != 0 and stock_amount != 0:
                    rate = stock_amount / abs(actual_qty)
                
                # Parse nested batch allocations
                batches = self._parse_batch_allocations(
                    inv_elem, guid, vch_num, vch_date, vch_type, stock_name, actual_qty, uom
                )
                
                entries.append({
                    'stock_item_name': stock_name,
                    'stock_item_guid': self.get_text(inv_elem, 'STOCKITEMGUID'),
                    'billed_qty': abs(billed_qty),
                    'actual_qty': abs(actual_qty),
                    'rate': rate,
                    'amount': stock_amount,
                    'discount': self.get_amount(inv_elem, 'DISCOUNT'),
                    'uom': uom,
                    'alternate_uom': self.get_text(inv_elem, 'ALTERNATEUOM'),
                    'rate_uom': uom,
                    'is_deemed_positive': actual_qty >= 0,
                    'is_outward': is_outward,
                    'godown_name': self.get_text(inv_elem, 'GODOWNNAME'),
                    'tracking_number': self.get_text(inv_elem, 'TRACKINGNUMBER'),
                    'batch_allocations': batches
                })
            except Exception as e:
                logger.warning(f"⚠️ Error parsing inventory entry: {e}")
                continue
        
        return entries
    
    def _parse_batch_allocations(self, inv_elem, guid, vch_num, vch_date, vch_type,
                                  stock_name, parent_qty, uom) -> List[Dict]:
        """Parse batch allocations with derived quantities"""
        batches = []
        batch_elems = inv_elem.findall('.//BATCHALLOCATIONS.LIST')
        
        for batch_elem in batch_elems:
            try:
                batch_amount = abs(self.get_amount(batch_elem, 'AMOUNT'))
                batch_rate = self.get_qty(batch_elem, 'RATE')
                
                # Derive batch qty: if single batch use parent qty, else calculate
                if len(batch_elems) == 1:
                    batch_qty = abs(parent_qty)
                elif batch_rate != 0:
                    batch_qty = abs(batch_amount / batch_rate)
                else:
                    batch_qty = abs(parent_qty)
                
                batches.append({
                    'batch_name': self.get_text(batch_elem, 'BATCHNAME'),
                    'godown_name': self.get_text(batch_elem, 'GODOWNNAME'),
                    'destination_godown': self.get_text(batch_elem, 'DESTINATIONGODOWNNAME'),
                    'batch_qty': batch_qty,
                    'batch_rate': batch_rate,
                    'batch_amount': batch_amount,
                    'batch_uom': uom or 'Pcs',
                    'mfg_date': self.parse_tally_date(self.get_text(batch_elem, 'MFGDATE')),
                    'expiry_date': self.parse_tally_date(self.get_text(batch_elem, 'EXPIRYDATE')),
                    'is_deemed_positive': parent_qty >= 0,
                    'is_outward': parent_qty < 0
                })
            except Exception as e:
                logger.warning(f"⚠️ Error parsing batch allocation: {e}")
                continue
        
        return batches
    
    # ─── Backend API ─────────────────────────────────────────────────
    
    def save_vouchers_to_backend(self, vouchers: List[Dict], company_id: int, 
                                  user_id: int, company_guid: str) -> Tuple[bool, int]:
        """Send voucher data to backend /vouchers/sync endpoint.
        
        Backend expects a flat JSON array of vouchers in camelCase format,
        each containing cmpId and userId.
        """
        try:
            if not vouchers:
                return True, 0
            
            # Convert each voucher to camelCase and propagate cmpId/userId/voucherGuid
            # to all nested entries (backend requires NOT NULL on child table FKs)
            backend_vouchers = []
            for v in vouchers:
                camel_v = self._convert_keys_to_camel(v)
                camel_v['cmpId'] = company_id
                camel_v['userId'] = user_id
                
                # Get parent voucher's GUID for child FK references
                voucher_guid = camel_v.get('guid', '')
                
                # Propagate cmpId/userId/voucherGuid to nested ledger entries
                # (voucher_ledger_entries.voucher_guid NOT NULL)
                for le in camel_v.get('ledgerEntries', []):
                    le['cmpId'] = company_id
                    le['userId'] = user_id
                    le['voucherGuid'] = voucher_guid
                    # Also propagate to bill allocations inside ledger entries
                    for ba in le.get('billAllocations', []):
                        ba['cmpId'] = company_id
                        ba['voucherGuid'] = voucher_guid
                    # And cost category/centre allocations
                    for cc in le.get('costCategoryAllocations', []):
                        cc['cmpId'] = company_id
                        cc['voucherGuid'] = voucher_guid
                        for cca in cc.get('costCentreAllocations', []):
                            cca['cmpId'] = company_id
                            cca['voucherGuid'] = voucher_guid
                
                # Propagate cmpId/userId/voucherGuid to nested inventory entries
                # (voucher_inventory_entries.voucher_id / voucher_guid NOT NULL)
                for ie in camel_v.get('inventoryEntries', []):
                    ie['cmpId'] = company_id
                    ie['userId'] = user_id
                    ie['voucherGuid'] = voucher_guid
                    # Also propagate to batch allocations inside inventory entries
                    for bat in ie.get('batchAllocations', []):
                        bat['cmpId'] = company_id
                        bat['voucherGuid'] = voucher_guid
                
                backend_vouchers.append(camel_v)
            
            url = f"{self.backend_url}/vouchers/sync"
            
            if VERBOSE_MODE:
                logger.info(f"📤 Sending {len(backend_vouchers)} vouchers to {url}")
                if backend_vouchers:
                    sample = {k: v for k, v in backend_vouchers[0].items() 
                              if k not in ('ledgerEntries', 'inventoryEntries')}
                    logger.info(f"📋 Sample voucher (header): {json.dumps(sample, default=str)[:500]}")
            
            response = requests.post(
                url,
                json=backend_vouchers,
                headers=self.headers,
                timeout=300
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                saved_count = result.get('savedCount', result.get('totalProcessed', len(backend_vouchers)))
                if VERBOSE_MODE:
                    logger.info(f"✅ Backend saved {saved_count} vouchers")
                return True, saved_count
            else:
                logger.error(f"❌ Backend error: HTTP {response.status_code}")
                logger.error(f"Response: {response.text[:500]}")
                return False, 0
                
        except Exception as e:
            logger.error(f"❌ Error sending to backend: {e}")
            return False, 0
    
    # ─── Main Sync Orchestrator ──────────────────────────────────────
    
    def sync_vouchers(self, company_id: int, company_guid: str, user_id: int,
                      tally_host: str, tally_port: int, from_date: str = '01-Apr-2024',
                      to_date: str = '31-Mar-2025', last_alter_id: int = None,
                      company_name: str = None) -> Dict:
        """Execute incremental voucher sync pipeline:
        
        1. Get last AlterID (from backend or argument)
        2. Generate TDL with AlterID filter
        3. Fetch from Tally
        4. Parse voucher XML (all 7 nested levels)
        5. Send to backend in batches
        6. Update AlterID on backend
        """
        
        logger.info(f"🚀 Starting voucher sync for company {company_id}")
        logger.info(f"📅 Date Range: {from_date} to {to_date}")
        
        sync_start_time = time.time()
        
        # Pre-flight check: verify company is loaded in Tally
        if company_name:
            is_loaded, loaded_companies = self.verify_tally_company(tally_host, tally_port, company_name)
            if not is_loaded:
                error_msg = (f"Company '{company_name}' is not loaded in Tally. "
                           f"Loaded: {loaded_companies}. Aborting to prevent data mismatch.")
                logger.error(error_msg)
                return {'success': False, 'message': error_msg, 'count': 0}
        
        # Step 1: Get last AlterID
        if last_alter_id is None:
            last_alter_id = self.get_last_alter_id(company_id)
        
        logger.info(f"📌 Syncing vouchers with AlterID > {last_alter_id}")
        
        # Step 2: Generate TDL
        tdl = self.generate_voucher_tdl(last_alter_id, from_date, to_date, company_name)
        
        # Step 3: Fetch from Tally
        xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)
        
        if not xml_response:
            elapsed_ms = int((time.time() - sync_start_time) * 1000)
            try:
                get_sync_logger().log_voucher_sync_single(
                    company_name=company_name or f'Company {company_id}',
                    from_date=from_date, to_date=to_date,
                    count=0, elapsed_ms=elapsed_ms,
                    error='Failed to fetch vouchers from Tally')
            except Exception:
                pass
            return {
                'success': False,
                'message': 'Failed to fetch vouchers from Tally',
                'count': 0
            }
        
        # Step 4: Parse XML
        vouchers = self.parse_voucher_xml(xml_response)
        
        if not vouchers:
            logger.info(f"✅ No new vouchers to sync (AlterID > {last_alter_id})")
            return {
                'success': True,
                'message': 'No new vouchers',
                'count': 0,
                'lastAlterID': last_alter_id,
                'tallyRecords': []
            }
        
        # Log stats
        total_ledger = sum(len(v['all_ledger_entries']) for v in vouchers)
        total_inventory = sum(len(v['all_inventory_entries']) for v in vouchers)
        total_bills = sum(
            len(b) for v in vouchers 
            for le in v['all_ledger_entries'] 
            for b in [le['bill_allocations']]
        )
        total_batch_alloc = sum(
            len(b) for v in vouchers 
            for ie in v['all_inventory_entries'] 
            for b in [ie['batch_allocations']]
        )
        
        logger.info(f"📊 Parsed: {len(vouchers)} vouchers, {total_ledger} ledger entries, "
                     f"{total_bills} bills, {total_inventory} inventory entries, {total_batch_alloc} batches")
        
        # Step 5: Send to backend in batches
        total_saved = 0
        batch_num = 0
        
        for i in range(0, len(vouchers), self.BATCH_SIZE):
            batch = vouchers[i:i + self.BATCH_SIZE]
            batch_num += 1
            
            if VERBOSE_MODE:
                logger.info(f"📤 Batch {batch_num}: sending {len(batch)} vouchers...")
            
            success, saved = self.save_vouchers_to_backend(batch, company_id, user_id, company_guid)
            
            if success:
                total_saved += saved
            else:
                logger.error(f"❌ Batch {batch_num} failed")
            
            # Delay between batches
            if i + self.BATCH_SIZE < len(vouchers):
                time.sleep(self.BATCH_DELAY)
        
        # Step 6: Update max AlterID
        max_alter_id = max(v['alter_id'] for v in vouchers)
        self.save_last_alter_id(company_id, max_alter_id)
        
        logger.info(f"🎉 Voucher sync complete: {total_saved}/{len(vouchers)} vouchers saved")
        
        elapsed_ms = int((time.time() - sync_start_time) * 1000)
        
        try:
            get_sync_logger().log_voucher_sync_single(
                company_name=company_name or f'Company {company_id}',
                from_date=from_date, to_date=to_date,
                count=total_saved, elapsed_ms=elapsed_ms,
                last_alter_id=max_alter_id)
        except Exception:
            pass
        
        # Build tallyRecords cache for reconciliation (identity fields only)
        tally_records_cache = []
        for v in vouchers:
            tally_records_cache.append({
                'guid': v['guid'],
                'masterID': v.get('master_id', ''),
                'alterID': v.get('alter_id', 0),
                'name': f"{v.get('voucher_type', '')} {v.get('voucher_number', '')}".strip() or v['guid'],
                'ledgerEntryCount': len(v.get('all_ledger_entries', [])),
                'inventoryEntryCount': len(v.get('all_inventory_entries', []))
            })
        
        return {
            'success': True,
            'message': f'Successfully synced {total_saved} vouchers',
            'count': total_saved,
            'lastAlterID': max_alter_id,
            'elapsedMs': elapsed_ms,
            'tallyRecords': tally_records_cache,
            'stats': {
                'vouchers': len(vouchers),
                'ledgerEntries': total_ledger,
                'billAllocations': total_bills,
                'inventoryEntries': total_inventory,
                'batchAllocations': total_batch_alloc
            }
        }

    # ─── Monthly Chunked Sync (with Adaptive Weekly) ─────────────

    def sync_vouchers_chunked(self, company_id: int, company_guid: str, user_id: int,
                              tally_host: str, tally_port: int, from_date: str = '01-Apr-2024',
                              to_date: str = '31-Mar-2025', last_alter_id: int = None,
                              company_name: str = None) -> Dict:
        """Sync vouchers in 1-month chunks to avoid Tally memory errors.
        
        Breaks the full date range into months and calls sync_vouchers() for each.
        If a month takes >30 seconds, it is re-synced using weekly sub-chunks.
        """
        import calendar
        from datetime import timedelta
        
        months_map = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}
        months_rev = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        def parse_tally_date(d):
            """Parse dd-Mon-yyyy to datetime"""
            parts = d.split('-')
            return datetime(int(parts[2]), months_map[parts[1]], int(parts[0]))
        
        def format_tally_date(dt):
            """Format datetime to dd-Mon-yyyy"""
            return f"{dt.day:02d}-{months_rev[dt.month]}-{dt.year}"
        
        start_dt = parse_tally_date(from_date)
        end_dt = parse_tally_date(to_date)
        
        # Generate 1-month chunks
        chunks = []
        chunk_start = start_dt
        while chunk_start <= end_dt:
            _, last_day = calendar.monthrange(chunk_start.year, chunk_start.month)
            chunk_end = datetime(chunk_start.year, chunk_start.month, last_day)
            if chunk_end > end_dt:
                chunk_end = end_dt
            chunks.append((chunk_start, chunk_end))
            next_month = chunk_start.month + 1
            next_year = chunk_start.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            chunk_start = datetime(next_year, next_month, 1)
        
        logger.info(f"📅 Monthly chunked sync: {len(chunks)} chunk(s) from {from_date} to {to_date}")
        
        try:
            get_sync_logger().log_voucher_sync_start(
                company_name=company_name or f'Company {company_id}',
                from_date=from_date, to_date=to_date,
                sync_type='First-Time (Monthly + Adaptive Weekly)',
                chunk_count=len(chunks))
        except Exception:
            pass
        
        chunked_start_time = time.time()
        total_count = 0
        total_stats = {'vouchers': 0, 'ledgerEntries': 0, 'billAllocations': 0,
                       'inventoryEntries': 0, 'batchAllocations': 0}
        chunk_errors = []
        last_alter = last_alter_id
        all_tally_records = []  # Accumulate tallyRecords across chunks
        
        for i, (c_start, c_end) in enumerate(chunks):
            c_from = format_tally_date(c_start)
            c_to = format_tally_date(c_end)
            logger.info(f"📅 Month {i+1}/{len(chunks)}: {c_from} → {c_to}")
            
            result = self.sync_vouchers(
                company_id=company_id,
                company_guid=company_guid,
                user_id=user_id,
                tally_host=tally_host,
                tally_port=tally_port,
                from_date=c_from,
                to_date=c_to,
                last_alter_id=last_alter,
                company_name=company_name
            )
            
            if result.get('success'):
                total_count += result.get('count', 0)
                if result.get('lastAlterID'):
                    last_alter = result['lastAlterID']
                stats = result.get('stats', {})
                for k in total_stats:
                    total_stats[k] += stats.get(k, 0)
                # Accumulate tallyRecords from each chunk
                chunk_tally = result.get('tallyRecords', [])
                if chunk_tally:
                    all_tally_records.extend(chunk_tally)
                elapsed_ms = result.get('elapsedMs', 0)
                logger.info(f"   ✅ Month {i+1}: {result.get('count', 0)} vouchers ({elapsed_ms}ms)")
                
                try:
                    get_sync_logger().log_voucher_sync_chunk(
                        chunk_num=i+1, total_chunks=len(chunks),
                        from_date=c_from, to_date=c_to,
                        count=result.get('count', 0), elapsed_ms=elapsed_ms,
                        chunk_type='Month')
                except Exception:
                    pass
                
                # Adaptive weekly retry if month took >30s
                if elapsed_ms > 30000:
                    logger.info(f"   ⏱️ Month {i+1} took {elapsed_ms}ms (>30s), re-syncing weekly...")
                    week_start = c_start
                    week_num = 0
                    while week_start <= c_end:
                        week_num += 1
                        week_end = week_start + timedelta(days=6)
                        if week_end > c_end:
                            week_end = c_end
                        w_from = format_tally_date(week_start)
                        w_to = format_tally_date(week_end)
                        logger.info(f"      📅 Week {week_num}: {w_from} → {w_to}")
                        
                        w_result = self.sync_vouchers(
                            company_id=company_id,
                            company_guid=company_guid,
                            user_id=user_id,
                            tally_host=tally_host,
                            tally_port=tally_port,
                            from_date=w_from,
                            to_date=w_to,
                            last_alter_id=last_alter,
                            company_name=company_name
                        )
                        if w_result.get('success'):
                            total_count += w_result.get('count', 0)
                            if w_result.get('lastAlterID'):
                                last_alter = w_result['lastAlterID']
                            w_stats = w_result.get('stats', {})
                            for k in total_stats:
                                total_stats[k] += w_stats.get(k, 0)
                            logger.info(f"      ✅ Week {week_num}: {w_result.get('count', 0)} vouchers")
                            try:
                                get_sync_logger().log_voucher_sync_chunk(
                                    chunk_num=week_num, total_chunks=0,
                                    from_date=w_from, to_date=w_to,
                                    count=w_result.get('count', 0),
                                    elapsed_ms=w_result.get('elapsedMs', 0),
                                    chunk_type=f'  Week (Month {i+1})')
                            except Exception:
                                pass
                        else:
                            logger.error(f"      ❌ Week {week_num} failed: {w_result.get('message')}")
                            try:
                                get_sync_logger().log_voucher_sync_chunk(
                                    chunk_num=week_num, total_chunks=0,
                                    from_date=w_from, to_date=w_to,
                                    count=0, elapsed_ms=0,
                                    chunk_type=f'  Week (Month {i+1})',
                                    error=w_result.get('message', 'Unknown'))
                            except Exception:
                                pass
                        
                        week_start = week_end + timedelta(days=1)
            else:
                chunk_errors.append(f"Month {i+1} ({c_from}-{c_to}): {result.get('message', 'Unknown error')}")
                logger.error(f"   ❌ Month {i+1} failed: {result.get('message')}")
                try:
                    get_sync_logger().log_voucher_sync_chunk(
                        chunk_num=i+1, total_chunks=len(chunks),
                        from_date=c_from, to_date=c_to,
                        count=0, elapsed_ms=0,
                        chunk_type='Month',
                        error=result.get('message', 'Unknown error'))
                except Exception:
                    pass
        
        chunked_elapsed = int((time.time() - chunked_start_time) * 1000)
        try:
            get_sync_logger().log_voucher_sync_complete(
                company_name=company_name or f'Company {company_id}',
                total_vouchers=total_count, total_chunks=len(chunks),
                errors=len(chunk_errors), duration_ms=chunked_elapsed)
        except Exception:
            pass
        
        if chunk_errors:
            return {
                'success': len(chunk_errors) < len(chunks),
                'message': f'Synced {total_count} vouchers with {len(chunk_errors)} month error(s)',
                'count': total_count,
                'lastAlterID': last_alter,
                'stats': total_stats,
                'tallyRecords': all_tally_records,
                'chunkErrors': chunk_errors
            }
        
        return {
            'success': True,
            'message': f'Successfully synced {total_count} vouchers in {len(chunks)} month(s)',
            'count': total_count,
            'lastAlterID': last_alter,
            'stats': total_stats,
            'tallyRecords': all_tally_records
        }


def main():
    """Main entry point - called from Electron or CLI"""
    try:
        # Parse arguments (same order as incremental_sync.py for consistency)
        company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
        company_guid = sys.argv[2] if len(sys.argv) > 2 else ''
        tally_host = sys.argv[3] if len(sys.argv) > 3 else 'localhost'
        tally_port = int(sys.argv[4]) if len(sys.argv) > 4 else 9000
        backend_url = sys.argv[5] if len(sys.argv) > 5 else os.getenv('BACKEND_URL', '')
        auth_token = sys.argv[6] if len(sys.argv) > 6 else ''
        device_token = sys.argv[7] if len(sys.argv) > 7 else ''
        from_date = sys.argv[8] if len(sys.argv) > 8 else '01-Apr-2024'
        to_date = sys.argv[9] if len(sys.argv) > 9 else '31-Mar-2025'
        last_alter_id = int(sys.argv[10]) if len(sys.argv) > 10 else None
        company_name = sys.argv[11] if len(sys.argv) > 11 else None
        user_id = int(sys.argv[12]) if len(sys.argv) > 12 else 1
        
        if not company_guid:
            logger.error("❌ Company GUID is required (arg 2)")
            print(json.dumps({'success': False, 'message': 'Company GUID required', 'count': 0}))
            sys.exit(1)
        
        if not backend_url:
            logger.error("❌ Backend URL is required (arg 4 or BACKEND_URL env)")
            print(json.dumps({'success': False, 'message': 'Backend URL required', 'count': 0}))
            sys.exit(1)
        
        # Initialize and run
        sync_manager = VoucherSyncManager(backend_url, auth_token, device_token)
        
        result = sync_manager.sync_vouchers(
            company_id=company_id,
            company_guid=company_guid,
            user_id=user_id,
            tally_host=tally_host,
            tally_port=tally_port,
            from_date=from_date,
            to_date=to_date,
            last_alter_id=last_alter_id,
            company_name=company_name
        )
        
        # Output JSON for Electron to parse
        print(json.dumps(result))
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))
        sys.exit(1)


if __name__ == '__main__':
    main()
