import requests
import json
import logging
import sys
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import xml.etree.ElementTree as ET
import re
import os

from sync_logger import get_sync_logger

# Production logging configuration
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

# Create logs directory - use APPDATA when running as bundled exe
import sys as _sys
if getattr(_sys, 'frozen', False):
    LOG_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Tallify', 'logs')
else:
    LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
INCREMENTAL_SYNC_LOG_FILE = os.path.join(LOG_DIR, 'sync_worker.log')

# Configure logging with both file and console handlers
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

# Remove existing handlers to avoid duplicates
logger.handlers = []

# File handler - always writes detailed logs
file_handler = logging.FileHandler(INCREMENTAL_SYNC_LOG_FILE, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)  # Always log everything to file
file_formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Console handler - respects VERBOSE_MODE
if __name__ == "__main__":
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, LOG_LEVEL))
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s' if VERBOSE_MODE else '%(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)


class IncrementalSyncManager:
    """Manages incremental sync based on AlterID with reconciliation"""
    
    BATCH_SIZE = 500
    BATCH_DELAY = 0.1  # 100ms delay between batches
    
    def __init__(self, backend_url: str, auth_token: str, device_token: str, batch_size: int = None):
        if batch_size and batch_size > 0:
            self.BATCH_SIZE = batch_size
            logger.info(f"📦 Batch size set to {batch_size} (from settings)")
        self.backend_url = backend_url.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
    
    def verify_tally_company(self, tally_host: str, tally_port: int, expected_company_name: str) -> tuple:
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

        tally_url = f"http://{tally_host}:{tally_port}"
        try:
            resp = requests.post(tally_url, data=xml_req.encode('utf-8'),
                                 headers={'Content-Type': 'application/xml'},
                                 timeout=10)
            if resp.status_code != 200:
                logger.warning(f"⚠️ Could not verify Tally companies (HTTP {resp.status_code})")
                return True, []  # Fail-open

            text = re.sub(r'[^\x09\x0A\x0D\x20-\x7E\x80-\xFF\u0100-\uFFFF]', '', resp.text)
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
    
    def fetch_companies(self) -> List[Dict]:
        """Fetch all imported companies from backend"""
        try:
            url = f"{self.backend_url}/companies"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                companies = data.get('data', [])
                # Filter only imported companies
                imported = [c for c in companies if c.get('status') == 'imported']
                logger.info(f"✅ Found {len(imported)} imported companies")
                return imported
            else:
                logger.error(f"❌ Failed to fetch companies: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"❌ Error fetching companies: {e}")
            return []
    
    def get_master_mapping(self, company_id: int) -> Dict[str, int]:
        """Fetch all entity max alterIDs from master-mapping endpoint"""
        try:
            url = f"{self.backend_url}/api/companies/{company_id}/master-mapping"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                masters = data.get('masters', {})
                logger.info(f"✅ Fetched master mapping for company {company_id}")
                return masters
            else:
                logger.warning(f"⚠️ Could not fetch master mapping: HTTP {response.status_code}")
                return {}
        except Exception as e:
            logger.warning(f"⚠️ Error fetching master mapping: {e}")
            return {}
    
    def get_last_alter_id(self, company_id: int, entity_type: str = None) -> int:
        """Fetch last synced AlterID from backend for specific entity type"""
        try:
            # Use master-mapping endpoint for per-entity maxAlterID
            masters = self.get_master_mapping(company_id)
            
            if not masters:
                return 0
            
            # Map entity type to master key (e.g., "Group" -> "group")
            entity_key_map = {
                'Group': 'group',
                'Currency': 'currency',
                'Unit': 'units',
                'StockGroup': 'stockgroup',
                'StockCategory': 'stockcategory',
                'CostCategory': 'costcategory',
                'CostCenter': 'costcenter',
                'Godown': 'godown',
                'VoucherType': 'vouchertype',
                'TaxUnit': 'taxunit',
                'Ledger': 'ledger',
                'StockItem': 'stockitem',
            }
            
            entity_key = entity_key_map.get(entity_type, entity_type.lower() if entity_type else None)
            
            if entity_key and entity_key in masters:
                last_id = masters[entity_key]
                logger.info(f"✅ Max AlterID for {entity_type} in company {company_id}: {last_id}")
                return last_id
            else:
                logger.info(f"📝 No AlterID found for {entity_type}, starting from 0")
                return 0
        except Exception as e:
            logger.warning(f"⚠️ Error fetching last AlterID: {e}")
            return 0
    
    def save_last_alter_id(self, company_id: int, alter_id: int, entity_type: str) -> bool:
        """Save last synced AlterID to backend for specific entity type"""
        try:
            url = f"{self.backend_url}/api/companies/{company_id}/last-alter-id"
            payload = {
                'lastAlterID': alter_id,
                'entityType': entity_type,  # CRITICAL: Track per entity type
                'lastSyncTime': datetime.now().isoformat()
            }
            
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Saved {entity_type} AlterID {alter_id} for company {company_id}")
                return True
            else:
                logger.warning(f"⚠️ Failed to save AlterID: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.warning(f"⚠️ Error saving AlterID: {e}")
            return False
    
    def update_company_sync_status(self, company_id: int, sync_status: str = 'synced', success: bool = True) -> bool:

        try:
            url = f"{self.backend_url}/companies/{company_id}/sync-status"
            
            # Format datetime as yyyy-MM-dd'T'HH:mm:ss.SSS (3-digit millis) to match backend @JsonFormat
            now = datetime.now()
            formatted_now = now.strftime('%Y-%m-%dT%H:%M:%S.') + f'{now.microsecond // 1000:03d}'
            
            payload = {
                'syncStatus': sync_status if success else 'failed',
                'lastSyncDate': formatted_now if success else None,
                'updatedAt': formatted_now
            }
            
            response = requests.put(url, json=payload, headers=self.headers, timeout=10)
            
            if response.status_code in [200, 201]:
                status_msg = f'✅ {sync_status}' if success else '❌ failed'
                logger.info(f"🔄 Updated company {company_id} sync status: {status_msg}")
                return True
            else:
                logger.warning(f"⚠️ Failed to update company sync status: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.warning(f"⚠️ Error updating company sync status: {e}")
            return False
    
    @staticmethod
    def _parse_tally_amount(value) -> float:
        """Safely parse Tally amount strings like '5000.00', '-5000.00', '5000.00 Dr', '5000.00 Cr'"""
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.replace(',', '').strip()
            if not cleaned:
                return 0.0
            # Handle Dr/Cr suffix (Tally convention: Dr=Debit, Cr=Credit)
            has_cr = 'Cr' in cleaned
            cleaned = cleaned.replace('Dr', '').replace('Cr', '').strip()
            try:
                amount = float(cleaned)
                if has_cr:
                    amount = -amount
                return amount
            except (ValueError, TypeError):
                return 0.0
        return 0.0

    def generate_incremental_tdl(self, last_alter_id: int, entity_type: str = 'Ledger', company_name: str = None, books_from: str = None) -> str:
        """Generate TDL for incremental fetch based on AlterID
        
        Args:
            books_from: Company's BooksFrom date (Tally format: DD-Mon-YYYY). 
                        When provided, used as SVFROMDATE to capture ALL transactions 
                        since company inception — critical for accurate ClosingBalance 
                        when companies don't maintain opening balances.
        """
        
        # Map entity type to Tally-specific names
        tally_entity_names = {
            'CostCenter': 'COSTCENTRE',
            'CostCategory': 'COSTCATEGORY'
        }
        tally_entity = tally_entity_names.get(entity_type, entity_type)
        
        # Define fetch fields for each entity type
        entity_fields = {
            'Group': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Nature, IsRevenue, RESERVEDNAME",
            'Currency': "GUID, MASTERID, ALTERID, Name, Symbol, FormalName, DecimalPlaces, DecimalSymbol, ShowAmountInWords, SuffixSymbol, SpaceBetweenAmountAndSymbol",
            'Unit': "GUID, MASTERID, ALTERID, Name, Alias, OriginalName, DecimalPlaces, NumberOfDecimals",
            'StockGroup': "GUID, MASTERID, ALTERID, Name, Alias, Parent, BaseUnits, AdditionalUnits",
            'StockCategory': "GUID, MASTERID, ALTERID, Name, Alias, Parent",
            'CostCategory': "GUID, MASTERID, ALTERID, Name, Alias, AllocateRevenue, AllocateNonRevenue",
            'CostCenter': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Category",
            'Godown': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Address",
            'VoucherType': "GUID, MASTERID, ALTERID, Name, Alias, Parent, NumberingMethod, IsDeemedPositive",
            'TaxUnit': "GUID, MASTERID, ALTERID, Name, Alias, OriginalName",
            'Ledger': "GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, PrimaryGroup, IsRevenue, LastParent, Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, ClosingBalance, LEDGERPHONE, LEDGERCOUNTRYISDCODE, LEDGERMOBILE, LEDGERCONTACT, WEBSITE, EMAIL, CURRENCYNAME, INCOMETAXNUMBER, LEDMAILINGDETAILS.*, VATAPPLICABLEDATE, VATDEALERTYPE, VATTINNUMBER, LEDGSTREGDETAILS.*",
            'StockItem': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Category, Description, MailingName, BaseUnits, AdditionalUnits, OpeningBalance, OpeningValue, OpeningRate, ReorderLevel, MinimumLevel, CostingMethod, ValuationMethod, GSTTypeOfSupply, HSNCode, GST, IsBatchWiseOn, IsCostCentresOn",
        }
        
        fetch_fields = entity_fields.get(entity_type, "GUID, MASTERID, ALTERID, Name")
        
        # Add company name to STATICVARIABLES if provided
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        
        # Date range for Tally balance computation:
        # - If books_from is provided, use it as SVFROMDATE to capture ALL transactions
        #   since company inception. This ensures ClosingBalance is accurate even when 
        #   companies don't maintain opening balances (OB = 0 for all ledgers).
        # - Otherwise, fall back to current Indian financial year dates.
        now = datetime.now()
        if books_from:
            fy_start = books_from
            # Use today's date as SVTODATE for up-to-date ClosingBalance
            fy_end = now.strftime('%d-%b-%Y')  # e.g. '14-Feb-2026'
        else:
            if now.month >= 4:
                fy_start = f"01-Apr-{now.year}"
                fy_end = f"31-Mar-{now.year + 1}"
            else:
                fy_start = f"01-Apr-{now.year - 1}"
                fy_end = f"31-Mar-{now.year}"

        return f"""<ENVELOPE>
        <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of {entity_type}s</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">{fy_start}</SVFROMDATE>
                <SVTODATE TYPE="Date">{fy_end}</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>{company_var}
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of {entity_type}s" ISMODIFY="No">
                        <TYPE>{tally_entity}</TYPE>
                        <FETCH>{fetch_fields}</FETCH>
                        <FILTERS>AlterIdFilter</FILTERS>
                    </COLLECTION>
                    <SYSTEM TYPE="FORMULAE" NAME="AlterIdFilter"> $Alterid > {last_alter_id} </SYSTEM>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    def fetch_from_tally(self, tdl: str, tally_host: str, tally_port: int) -> Optional[str]:
        """Fetch data from Tally Prime"""
        try:
            url = f"http://{tally_host}:{tally_port}"
            
            # Log the XML request being sent
            # logger.info(f"📤 Sending XML request to Tally on port {tally_port}")
            # logger.info(f"📋 XML Request:\n{tdl}")
            
            response = requests.post(
                url,
                data=tdl,
                headers={'Content-Type': 'application/xml'},
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info("✅ Successfully fetched data from Tally")
                return response.text
            else:
                logger.error(f"❌ Tally returned HTTP {response.status_code}")
                return None
        except requests.exceptions.ConnectionError:
            logger.error("❌ Could not connect to Tally Prime")
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching from Tally: {e}")
            return None
    
    def parse_xml_response(self, xml_string: str, entity_type: str = 'Ledger') -> List[Dict]:
        """Parse XML response from Tally"""
        try:
            # Clean invalid XML characters
            xml_string = re.sub(r'&#([0-9]+);', lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), xml_string)
            
            root = ET.fromstring(xml_string)
            records = []
            
            # Map entity type to Tally-specific XML element names
            tally_xml_names = {
                'CostCenter': 'COSTCENTRE',
                'CostCategory': 'COSTCATEGORY'
            }
            tally_xml_name = tally_xml_names.get(entity_type, entity_type.upper())
            
            # Find all entity elements
            for elem in root.iter(tally_xml_name):
                # Skip elements without NAME attribute (container elements)
                if not elem.get('NAME'):
                    continue
                    
                record = self._parse_element(elem, entity_type)
                if record:
                    records.append(record)
            
            logger.info(f"✅ Parsed {len(records)} {entity_type}s from XML")
            return records
        except Exception as e:
            logger.error(f"❌ Error parsing XML: {e}")
            return []
    
    def _parse_element(self, elem, entity_type: str) -> Optional[Dict]:
        """Parse individual element"""
        try:
            def get_text(tag_name):
                child = elem.find(tag_name)
                if child is not None and child.text:
                    return child.text.strip()
                return None
            
            # Get NAME - try attribute first, then child element
            name = elem.get('NAME') or get_text('NAME')
            
            if not name:
                # Skip elements without name
                return None
            
            alter_id = int(get_text('ALTERID') or 0)
            
            record = {
                'guid': get_text('GUID'),
                'masterID': get_text('MASTERID'),
                'alterID': alter_id,
                'name': name,
            }
            
            if entity_type == 'Ledger':
                # Extract GST registration details from LEDGSTREGDETAILS.LIST
                gst_reg = elem.find('.//LEDGSTREGDETAILS.LIST')
                gst_applicable_text = get_text('GSTAPPLICABLE') or ''
                gst_applicable = gst_applicable_text.lower() in ('applicable', 'yes', 'true')
                gst_registration_type = ''
                gst_gstin = ''
                gst_place_of_supply = ''
                gst_details_applicable_from = ''
                gst_is_common_party = False
                gst_is_freezone = False
                gst_is_transporter = False
                gst_is_other_territory = False
                gst_consider_purchase_export = False
                gst_registration_date = ''
                gst_state = ''
                gst_transporter_id = ''

                if gst_reg is not None:
                    def gst_text(tag):
                        child = gst_reg.find(tag)
                        if child is not None and child.text:
                            return child.text.strip()
                        return ''
                    gst_registration_type = gst_text('GSTREGISTRATIONTYPE')
                    gst_gstin = gst_text('GSTIN')
                    gst_place_of_supply = gst_text('PLACEOFSUPPLY')
                    gst_details_applicable_from = gst_text('APPLICABLEFROM')
                    gst_is_common_party = gst_text('ISCOMMONPARTY') == 'Yes'
                    gst_is_freezone = gst_text('ISFREEZONE') == 'Yes'
                    gst_is_transporter = gst_text('ISTRANSPORTER') == 'Yes'
                    gst_is_other_territory = gst_text('ISOTHERTERRITORYASSESSEE') == 'Yes'
                    gst_consider_purchase_export = gst_text('CONSIDERPURCHASEFOREXPORT') == 'Yes'
                    gst_registration_date = gst_text('GSTREGISTRATIONDATE')
                    gst_state = gst_text('STATENAME') or gst_place_of_supply
                    gst_transporter_id = gst_text('TRANSPORTERID')

                # Extract mailing details
                mailing = elem.find('.//LEDMAILINGDETAILS.LIST')
                mailing_name = ''
                address1 = ''
                address2 = ''
                address3 = ''
                address4 = ''
                mailing_state = ''
                mailing_country = ''
                mailing_pincode = ''
                mailing_applicable_from = ''
                if mailing is not None:
                    def mail_text(tag):
                        child = mailing.find(tag)
                        if child is not None and child.text:
                            return child.text.strip()
                        return ''
                    mailing_name = mail_text('MAILINGNAME')
                    mailing_applicable_from = mail_text('APPLICABLEFROM')
                    mailing_state = mail_text('STATE')
                    mailing_country = mail_text('COUNTRY')
                    mailing_pincode = mail_text('PINCODE')
                    # Address lines are in ADDRESS.LIST
                    addr_list = mailing.find('ADDRESS.LIST')
                    if addr_list is not None:
                        addrs = [a.text.strip() for a in addr_list.findall('ADDRESS') if a.text]
                        address1 = addrs[0] if len(addrs) > 0 else ''
                        address2 = addrs[1] if len(addrs) > 1 else ''
                        address3 = addrs[2] if len(addrs) > 2 else ''
                        address4 = addrs[3] if len(addrs) > 3 else ''

                record.update({
                    'alias': get_text('ONLYALIAS') or get_text('ALIAS'),
                    'parent': get_text('PARENT'),
                    'primaryGroup': get_text('PRIMARYGROUP'),
                    'lastParent': get_text('LASTPARENT'),
                    'isRevenue': get_text('ISREVENUE') == 'Yes',
                    'description': get_text('DESCRIPTION'),
                    'narration': get_text('NARRATION'),
                    'isBillWiseOn': get_text('ISBILLWISEON') == 'Yes',
                    'isCostCentresOn': get_text('ISCOSTCENTRESON') == 'Yes',
                    'openingBalance': self._parse_tally_amount(get_text('OPENINGBALANCE')),
                    'closingBalance': self._parse_tally_amount(get_text('CLOSINGBALANCE')),
                    'phone': get_text('LEDGERPHONE'),
                    'countryIsdCode': get_text('LEDGERCOUNTRYISDCODE'),
                    'mobile': get_text('LEDGERMOBILE'),
                    'contact': get_text('LEDGERCONTACT'),
                    'email': get_text('EMAIL'),
                    'website': get_text('WEBSITE'),
                    'currencyName': get_text('CURRENCYNAME'),
                    'incometaxNumber': get_text('INCOMETAXNUMBER'),
                    'vatTINNumber': get_text('VATTINNUMBER'),
                    'vatDealerType': get_text('VATDEALERTYPE'),
                    'gstApplicable': gst_applicable,
                    'gstRegistrationType': gst_registration_type,
                    'gstGstin': gst_gstin,
                    'gstPlaceOfSupply': gst_place_of_supply,
                    'gstDetailsApplicableFrom': gst_details_applicable_from,
                    'gstIsCommonParty': gst_is_common_party,
                    'gstIsFreezone': gst_is_freezone,
                    'gstIsTransporter': gst_is_transporter,
                    'gstIsOtherTerritoryAssessee': gst_is_other_territory,
                    'gstConsiderPurchaseForExport': gst_consider_purchase_export,
                    'gstRegistrationDate': gst_registration_date,
                    'gstState': gst_state,
                    'gstTransporterId': gst_transporter_id,
                    # Mailing details
                    'mailingName': mailing_name,
                    'address1': address1,
                    'address2': address2,
                    'address3': address3,
                    'address4': address4,
                    'mailingState': mailing_state,
                    'mailingCountry': mailing_country,
                    'mailingPincode': mailing_pincode,
                    'mailingApplicableFrom': mailing_applicable_from,
                })
            elif entity_type == 'VoucherType':
                # Extract numbering method - try direct path first, then nested
                numbering_method = get_text('NUMBERINGMETHOD')
                if not numbering_method:
                    vch_series = elem.find('.//VOUCHERNUMBERSERIES.LIST/NUMBERINGMETHOD')
                    if vch_series is not None:
                        numbering_method = vch_series.text
                
                record.update({
                    'alias': get_text('MAILINGNAME'),
                    'parent': get_text('PARENT'),
                    'isActive': get_text('ISACTIVE') == 'Yes',
                    'isDeemedPositive': get_text('ISDEEMEDPOSITIVE') == 'Yes',
                    'numberingMethod': numbering_method,
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'Unit':
                record.update({
                    'originalName': get_text('ORIGINALNAME'),
                    'decimalPlaces': int(get_text('NUMBEROFDECIMALS') or 0),
                    'simpleUnit': get_text('ISSIMPLEUNIT') == 'Yes',
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'Godown':
                record.update({
                    'parent': get_text('PARENT'),
                    'address': get_text('ADDRESS'),
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'TaxUnit':
                record.update({
                    'originalName': get_text('ORIGINALNAME'),
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'Currency':
                record.update({
                    'symbol': get_text('SYMBOL') or get_text('EXPANDEDSYMBOL') or get_text('ORIGINALSYMBOL'),
                    'formalName': get_text('FORMALNAME'),
                    'decimalPlaces': int(get_text('DECIMALPLACES') or 0),
                    'decimalSeparator': get_text('DECIMALSYMBOL') or get_text('DECIMALSEPARATOR'),
                    'showAmountInWords': get_text('SHOWAMOUNTINWORDS'),
                    'suffixSymbol': get_text('SUFFIXSYMBOL'),
                    'spaceBetweenAmountAndSymbol': get_text('SPACEBETWEENAMOUNTANDSYMBOL'),
                })
            elif entity_type == 'StockGroup':
                record.update({
                    'parent': get_text('PARENT'),
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'StockCategory':
                record.update({
                    'parent': get_text('PARENT'),
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'CostCategory':
                record.update({
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'CostCenter':
                record.update({
                    'parent': get_text('PARENT'),
                    'category': get_text('CATEGORY'),
                })
            elif entity_type == 'Group':
                record.update({
                    'alias': get_text('ALIAS'),
                    'parent': get_text('PARENT'),
                    'nature': get_text('NATURE'),
                    'isRevenue': get_text('ISREVENUE') == 'Yes',
                    'reservedName': get_text('RESERVEDNAME'),
                })
            elif entity_type == 'StockItem':
                record.update({
                    'parent': get_text('PARENT'),
                    'category': get_text('CATEGORY'),
                    'description': get_text('DESCRIPTION'),
                    'mailingName': get_text('MAILINGNAME'),
                    'baseUnits': get_text('BASEUNITS'),
                    'additionalUnits': get_text('ADDITIONALUNITS'),
                    'costingMethod': get_text('COSTINGMETHOD'),
                    'valuationMethod': get_text('VALUATIONMETHOD'),
                    'gstTypeOfSupply': get_text('GSTTYPEOFSUPPLY'),
                    'hsnCode': get_text('HSNCODE'),
                    'openingBalance': self._parse_tally_amount(get_text('OPENINGBALANCE')),
                    'openingValue': self._parse_tally_amount(get_text('OPENINGVALUE')),
                    'openingRate': self._parse_tally_amount(get_text('OPENINGRATE')),
                    'batchWiseOn': get_text('ISBATCHWISEON') == 'Yes',
                    'costCentersOn': get_text('ISCOSTCENTRESON') == 'Yes',
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            
            return record
        except Exception as e:
            logger.warning(f"⚠️ Error parsing element: {e}")
            return None
    
    def prepare_for_database(self, records: List[Dict], company_id: int, user_id: int, entity_type: str) -> List[Dict]:
        """Prepare records for database insertion"""
        prepared = []
        
        base_fields = {
            'cmpId': company_id,
            'userId': user_id,
            'guid': lambda r: r.get('guid'),
            'masterId': lambda r: r.get('masterID'),
            'alterId': lambda r: r.get('alterID'),
            'isActive': True,
            'syncStatus': 'synced'
        }
        
        for record in records:
            if entity_type == 'Group':
                prepared.append({
                    'cmpId': company_id,
                    'userId': user_id,
                    'grpName': record.get('name'),
                    'grpAlias': record.get('alias'),
                    'grpParent': record.get('parent'),
                    'grpNature': record.get('nature'),
                    'isRevenue': record.get('isRevenue', False),
                    'reservedName': record.get('reservedName'),
                    'guid': record.get('guid'),
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'isActive': True,
                    'syncStatus': 'synced'
                })
            
            elif entity_type == 'Currency':
                prepared.append({
                    'cmpId': company_id,
                    'userId': user_id,
                    'name': record.get('name'),
                    'symbol': record.get('symbol'),
                    'formalName': record.get('formalName'),
                    'decimalPlaces': record.get('decimalPlaces', 2),
                    'decimalSeparator': record.get('decimalSeparator'),
                    'showAmountInWords': record.get('showAmountInWords'),
                    'suffixSymbol': record.get('suffixSymbol'),
                    'spaceBetweenAmountAndSymbol': record.get('spaceBetweenAmountAndSymbol'),
                    'guid': record.get('guid'),
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'isActive': True,
                    'syncStatus': 'synced'
                })
            
            elif entity_type == 'Unit':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'guid': record.get('guid'),
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'unitName': record.get('name'),
                    'originalName': record.get('originalName'),
                    'decimalPlaces': record.get('decimalPlaces', 0),
                    'simpleUnit': record.get('simpleUnit', False),
                    'reservedName': record.get('reservedName', '')
                })
            
            elif entity_type == 'StockGroup':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'parent': record.get('parent'),
                    'reservedName': record.get('reservedName', '')
                })
            
            elif entity_type == 'StockCategory':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'parent': record.get('parent'),
                    'reservedName': record.get('reservedName', '')
                })
            
            elif entity_type == 'CostCategory':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'isActive': True
                })
            
            elif entity_type == 'CostCenter':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'parent': record.get('parent'),
                    'category': record.get('category'),
                    'isActive': True
                })
            
            elif entity_type == 'Godown':
                prepared.append({
                    'cmpId': company_id,
                    'userId': user_id,
                    'name': record.get('name'),
                    'alias': record.get('alias'),
                    'parent': record.get('parent'),
                    'address': record.get('address'),
                    'guid': record.get('guid'),
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'isActive': True,
                    'syncStatus': 'synced'
                })
            
            elif entity_type == 'VoucherType':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'parent': record.get('parent'),
                    'numberingMethod': record.get('numberingMethod'),
                    'reservedName': record.get('reservedName'),
                    'isDeemedPositive': 'Yes' if record.get('isDeemedPositive') else 'No',
                    'isActive': record.get('isActive', True)
                })
            
            elif entity_type == 'TaxUnit':
                prepared.append({
                    'cmpId': company_id,
                    'userId': user_id,
                    'name': record.get('name'),
                    'alias': record.get('alias'),
                    'originalName': record.get('originalName'),
                    'guid': record.get('guid'),
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'isActive': True,
                    'syncStatus': 'synced'
                })
            
            elif entity_type == 'Ledger':
                # Sanitize opening balance — Tally may return "5000.00 Dr" string
                raw_balance = record.get('openingBalance', 0)
                if isinstance(raw_balance, str):
                    cleaned = raw_balance.replace(',', '').strip()
                    has_cr = 'Cr' in cleaned
                    cleaned = cleaned.replace('Dr', '').replace('Cr', '').strip()
                    try:
                        raw_balance = float(cleaned)
                        if has_cr:
                            raw_balance = -raw_balance
                    except (ValueError, TypeError):
                        raw_balance = 0.0
                elif raw_balance is None:
                    raw_balance = 0.0

                # Helper: convert Tally YYYYMMDD date to ISO YYYY-MM-DD or None
                def tally_date_to_iso(ds):
                    if not ds or len(ds) != 8:
                        return None
                    try:
                        return f"{ds[:4]}-{ds[4:6]}-{ds[6:8]}"
                    except Exception:
                        return None

                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'ledName': (record.get('name', '') or '')[:255],
                    'ledAlias': (record.get('alias', '') or '')[:255],
                    'ledParent': (record.get('parent', '') or '')[:255],
                    'ledPrimaryGroup': (record.get('primaryGroup', '') or '')[:255] or None,
                    'ledDescription': (record.get('description') or '')[:500],
                    'ledNote': (record.get('narration') or '')[:500] or None,
                    'lastParent': (record.get('lastParent') or '')[:255] or None,
                    'ledPhone': (record.get('phone') or '')[:20],
                    'ledCountryIsdCode': (record.get('countryIsdCode') or '')[:10],
                    'ledMobile': (record.get('mobile') or '')[:20],
                    'ledContact': (record.get('contact') or '')[:100],
                    'ledEmail': (record.get('email') or '')[:100],
                    'ledWebsite': (record.get('website') or '')[:255],
                    'currencyName': (record.get('currencyName') or '')[:50] or None,
                    'incomeTaxNumber': (record.get('incometaxNumber') or '')[:50],
                    'vatTinNumber': (record.get('vatTINNumber') or '')[:50],
                    'ledOpeningBalance': raw_balance,
                    'ledBillwiseOn': bool(record.get('isBillWiseOn', False)),
                    'ledIsCostcentreOn': bool(record.get('isCostCentresOn', False)),
                    'isRevenue': bool(record.get('isRevenue', False)),
                    'isActive': True,
                    # GST fields — types must match backend entity exactly
                    'gstApplicable': bool(record.get('gstApplicable', False)),
                    'gstRegistrationType': (record.get('gstRegistrationType') or '')[:50] or None,
                    'gstGstin': (record.get('gstGstin') or '')[:15] or None,
                    'gstPlaceOfSupply': (record.get('gstPlaceOfSupply') or '')[:100] or None,
                    'gstDetailsApplicableFrom': tally_date_to_iso(record.get('gstDetailsApplicableFrom')),
                    'gstIsCommonParty': bool(record.get('gstIsCommonParty', False)),
                    'gstIsFreezone': bool(record.get('gstIsFreezone', False)),
                    'gstIsTransporter': bool(record.get('gstIsTransporter', False)),
                    'gstIsOtherTerritoryAssessee': bool(record.get('gstIsOtherTerritoryAssessee', False)),
                    'gstConsiderPurchaseForExport': bool(record.get('gstConsiderPurchaseForExport', False)),
                    'gstRegistrationDate': tally_date_to_iso(record.get('gstRegistrationDate')),
                    'gstState': (record.get('gstState') or '')[:100] or None,
                    'gstTransporterId': (record.get('gstTransporterId') or '')[:50] or None,
                    # Mailing / Contact details
                    'ledMailingName': (record.get('mailingName') or '')[:255] or None,
                    'ledAddress1': (record.get('address1') or '')[:255] or None,
                    'ledAddress2': (record.get('address2') or '')[:255] or None,
                    'ledAddress3': (record.get('address3') or '')[:255] or None,
                    'ledAddress4': (record.get('address4') or '')[:255] or None,
                    'ledState': (record.get('mailingState') or '')[:100] or None,
                    'ledCountry': (record.get('mailingCountry') or '')[:100] or None,
                    'ledPincode': (record.get('mailingPincode') or '')[:20] or None,
                    'mailingDetailsApplicableFrom': tally_date_to_iso(record.get('mailingApplicableFrom')),
                })
            
            elif entity_type == 'StockItem':
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'name': record.get('name'),
                    'parent': record.get('parent'),
                    'category': record.get('category'),
                    'description': record.get('description'),
                    'mailingName': record.get('mailingName'),
                    'baseUnits': record.get('baseUnits'),
                    'additionalUnits': record.get('additionalUnits'),
                    'openingBalance': record.get('openingBalance', 0),
                    'openingValue': record.get('openingValue', 0),
                    'openingRate': record.get('openingRate', 0),
                    'costingMethod': record.get('costingMethod'),
                    'valuationMethod': record.get('valuationMethod'),
                    'gstTypeOfSupply': record.get('gstTypeOfSupply'),
                    'hsnCode': record.get('hsnCode'),
                    'batchWiseOn': record.get('batchWiseOn', False),
                    'costCentersOn': record.get('costCentersOn', False),
                    'reservedName': record.get('reservedName', '')
                })
        
        return prepared
    
    def save_batch_to_database(self, records: List[Dict], company_id: int, endpoint: str) -> Tuple[bool, int]:
        """Save batch of records to database. Sets self._last_batch_error on failure."""
        self._last_batch_error = None
        try:
            url = f"{self.backend_url}{endpoint}/sync"
            
            if VERBOSE_MODE:
                logger.debug(f"Posting {len(records)} records to {url}")
            
            # Log exact payload being sent to help debug 500 errors
            sample_size = min(len(records), 2)
            logger.info(f"📤 Sending batch of {len(records)} records to {endpoint}. Sample: {json.dumps(records[:sample_size], indent=2)}")
            
            response = requests.post(url, json=records, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                # Backend SyncResponse format: {success, totalReceived, totalProcessed, message}
                count = result.get('totalProcessed', result.get('count', len(records)))
                if VERBOSE_MODE:
                    logger.debug(f"Saved {count} records")
                return True, count
            else:
                # Capture full error detail for upstream reporting
                error_body = ''
                try:
                    error_body = response.text[:500]
                except Exception:
                    error_body = 'Could not read response body'
                
                self._last_batch_error = f"HTTP {response.status_code}: {error_body}"
                logger.error(f"❌ Database error: HTTP {response.status_code}")
                logger.error(f"   URL: {url}")
                logger.error(f"   Response: {error_body}")
                return False, 0
        except requests.exceptions.Timeout:
            self._last_batch_error = f"Request timeout (30s) posting to {endpoint}/sync"
            logger.error(f"❌ Timeout saving batch to {endpoint}")
            return False, 0
        except requests.exceptions.ConnectionError as e:
            self._last_batch_error = f"Connection error: {str(e)[:200]}"
            logger.error(f"❌ Connection error saving batch: {e}")
            return False, 0
        except Exception as e:
            self._last_batch_error = f"Exception: {str(e)[:200]}"
            logger.error(f"Error saving batch: {e}")
            return False, 0
    
    def reconcile_records(self, company_id: int, entity_type: str, endpoint: str) -> Dict:
        """Reconcile records between Tally and database"""
        try:
            if VERBOSE_MODE:
                logger.debug(f"Starting reconciliation for {entity_type}")
            
            url = f"{self.backend_url}{endpoint}/reconcile"
            payload = {'cmpId': company_id, 'entityType': entity_type}
            
            response = requests.post(url, json=payload, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                if VERBOSE_MODE:
                    logger.debug(f"Reconciliation completed: {result.get('message', 'Done')}")
                return result
            else:
                logger.warning(f"⚠️ Reconciliation failed: HTTP {response.status_code}")
                return {'success': False, 'message': 'Reconciliation failed'}
        except Exception as e:
            logger.warning(f"⚠️ Error during reconciliation: {e}")
            return {'success': False, 'message': str(e)}
    
    def sync_incremental(self, company_id: int, user_id: int, tally_host: str, tally_port: int, 
                        entity_type: str = 'Ledger', endpoint: str = None,
                        is_first_sync: bool = False, last_alter_id: int = None, 
                        company_name: str = None, books_from: str = None) -> Dict:
        """Execute incremental sync with optional reconciliation
        
        Args:
            last_alter_id: If provided, use this as the starting point instead of fetching from backend
            company_name: Tally company name to switch context
            endpoint: Optional endpoint override. If not provided, derived from entity_type
            books_from: Company's BooksFrom date for accurate balance computation
        """
        
        # Map entity type to correct backend endpoint (same as reconciliation)
        if endpoint is None:
            endpoint_map = {
                'Group': '/groups',
                'Currency': '/currencies',
                'Unit': '/units',
                'StockGroup': '/stock-groups',
                'StockCategory': '/stock-categories',
                'CostCategory': '/cost-categories',
                'CostCenter': '/cost-centers',
                'Godown': '/godowns',
                'VoucherType': '/voucher-types',
                'TaxUnit': '/tax-units',
                'Ledger': '/ledgers',
                'StockItem': '/stock-items',
            }
            endpoint = endpoint_map.get(entity_type, '/ledgers')
        
        sync_type = 'FIRST-TIME' if is_first_sync else 'incremental'
        if VERBOSE_MODE:
            logger.info(f"\n🔄 {sync_type} {entity_type} sync for company {company_id}")
            if company_name:
                logger.info(f"🏢 Tally Company: {company_name}")
        
        # Pre-flight check: verify company is loaded in Tally
        if company_name:
            is_loaded, loaded_companies = self.verify_tally_company(tally_host, tally_port, company_name)
            if not is_loaded:
                error_msg = (f"Company '{company_name}' is not loaded in Tally. "
                           f"Loaded: {loaded_companies}. Aborting to prevent data mismatch.")
                logger.error(error_msg)
                return {'success': False, 'message': error_msg, 'count': 0}
        
        # Use provided last_alter_id or fetch from backend (PER ENTITY TYPE)
        if last_alter_id is None:
            last_alter_id = self.get_last_alter_id(company_id, entity_type)
        elif VERBOSE_MODE:
            logger.debug(f"Using max AlterID for {entity_type}: {last_alter_id}")
        
        # Generate TDL with AlterID filter
        tdl = self.generate_incremental_tdl(last_alter_id, entity_type, company_name, books_from)
        
        # Fetch from Tally
        if VERBOSE_MODE:
            logger.debug("Fetching from Tally Prime...")
        xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)
        
        if not xml_response:
            logger.error(f"Failed to fetch {entity_type} from Tally")
            return {'success': False, 'message': 'Failed to fetch from Tally', 'count': 0}
        
        # Parse response
        records = self.parse_xml_response(xml_response, entity_type)
        
        if not records:
            if VERBOSE_MODE:
                logger.info(f"✅ No new {entity_type} records")
            
            # Run reconciliation on first sync even if no new records
            if is_first_sync:
                self.reconcile_records(company_id, entity_type, endpoint)
            
            return {'success': True, 'message': 'No new records', 'count': 0, 'lastAlterID': last_alter_id, 'tallyRecords': []}
        
        # Prepare for database
        prepared_records = self.prepare_for_database(records, company_id, user_id, entity_type)
        
        # Save in batches with delay
        if VERBOSE_MODE:
            logger.info(f"💾 Saving {len(prepared_records)} {entity_type} records...")
        total_saved = 0
        
        for i in range(0, len(prepared_records), self.BATCH_SIZE):
            batch = prepared_records[i:i + self.BATCH_SIZE]
            success, count = self.save_batch_to_database(batch, company_id, endpoint)
            
            if not success:
                error_detail = getattr(self, '_last_batch_error', '') or 'Unknown error'
                logger.error(f"❌ Failed to save batch {i // self.BATCH_SIZE + 1}: {error_detail}")
                return {'success': False, 'message': f'Failed to save batch: {error_detail}', 'count': total_saved}
            
            total_saved += count
            
            # Delay between batches
            if i + self.BATCH_SIZE < len(prepared_records):
                time.sleep(self.BATCH_DELAY)
        
        # Get max AlterID
        max_alter_id = max([r['alterID'] for r in records])
        
        # Save last AlterID
        self.save_last_alter_id(company_id, max_alter_id, entity_type)
        
        # Run reconciliation on first sync
        if is_first_sync:
            self.reconcile_records(company_id, entity_type, endpoint)
        
        if VERBOSE_MODE or total_saved > 0:
            logger.info(f"✅ Synced {total_saved} {entity_type}(s) | Last AlterID: {max_alter_id}")
        
        # Write to structured incremental sync log
        try:
            sync_logger = get_sync_logger()
            total_tally = len(records)
            sync_logger.log_incremental(
                company_name=company_name or f'Company {company_id}',
                entity_type=entity_type,
                synced=total_saved,
                updated=0,
                unchanged=max(0, total_tally - total_saved),
                total_tally=total_tally,
                total_db=total_saved,
                alter_id=max_alter_id,
                status='success',
            )
        except Exception as log_err:
            logger.debug(f"Sync logger write failed: {log_err}")
        
        # Build tallyRecords cache for reconciliation (identity + prepared records)
        tally_records_cache = []
        for rec in records:
            tally_records_cache.append({
                'masterID': rec.get('masterID', ''),
                'guid': rec.get('guid', ''),
                'alterID': rec.get('alterID', 0),
                'name': rec.get('name', '')
            })
        
        return {
            'success': True,
            'message': f'Successfully synced {total_saved} {entity_type}s',
            'count': total_saved,
            'lastAlterID': max_alter_id,
            'tallyRecords': tally_records_cache
        }

    # ─── DB Fetch for Reconciliation ─────────────────────────────────

    def _fetch_db_records(self, company_id: int, entity_type: str) -> List[Dict]:
        """Fetch ALL records from database for a specific entity type and company"""
        endpoint_map = {
            'Group': 'groups', 'Currency': 'currencies', 'Unit': 'units',
            'StockGroup': 'stock-groups', 'StockCategory': 'stock-categories',
            'CostCategory': 'cost-categories', 'CostCenter': 'cost-centers',
            'Godown': 'godowns', 'VoucherType': 'voucher-types',
            'TaxUnit': 'tax-units', 'Ledger': 'ledgers', 'StockItem': 'stock-items'
        }
        endpoint_path = endpoint_map.get(entity_type)
        if not endpoint_path:
            logger.error(f"Unknown entity type for DB fetch: {entity_type}")
            return []
        url = f"{self.backend_url}/{endpoint_path}/company/{company_id}"
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    return data.get('data', [])
            else:
                logger.error(f"❌ DB fetch failed: HTTP {response.status_code}")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching DB records: {e}")
            return []

    # ─── Combined Sync + Reconcile (Single Tally Fetch) ──────────────

    def sync_and_reconcile(self, company_id: int, user_id: int, tally_host: str, tally_port: int,
                           entity_type: str = 'Ledger', company_name: str = None,
                           books_from: str = None) -> Dict:
        """Execute sync + reconciliation with a SINGLE Tally HTTP call.
        
        1. Fetch ALL records from Tally (no AlterID filter) — ONE HTTP call
        2. Records with alterID > lastAlterID → sync (insert/update) to DB
        3. Compare ALL Tally records with ALL DB records → find missing/stale
        4. Auto-sync missing/stale records (data already in memory, no re-fetch)
        5. Return combined sync + reconciliation result
        """
        endpoint_map = {
            'Group': '/groups', 'Currency': '/currencies', 'Unit': '/units',
            'StockGroup': '/stock-groups', 'StockCategory': '/stock-categories',
            'CostCategory': '/cost-categories', 'CostCenter': '/cost-centers',
            'Godown': '/godowns', 'VoucherType': '/voucher-types',
            'TaxUnit': '/tax-units', 'Ledger': '/ledgers', 'StockItem': '/stock-items',
        }
        endpoint = endpoint_map.get(entity_type, '/ledgers')

        logger.info(f"\n{'─'*80}")
        logger.info(f"🔄 Sync + Reconcile: {entity_type} for company {company_id} ({company_name or 'N/A'})")
        logger.info(f"{'─'*80}")

        # Pre-flight: verify company is loaded in Tally
        if company_name:
            is_loaded, loaded_companies = self.verify_tally_company(tally_host, tally_port, company_name)
            if not is_loaded:
                error_msg = (f"Company '{company_name}' is not loaded in Tally. "
                             f"Loaded: {loaded_companies}. Aborting to prevent data mismatch.")
                logger.error(error_msg)
                return {'success': False, 'message': error_msg, 'count': 0}

        # 1. Get lastAlterID from backend
        last_alter_id = self.get_last_alter_id(company_id, entity_type)

        # 2. Fetch ALL records from Tally (no AlterID filter → pass 0)
        tdl = self.generate_incremental_tdl(0, entity_type, company_name, books_from)
        xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)
        if not xml_response:
            logger.error(f"❌ Failed to fetch {entity_type} from Tally")
            return {'success': False, 'message': f'Failed to fetch {entity_type} from Tally', 'count': 0}

        # 3. Parse ALL records
        all_records = self.parse_xml_response(xml_response, entity_type)
        tally_count = len(all_records)
        logger.info(f"   📊 Tally: {tally_count} total {entity_type} records")

        if tally_count == 0:
            return {
                'success': True, 'message': f'No {entity_type} records in Tally', 'count': 0,
                'lastAlterID': last_alter_id,
                'reconciliation': {
                    'tallyCount': 0, 'dbCount': 0, 'missing': 0, 'updated': 0, 'synced': 0
                }
            }

        # 4. Identify NEW records (alterID > lastAlterID) → sync to DB
        new_records = [r for r in all_records if r.get('alterID', 0) > last_alter_id]
        total_saved = 0
        new_max_alter = last_alter_id

        if new_records:
            logger.info(f"   🔄 {len(new_records)} new/updated records (AlterID > {last_alter_id})")
            prepared = self.prepare_for_database(new_records, company_id, user_id, entity_type)
            for i in range(0, len(prepared), self.BATCH_SIZE):
                batch = prepared[i:i + self.BATCH_SIZE]
                success, count = self.save_batch_to_database(batch, company_id, endpoint)
                if success:
                    total_saved += count
                else:
                    error_detail = getattr(self, '_last_batch_error', '') or 'Unknown error'
                    logger.error(f"❌ Batch failed during sync: {error_detail}")
                if i + self.BATCH_SIZE < len(prepared):
                    time.sleep(self.BATCH_DELAY)
            new_max_alter = max(r['alterID'] for r in new_records)
            self.save_last_alter_id(company_id, new_max_alter, entity_type)
            logger.info(f"   ✅ Synced {total_saved} new records | AlterID: {new_max_alter}")
        else:
            logger.info(f"   ✅ No new records (AlterID > {last_alter_id})")

        # 5. Reconcile: compare ALL Tally records with DB
        db_records = self._fetch_db_records(company_id, entity_type)
        db_count = len(db_records)
        logger.info(f"   📊 DB: {db_count} records")

        # Build lookups by masterID_guid
        tally_lookup = {}
        for rec in all_records:
            mid = rec.get('masterID', '')
            guid = rec.get('guid', '')
            if mid and guid:
                tally_lookup[f"{mid}_{guid}"] = rec

        db_lookup = {}
        for rec in db_records:
            mid = str(rec.get('masterId') or rec.get('masterID') or '')
            guid = str(rec.get('guid') or '')
            if mid and guid:
                db_lookup[f"{mid}_{guid}"] = rec

        # Find missing (in Tally, not in DB) and stale (DB alterID < Tally alterID)
        missing_records = []
        stale_records = []
        for key, tally_rec in tally_lookup.items():
            if key in db_lookup:
                db_rec = db_lookup[key]
                db_alter = db_rec.get('alterId') or db_rec.get('alterID') or 0
                if isinstance(db_alter, str):
                    try:
                        db_alter = int(db_alter)
                    except (ValueError, TypeError):
                        db_alter = 0
                if tally_rec.get('alterID', 0) > db_alter:
                    stale_records.append(tally_rec)
            else:
                missing_records.append(tally_rec)

        # Auto-sync missing/stale (data already in memory — NO additional Tally fetch!)
        recon_synced = 0
        all_to_sync = missing_records + stale_records
        if all_to_sync:
            logger.info(f"   🔧 Reconciliation: {len(missing_records)} missing, {len(stale_records)} stale → auto-syncing")
            prepared = self.prepare_for_database(all_to_sync, company_id, user_id, entity_type)
            for i in range(0, len(prepared), self.BATCH_SIZE):
                batch = prepared[i:i + self.BATCH_SIZE]
                success, count = self.save_batch_to_database(batch, company_id, endpoint)
                if success:
                    recon_synced += count
                if i + self.BATCH_SIZE < len(prepared):
                    time.sleep(self.BATCH_DELAY)
            logger.info(f"   ✅ Auto-synced {recon_synced} reconciliation records")
        else:
            logger.info(f"   ✅ Reconciliation: all records in sync")

        # Write to structured logs
        try:
            sync_logger = get_sync_logger()
            sync_logger.log_incremental(
                company_name=company_name or f'Company {company_id}',
                entity_type=entity_type,
                synced=total_saved,
                updated=0,
                unchanged=max(0, tally_count - len(new_records)),
                total_tally=tally_count,
                total_db=db_count,
                alter_id=new_max_alter,
                status='success',
            )
            sync_logger.log_reconciliation(
                company_name=company_name or f'Company {company_id}',
                entity_type=entity_type,
                tally_count=tally_count,
                db_count=db_count,
                missing=len(missing_records),
                updated=len(stale_records),
                synced=recon_synced,
                unchanged=max(0, tally_count - len(missing_records) - len(stale_records)),
                status='success',
            )
        except Exception as log_err:
            logger.debug(f"Sync logger write failed: {log_err}")

        return {
            'success': True,
            'message': f'Synced {total_saved}, reconciled {recon_synced} {entity_type}(s)',
            'count': total_saved,
            'lastAlterID': new_max_alter if new_records else last_alter_id,
            'reconciliation': {
                'tallyCount': tally_count,
                'dbCount': db_count,
                'missing': len(missing_records),
                'updated': len(stale_records),
                'synced': recon_synced
            }
        }


def main():
    """Main sync function"""
    try:
        # Parse arguments
        company_id = sys.argv[1] if len(sys.argv) > 1 else '1'
        user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        tally_host = sys.argv[3] if len(sys.argv) > 3 else 'localhost'
        tally_port = int(sys.argv[4]) if len(sys.argv) > 4 else 9000
        backend_url = sys.argv[5] if len(sys.argv) > 5 else os.getenv('BACKEND_URL')
        auth_token = sys.argv[6] if len(sys.argv) > 6 else ''
        device_token = sys.argv[7] if len(sys.argv) > 7 else ''
        entity_type = sys.argv[8] if len(sys.argv) > 8 else 'Ledger'
        max_alter_id = int(sys.argv[9]) if len(sys.argv) > 9 else 0
        
        # Log sync start
        logger.info("="*80)
        logger.info("🔄 INCREMENTAL SYNC STARTED")
        logger.info(f"   Company ID: {company_id}")
        logger.info(f"   Entity Type: {entity_type}")
        logger.info(f"   Max Alter ID: {max_alter_id}")
        logger.info(f"   Tally Port: {tally_port}")
        logger.info("="*80)
        
        # Initialize sync manager
        sync_manager = IncrementalSyncManager(backend_url, auth_token, device_token)
        
        # Define Tally sync order (respecting dependencies)
        SYNC_ORDER = [
            ('Group', '/groups'),
            ('Currency', '/currencies'),
            ('Unit', '/units'),
            ('StockGroup', '/stock-groups'),
            ('StockCategory', '/stock-categories'),
            ('CostCategory', '/cost-categories'),
            ('CostCenter', '/cost-centers'),
            ('Godown', '/godowns'),
            ('VoucherType', '/voucher-types'),
            ('TaxUnit', '/tax-units'),
            ('Ledger', '/ledgers'),
            ('StockItem', '/stock-items'),
        ]
        
        # Determine endpoint - backend uses /groups, /ledgers, /stock-items (no /api prefix)
        endpoint_map = {
            'Group': '/groups',
            'Currency': '/currencies',
            'Unit': '/units',
            'StockGroup': '/stock-groups',
            'StockCategory': '/stock-categories',
            'CostCategory': '/cost-categories',
            'CostCenter': '/cost-centers',
            'Godown': '/godowns',
            'VoucherType': '/voucher-types',
            'TaxUnit': '/tax-units',
            'Ledger': '/ledgers',
            'StockItem': '/stock-items',
        }
        endpoint = endpoint_map.get(entity_type, '/ledgers')
        
        # Check if syncing all companies
        if company_id.lower() == 'all':
            logger.info("🔄 Starting sync for ALL companies...")
            
            # Fetch all companies
            companies = sync_manager.fetch_companies()
            
            if not companies:
                result = {'success': False, 'message': 'No companies found', 'count': 0}
                print(json.dumps(result))
                sys.exit(1)
            
            total_synced = 0
            results = []
            
            # Sync each company
            for company in companies:
                cmp_id = company['id']
                cmp_name = company['name']
                cmp_books_from = company.get('booksStart') or company.get('financialYearStart')
                
                logger.info(f"\n{'='*60}")
                logger.info(f"📦 Company {cmp_id}: {cmp_name}")
                if cmp_books_from:
                    logger.info(f"   📅 BooksFrom: {cmp_books_from}")
                logger.info(f"{'='*60}")
                
                # If entity_type is 'all', sync all entities in proper order
                if entity_type.lower() == 'all':
                    company_results = []
                    
                    # Fetch master mapping once for this company (more efficient)
                    logger.info(f"📊 Fetching master mapping for company {cmp_id}...")
                    master_mapping = sync_manager.get_master_mapping(cmp_id)
                    
                    for sync_entity, sync_endpoint in SYNC_ORDER:
                        logger.info(f"\n🔄 Syncing {sync_entity}...")
                        
                        # Get entity-specific max alterID from master mapping
                        entity_key_map = {
                            'Group': 'group',
                            'Currency': 'currency',
                            'Unit': 'units',
                            'StockGroup': 'stockgroup',
                            'StockCategory': 'stockcategory',
                            'CostCategory': 'costcategory',
                            'CostCenter': 'costcenter',
                            'Godown': 'godown',
                            'VoucherType': 'vouchertype',
                            'TaxUnit': 'taxunit',
                            'Ledger': 'ledger',
                            'StockItem': 'stockitem',
                        }
                        entity_key = entity_key_map.get(sync_entity, sync_entity.lower())
                        max_alter_id = master_mapping.get(entity_key, 0)
                        
                        is_first_sync = (max_alter_id == 0)
                        
                        # Execute sync for this entity
                        result = sync_manager.sync_incremental(
                            company_id=cmp_id,
                            user_id=user_id,
                            tally_host=tally_host,
                            tally_port=tally_port,
                            entity_type=sync_entity,
                            endpoint=sync_endpoint,
                            is_first_sync=is_first_sync,
                            last_alter_id=max_alter_id,
                            company_name=cmp_name,
                            books_from=cmp_books_from
                        )
                        
                        if result['success']:
                            total_synced += result['count']
                            company_results.append({
                                'entity': sync_entity,
                                'count': result['count'],
                                'status': 'success'
                            })
                        else:
                            company_results.append({
                                'entity': sync_entity,
                                'error': result['message'],
                                'status': 'failed'
                            })
                        
                        # Small delay between entities
                        time.sleep(0.3)
                    
                    results.append({
                        'company': cmp_name,
                        'entities': company_results,
                        'status': 'success'
                    })
                else:
                    # Single entity sync for this company
                    # Get entity-specific max alterID from master mapping
                    master_mapping = sync_manager.get_master_mapping(cmp_id)
                    entity_key_map = {
                        'Group': 'group',
                        'Currency': 'currency',
                        'Unit': 'units',
                        'StockGroup': 'stockgroup',
                        'StockCategory': 'stockcategory',
                        'CostCategory': 'costcategory',
                        'CostCenter': 'costcenter',
                        'Godown': 'godown',
                        'VoucherType': 'vouchertype',
                        'TaxUnit': 'taxunit',
                        'Ledger': 'ledger',
                        'StockItem': 'stockitem',
                    }
                    entity_key = entity_key_map.get(entity_type, entity_type.lower())
                    max_alter_id = master_mapping.get(entity_key, 0)
                    
                    is_first_sync = (max_alter_id == 0)
                    
                    # Execute sync for this company
                    result = sync_manager.sync_incremental(
                        company_id=cmp_id,
                        user_id=user_id,
                        tally_host=tally_host,
                        tally_port=tally_port,
                        entity_type=entity_type,
                        endpoint=endpoint,
                        is_first_sync=is_first_sync,
                        last_alter_id=max_alter_id,
                        company_name=cmp_name,
                        books_from=cmp_books_from
                    )
                    
                    if result['success']:
                        total_synced += result['count']
                        # Update company sync status to 'synced'
                        sync_manager.update_company_sync_status(cmp_id, 'synced', True)
                        results.append({'company': cmp_name, 'count': result['count'], 'status': 'success'})
                    else:
                        # Update company sync status to 'failed'
                        sync_manager.update_company_sync_status(cmp_id, 'failed', False)
                        results.append({'company': cmp_name, 'error': result['message'], 'status': 'failed'})
                
                # Small delay between companies
                time.sleep(0.5)
            
            # Output summary
            summary = {
                'success': True,
                'message': f'Synced {len(results)} companies',
                'totalRecords': total_synced,
                'companies': results
            }
            print(json.dumps(summary))
            sys.exit(0)
        else:
            # Single company sync
            company_id = int(company_id)
            
            # Define sync order for all entities
            SYNC_ORDER = [
                'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory', 
                'CostCategory', 'CostCenter', 'Godown', 'VoucherType', 
                'TaxUnit', 'Ledger', 'StockItem'
            ]
            
            # Check if syncing all entities
            if entity_type.lower() == 'all':
                logger.info(f"🔄 Syncing ALL entities for company {company_id} in Tally dependency order")
                
                # Get master mapping once for all entities
                master_mapping = sync_manager.get_master_mapping(company_id)
                entity_key_map = {
                    'Group': 'group',
                    'Currency': 'currency',
                    'Unit': 'units',
                    'StockGroup': 'stockgroup',
                    'StockCategory': 'stockcategory',
                    'CostCategory': 'costcategory',
                    'CostCenter': 'costcenter',
                    'Godown': 'godown',
                    'VoucherType': 'vouchertype',
                    'TaxUnit': 'taxunit',
                    'Ledger': 'ledger',
                    'StockItem': 'stockitem',
                }
                
                # Get company name and books_from date
                company_name = None
                cmp_books_from = None
                try:
                    companies = sync_manager.fetch_companies()
                    company = next((c for c in companies if c['id'] == company_id), None)
                    if company:
                        company_name = company['name']
                        cmp_books_from = company.get('booksStart') or company.get('financialYearStart')
                except:
                    pass
                
                results = []
                total_synced = 0
                
                for current_entity_type in SYNC_ORDER:
                    endpoint = f"/{current_entity_type.lower()}s" if current_entity_type not in ['Currency', 'TaxUnit'] else f"/{current_entity_type.lower().replace('unit', '-unit')}s" if current_entity_type == 'TaxUnit' else '/currencies'
                    if current_entity_type == 'Group':
                        endpoint = '/groups'
                    elif current_entity_type == 'StockGroup':
                        endpoint = '/stock-groups'
                    elif current_entity_type == 'StockCategory':
                        endpoint = '/stock-categories'
                    elif current_entity_type == 'StockItem':
                        endpoint = '/stock-items'
                    elif current_entity_type == 'CostCategory':
                        endpoint = '/cost-categories'
                    elif current_entity_type == 'CostCenter':
                        endpoint = '/cost-centers'
                    elif current_entity_type == 'VoucherType':
                        endpoint = '/voucher-types'
                    elif current_entity_type == 'TaxUnit':
                        endpoint = '/tax-units'
                    elif current_entity_type == 'Ledger':
                        endpoint = '/ledgers'
                    elif current_entity_type == 'Unit':
                        endpoint = '/units'
                    
                    entity_key = entity_key_map.get(current_entity_type, current_entity_type.lower())
                    max_alter_id = master_mapping.get(entity_key, 0)
                    is_first_sync = (max_alter_id == 0)
                    
                    logger.info(f"\n{'='*60}")
                    logger.info(f"🔄 Syncing {current_entity_type} (AlterID > {max_alter_id})")
                    logger.info(f"{'='*60}")
                    
                    result = sync_manager.sync_incremental(
                        company_id=company_id,
                        user_id=user_id,
                        tally_host=tally_host,
                        tally_port=tally_port,
                        entity_type=current_entity_type,
                        endpoint=endpoint,
                        is_first_sync=is_first_sync,
                        last_alter_id=max_alter_id,
                        company_name=company_name,
                        books_from=cmp_books_from
                    )
                    
                    if result['success']:
                        total_synced += result['count']
                        results.append({
                            'entity': current_entity_type,
                            'count': result['count'],
                            'status': 'success',
                            'lastAlterID': result.get('lastAlterID', max_alter_id)
                        })
                        logger.info(f"✅ {current_entity_type}: {result['count']} records synced")
                    else:
                        results.append({
                            'entity': current_entity_type,
                            'error': result['message'],
                            'status': 'failed'
                        })
                        logger.error(f"❌ {current_entity_type}: {result['message']}")
                    
                    # Small delay between entities
                    time.sleep(0.3)
                
                summary = {
                    'success': True,
                    'message': f'Synced {len([r for r in results if r["status"] == "success"])} entity types',
                    'totalRecords': total_synced,
                    'entities': results,
                    'companyId': company_id
                }
                
                # Update company status after all entities synced
                successful_entities = len([r for r in results if r['status'] == 'success'])
                if successful_entities == len(results):
                    # All entities synced successfully
                    sync_manager.update_company_sync_status(company_id, 'synced', True)
                    summary['companyStatus'] = 'synced'
                else:
                    # Some entities failed
                    sync_manager.update_company_sync_status(company_id, 'failed', False)
                    summary['companyStatus'] = 'failed'
                
                print(json.dumps(summary))
                sys.exit(0)
            
            # Single entity sync
            # If maxAlterID not provided, fetch from master-mapping for THIS ENTITY TYPE
            if max_alter_id == 0:
                master_mapping = sync_manager.get_master_mapping(company_id)
                entity_key_map = {
                    'Group': 'group',
                    'Currency': 'currency',
                    'Unit': 'units',
                    'StockGroup': 'stockgroup',
                    'StockCategory': 'stockcategory',
                    'CostCategory': 'costcategory',
                    'CostCenter': 'costcenter',
                    'Godown': 'godown',
                    'VoucherType': 'vouchertype',
                    'TaxUnit': 'taxunit',
                    'Ledger': 'ledger',
                    'StockItem': 'stockitem',
                }
                entity_key = entity_key_map.get(entity_type, entity_type.lower())
                max_alter_id = master_mapping.get(entity_key, 0)
            
            is_first_sync = (max_alter_id == 0)
            
            logger.info(f"🔄 Starting sync for company {company_id}")
            logger.info(f"   Entity: {entity_type}")
            logger.info(f"   Max AlterID for {entity_type} in DB: {max_alter_id}")
            logger.info(f"   First-time sync: {'Yes' if is_first_sync else 'No'}")
            
            # Get company name and books_from for Tally context
            company_name = None
            cmp_books_from = None
            try:
                companies = sync_manager.fetch_companies()
                company = next((c for c in companies if c['id'] == company_id), None)
                if company:
                    company_name = company['name']
                    cmp_books_from = company.get('booksStart') or company.get('financialYearStart')
            except:
                pass
            
            # Execute sync - fetch only records with alterID > max_alter_id
            result = sync_manager.sync_incremental(
                company_id=company_id,
                user_id=user_id,
                tally_host=tally_host,
                tally_port=tally_port,
                entity_type=entity_type,
                endpoint=endpoint,
                is_first_sync=is_first_sync,
                last_alter_id=max_alter_id,
                company_name=company_name,
                books_from=cmp_books_from
            )
            
            # Update company sync status based on result
            if result['success']:
                sync_manager.update_company_sync_status(company_id, 'synced', True)
            else:
                sync_manager.update_company_sync_status(company_id, 'failed', False)
            
            # Log completion
            logger.info("\n" + "="*80)
            if result['success']:
                logger.info("✅ INCREMENTAL SYNC COMPLETED")
                logger.info(f"   Entity Type: {entity_type}")
                logger.info(f"   Records Synced: {result.get('count', 0)}")
                logger.info(f"   Last Alter ID: {result.get('lastAlterID', 'N/A')}")
            else:
                logger.error("❌ INCREMENTAL SYNC FAILED")
                logger.error(f"   Error: {result.get('message', 'Unknown error')}")
            logger.info("="*80)
            
            # Output result
            print(json.dumps(result))
            sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        logger.error("="*80)
        logger.error("❌ INCREMENTAL SYNC - FATAL ERROR")
        logger.error(f"   Error: {str(e)}")
        logger.error("="*80)
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))
        sys.exit(1)


if __name__ == '__main__':
    main()
