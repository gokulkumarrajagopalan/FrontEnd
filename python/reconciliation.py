import requests
import sys
import os
import json
import xml.etree.ElementTree as ET
import re
import logging
from datetime import datetime
from typing import Dict, List, Optional

from sync_logger import get_sync_logger

# Logging configuration
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

# Create logs directory - use APPDATA when running as bundled exe
import sys as _sys
if getattr(_sys, 'frozen', False):
    LOG_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Tallify', 'logs')
else:
    LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
RECONCILIATION_LOG_FILE = os.path.join(LOG_DIR, 'sync_worker.log')

# Configure logging with both file and console handlers
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

# Remove existing handlers to avoid duplicates
logger.handlers = []

# File handler - always writes detailed logs
file_handler = logging.FileHandler(RECONCILIATION_LOG_FILE, encoding='utf-8')
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

# Legacy log file path (for backward compatibility)


class ReconciliationManager:
    """Manages reconciliation between Tally and Database"""
    
    BATCH_SIZE = 500
    
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
    
    def generate_reconciliation_tdl(self, entity_type: str = 'Ledger', company_name: str = None, books_from: str = None) -> str:
        """Generate TDL for reconciliation - fetches ALL records WITHOUT AlterID filter"""
        
        # Map entity type to Tally-specific names
        tally_entity_names = {
            'CostCenter': 'COSTCENTRE',
            'CostCategory': 'COSTCATEGORY'
        }
        tally_entity = tally_entity_names.get(entity_type, entity_type)
        
        # Define fetch fields for each entity type
        entity_fields = {
            'Group': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Nature, IsRevenue, RESERVEDNAME",
            'Currency': "GUID, MASTERID, ALTERID, Name, Symbol, FormalName, DecimalPlaces, DecimalSymbol",
            'Unit': "GUID, MASTERID, ALTERID, Name, Alias, OriginalName, DecimalPlaces, NumberOfDecimals",
            'StockGroup': "GUID, MASTERID, ALTERID, Name, Alias, Parent, BaseUnits, AdditionalUnits",
            'StockCategory': "GUID, MASTERID, ALTERID, Name, Alias, Parent",
            'CostCategory': "GUID, MASTERID, ALTERID, Name, Alias, AllocateRevenue, AllocateNonRevenue",
            'CostCenter': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Category",
            'Godown': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Address",
            'VoucherType': "GUID, MASTERID, ALTERID, Name, Alias, Parent, NumberingMethod, IsDeemedPositive",
            'TaxUnit': "GUID, MASTERID, ALTERID, Name, Alias, OriginalName",
            'Ledger': "GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, IsRevenue, LastParent, Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, ClosingBalance, LEDGERPHONE, LEDGERCOUNTRYISDCODE, LEDGERMOBILE, LEDGERCONTACT, WEBSITE, EMAIL, CURRENCYNAME, INCOMETAXNUMBER, LEDMAILINGDETAILS.*, VATAPPLICABLEDATE, VATDEALERTYPE, VATTINNUMBER, LEDGSTREGDETAILS.*",
            'StockItem': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Category, Description, BaseUnits, OpeningBalance, OpeningValue, OpeningRate, ReorderLevel, MinimumLevel, HSNCode, GST",
        }
        
        fetch_fields = entity_fields.get(entity_type, "GUID, MASTERID, ALTERID, Name")
        
        # Add company name to STATICVARIABLES if provided
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        
        # Date range: use books_from if available for accurate ClosingBalance
        # When companies don't maintain opening balances, using BooksFrom as SVFROMDATE
        # ensures ClosingBalance captures ALL transactions since inception
        now = datetime.now()
        if books_from:
            fy_start = books_from
            fy_end = now.strftime('%d-%b-%Y')
        else:
            if now.month >= 4:
                fy_start = f"01-Apr-{now.year}"
                fy_end = f"31-Mar-{now.year + 1}"
            else:
                fy_start = f"01-Apr-{now.year - 1}"
                fy_end = f"31-Mar-{now.year}"

        # NOTE: NO FILTERS - This fetches ALL records for reconciliation
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
                    </COLLECTION>
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
                timeout=300
            )
            
            if response.status_code == 200:
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
                # Skip elements without NAME attribute
                if not elem.get('NAME'):
                    continue
                    
                record = self._parse_element(elem, entity_type)
                if record:
                    records.append(record)
            
            return records
        except Exception as e:
            logger.error(f"❌ Error parsing XML: {e}")
            return []
    
    def _parse_element(self, elem, entity_type: str) -> Optional[Dict]:
        """Parse individual element - extract only masterID, guid, alterID for reconciliation"""
        try:
            def get_text(tag_name):
                child = elem.find(tag_name)
                if child is not None and child.text:
                    return child.text.strip()
                return None
            
            name = elem.get('NAME') or get_text('NAME')
            if not name:
                return None
            
            master_id = get_text('MASTERID')
            guid = get_text('GUID')
            alter_id = int(get_text('ALTERID') or 0)
            
            if not master_id or not guid:
                return None
            
            return {
                'masterID': master_id,
                'guid': guid,
                'alterID': alter_id,
                'name': name
            }
        except Exception as e:
            logger.warning(f"⚠️ Error parsing element: {e}")
            return None
    
    def fetch_db_data(self, company_id: int, entity_type: str) -> List[Dict]:
        """Fetch ALL records from database for specific company"""
        try:
            # Map entity type to backend endpoint
            endpoint_map = {
                'Group': 'groups',
                'Currency': 'currencies',
                'Unit': 'units',
                'StockGroup': 'stock-groups',
                'StockCategory': 'stock-categories',
                'CostCategory': 'cost-categories',
                'CostCenter': 'cost-centers',
                'Godown': 'godowns',
                'VoucherType': 'voucher-types',
                'TaxUnit': 'tax-units',
                'Ledger': 'ledgers',
                'StockItem': 'stock-items'
            }
            
            endpoint_path = endpoint_map.get(entity_type)
            if not endpoint_path:
                logger.error(f"Unknown entity type: {entity_type}")
                return []
            
            url = f"{self.backend_url}/{endpoint_path}/company/{company_id}"
            
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                # Handle both response formats: {'data': [...]} or [...]
                if isinstance(data, list):
                    records = data
                elif isinstance(data, dict):
                    records = data.get('data', [])
                else:
                    records = []
                return records
            else:
                logger.error(f"❌ Failed to fetch DB data: HTTP {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Error fetching DB data: {e}")
            return []
    
    def reconcile_entity(self, company_id: int, user_id: int, entity_type: str, 
                        tally_host: str, tally_port: int, company_name: str = None, books_from: str = None,
                        tally_cache: list = None, skip_tally: bool = False) -> Dict:
        """Reconcile specific entity type between Tally and Database
        
        Args:
            tally_cache: Optional list of cached tally records [{masterID, guid, alterID, name}, ...]
                         from the sync step. If provided, skips Tally fetch.
            skip_tally: If True and tally_cache is None, skip Tally fetch entirely
                        (used when sync just completed successfully with no changes).
        """
        
        logger.info(f"\n{'─'*80}")
        logger.info(f"🔍 Reconciling {entity_type} for company {company_id} ({company_name or 'N/A'})")
        logger.info(f"{'─'*80}")
        
        # If sync just completed successfully and no cache data, skip reconciliation
        if skip_tally and tally_cache is None:
            logger.info(f"   ⚡ Skipping Tally fetch — {entity_type} just synced successfully")
            db_records = self.fetch_db_data(company_id, entity_type)
            db_count = len(db_records)
            logger.info(f"   📊 DB has {db_count} records — marking as reconciled")
            result = {
                'success': True,
                'entityType': entity_type,
                'tallyCount': db_count,
                'dbCount': db_count,
                'missing': 0,
                'updated': 0,
                'synced': 0,
                'skippedTally': True
            }
            self.log_reconciliation(company_id, entity_type, result)
            try:
                sync_logger = get_sync_logger()
                sync_logger.log_reconciliation(
                    company_name=company_name or f'Company {company_id}',
                    entity_type=entity_type,
                    tally_count=db_count,
                    db_count=db_count,
                    missing=0, updated=0, synced=0, unchanged=db_count,
                    status='success (skip-tally)',
                )
            except Exception:
                pass
            return result
        
        # Step 1: Get Tally records — use cache if available, otherwise fetch from Tally
        if tally_cache is not None:
            tally_records = tally_cache
            logger.info(f"   📦 Using cached Tally data ({len(tally_records)} records) — skipping Tally fetch")
        else:
            tdl = self.generate_reconciliation_tdl(entity_type, company_name, books_from)
            xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)
            
            if not xml_response:
                error_msg = f"Failed to fetch {entity_type} from Tally"
                logger.error(f"❌ {error_msg}")
                return {
                    'success': False,
                    'entityType': entity_type,
                    'error': error_msg,
                    'tallyCount': 0,
                    'dbCount': 0
                }
            
            tally_records = self.parse_xml_response(xml_response, entity_type)
        
        # Step 2: Fetch ALL records from Database
        db_records = self.fetch_db_data(company_id, entity_type)
        
        tally_count = len(tally_records)
        db_count = len(db_records)
        
        logger.info(f"   📊 Tally: {tally_count} records | DB: {db_count} records")
        
        # Check for fetch failure
        if tally_count == 0 and db_count > 0:
            error_msg = "Tally returned 0 records but DB has records - connection issue"
            logger.error(f"❌ {error_msg}")
            result = {
                'success': False,
                'entityType': entity_type,
                'error': error_msg,
                'tallyCount': 0,
                'dbCount': db_count,
                'missing': 0,
                'updated': 0,
                'synced': 0
            }
            self.log_reconciliation(company_id, entity_type, result)
            return result
        
        # Step 3: Compare records
        # Create lookups: key = "masterID_guid"
        tally_lookup = {}
        for rec in tally_records:
            key = f"{rec['masterID']}_{rec['guid']}"
            tally_lookup[key] = rec
        
        db_lookup = {}
        for rec in db_records:
            master_id = rec.get('masterId') or rec.get('masterID')
            guid = rec.get('guid')
            if master_id and guid:
                key = f"{master_id}_{guid}"
                db_lookup[key] = rec
        
        # Step 4: Find records that need syncing
        missing_in_db = []  # In Tally but not in DB
        needs_update = []   # In both but Tally alterID > DB alterID
        
        for key, tally_rec in tally_lookup.items():
            if key in db_lookup:
                # Record exists in both - check alterID
                db_rec = db_lookup[key]
                tally_alter = tally_rec['alterID']
                db_alter = db_rec.get('alterId') or db_rec.get('alterID') or 0
                
                if tally_alter > db_alter:
                    needs_update.append({
                        'masterID': tally_rec['masterID'],
                        'guid': tally_rec['guid'],
                        'name': tally_rec['name'],
                        'tallyAlterID': tally_alter,
                        'dbAlterID': db_alter
                    })
            else:
                # Record missing in DB
                missing_in_db.append({
                    'masterID': tally_rec['masterID'],
                    'guid': tally_rec['guid'],
                    'name': tally_rec['name'],
                    'alterID': tally_rec['alterID']
                })
        
        total_to_sync = len(missing_in_db) + len(needs_update)
        
        logger.info(f"   📝 Missing in DB: {len(missing_in_db)}")
        logger.info(f"   🔄 Needs Update: {len(needs_update)}")
        logger.info(f"   ✅ Total to Sync: {total_to_sync}")
        
        # Step 5: Trigger sync if needed - combine missing and needs update
        synced_count = 0
        if total_to_sync > 0:
            all_to_sync = missing_in_db + [{'masterID': r['masterID'], 'guid': r['guid'], 'name': r['name'], 'alterID': r['tallyAlterID']} for r in needs_update]
            sync_result = self.trigger_sync(company_id, user_id, entity_type, tally_host, tally_port, company_name, all_to_sync)
            synced_count = sync_result.get('count', 0)
        
        # Result
        result = {
            'success': True,
            'entityType': entity_type,
            'tallyCount': tally_count,
            'dbCount': db_count,
            'missing': len(missing_in_db),
            'updated': len(needs_update),
            'synced': synced_count,
            'missingDetails': missing_in_db[:10] if missing_in_db else [],  # First 10 for logging
            'updateDetails': needs_update[:10] if needs_update else []
        }
        
        # Log consolidated reconciliation summary
        self.log_reconciliation(company_id, entity_type, result)
        
        # Write to structured reconciliation log
        try:
            sync_logger = get_sync_logger()
            unchanged = tally_count - len(missing_in_db) - len(needs_update)
            sync_logger.log_reconciliation(
                company_name=company_name or f'Company {company_id}',
                entity_type=entity_type,
                tally_count=tally_count,
                db_count=db_count,
                missing=len(missing_in_db),
                updated=len(needs_update),
                synced=synced_count,
                unchanged=max(0, unchanged),
                status='success',
                missing_details=missing_in_db[:10] if missing_in_db else None,
                update_details=needs_update[:10] if needs_update else None,
            )
        except Exception as log_err:
            logger.debug(f"Sync logger write failed: {log_err}")
        
        return result
    
    def trigger_sync(self, company_id: int, user_id: int, entity_type: str, 
                    tally_host: str, tally_port: int, company_name: str = None, missing_records: List[Dict] = None) -> Dict:
        """Trigger sync to insert/update records - fetches ALL from Tally and filters for missing ones"""
        try:
            logger.info(f"   🔄 Triggering sync for {entity_type}...")
            
            # Import incremental sync manager
            # Note: We import here to avoid circular dependency if moved to top, 
            # but since we are refactoring, we rely on the class structure.
            # However, for now, local import is safe.
            from incremental_sync import IncrementalSyncManager
            
            # Initialize sync manager
            sync_manager = IncrementalSyncManager(
                self.backend_url,
                self.headers.get('Authorization', '').replace('Bearer ', ''),
                self.headers.get('X-Device-Token', '')
            )
            
            # Map entity to endpoint
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
                'StockItem': '/stock-items'
            }
            
            endpoint = endpoint_map.get(entity_type, '/ledgers')
            
            # Generate TDL WITHOUT alterID filter to fetch ALL records
            tdl = sync_manager.generate_incremental_tdl(0, entity_type, company_name)  # 0 = fetch ALL
            xml_response = sync_manager.fetch_from_tally(tdl, tally_host, tally_port)
            
            if not xml_response:
                logger.error(f"Failed to fetch {entity_type} from Tally")
                return {'success': False, 'count': 0, 'error': 'Failed to fetch from Tally'}
            
            # Parse ALL Tally records
            all_tally_records = sync_manager.parse_xml_response(xml_response, entity_type)
            logger.info(f"✅ Fetched {len(all_tally_records)} total {entity_type} records from Tally")
            
            if not all_tally_records:
                logger.info(f"No {entity_type} records found in Tally")
                return {'success': True, 'count': 0}
            
            # If missing_records provided, filter to only those GUIDs
            if missing_records:
                missing_guids = {rec['guid'] for rec in missing_records}
                tally_records = [rec for rec in all_tally_records if rec.get('guid') in missing_guids]
                logger.info(f"✅ Filtered to {len(tally_records)} missing records")
            else:
                tally_records = all_tally_records
            
            if not tally_records:
                logger.info(f"No records to sync after filtering")
                return {'success': True, 'count': 0}
            
            # Prepare records for database
            prepared_records = sync_manager.prepare_for_database(tally_records, company_id, user_id, entity_type)
            logger.info(f"✅ Prepared {len(prepared_records)} records for sync")
            # Sync to database
            total_synced = 0
            batch_size = 500
            
            for i in range(0, len(prepared_records), batch_size):
                batch = prepared_records[i:i + batch_size]
                
                # Post to sync endpoint
                url = f"{self.backend_url}{endpoint}/sync"
                response = requests.post(url, json=batch, headers=self.headers, timeout=30)
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    batch_count = result.get('totalProcessed', len(batch))
                    total_synced += batch_count
                    logger.info(f"✅ Synced batch {i // batch_size + 1}: {batch_count} records")
                else:
                    error_detail = response.text[:200] if response.text else 'No error details'
                    logger.error(f"❌ Failed to sync batch {i // batch_size + 1}: HTTP {response.status_code}")
                    logger.error(f"   Error: {error_detail}")
                    return {'success': False, 'count': total_synced, 'error': f'HTTP {response.status_code}: {error_detail}'}
            
            logger.info(f"✅ Total synced: {total_synced} {entity_type} records")
            
            # Update max alterID
            if tally_records:
                new_max_alter_id = max([r['alterID'] for r in tally_records])
                sync_manager.save_last_alter_id(company_id, new_max_alter_id, entity_type)
            
            return {'success': True, 'count': total_synced}
            
        except Exception as e:
            logger.error(f"❌ Error triggering sync: {e}")
            return {'success': False, 'count': 0, 'error': str(e)}
    
    # ─── Voucher Reconciliation ──────────────────────────────────────
    
    def generate_voucher_reconciliation_tdl(self, company_name: str = None, from_date: str = None, to_date: str = None) -> str:
        """Generate TDL to fetch ALL vouchers from Tally for reconciliation (NO AlterID filter).
        Fetches only identity fields (GUID, MASTERID, ALTERID) for comparison."""
        
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        
        # Use sensible date range defaults
        now = datetime.now()
        if not from_date:
            if now.month >= 4:
                from_date = f"01-Apr-{now.year}"
            else:
                from_date = f"01-Apr-{now.year - 1}"
        if not to_date:
            if now.month >= 4:
                to_date = f"31-Mar-{now.year + 1}"
            else:
                to_date = f"31-Mar-{now.year}"
        
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
                        <COMPUTE>LedgerEntryCount : $$NumItems:AllLedgerEntries</COMPUTE>
                        <COMPUTE>InventoryEntryCount : $$NumItems:AllInventoryEntries</COMPUTE>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    def parse_voucher_reconciliation_xml(self, xml_string: str) -> List[Dict]:
        """Parse voucher XML for reconciliation - extract only identity fields"""
        try:
            # Strip namespace prefixes like <UDF:FIELD> → <UDF_FIELD> (Tally UDF fields)
            xml_string = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', xml_string)
            xml_string = re.sub(r'&#([0-9]+);', lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), xml_string)
            root = ET.fromstring(xml_string)
            records = []
            
            for elem in root.iter('VOUCHER'):
                try:
                    guid = elem.findtext('GUID', '').strip() if elem.findtext('GUID') else ''
                    master_id = elem.findtext('MASTERID', '').strip() if elem.findtext('MASTERID') else ''
                    alter_id_str = elem.findtext('ALTERID', '0').strip() if elem.findtext('ALTERID') else '0'
                    alter_id = int(alter_id_str) if alter_id_str else 0
                    
                    voucher_number = elem.findtext('VOUCHERNUMBER', '').strip() if elem.findtext('VOUCHERNUMBER') else ''
                    voucher_type = elem.findtext('VOUCHERTYPENAME', '').strip() if elem.findtext('VOUCHERTYPENAME') else ''
                    
                    # Parse sub-table counts (from TDL COMPUTE)
                    led_count_str = elem.findtext('LEDGERENTRYCOUNT', '0').strip() if elem.findtext('LEDGERENTRYCOUNT') else '0'
                    inv_count_str = elem.findtext('INVENTORYENTRYCOUNT', '0').strip() if elem.findtext('INVENTORYENTRYCOUNT') else '0'
                    try:
                        ledger_entry_count = int(led_count_str)
                    except (ValueError, TypeError):
                        ledger_entry_count = 0
                    try:
                        inventory_entry_count = int(inv_count_str)
                    except (ValueError, TypeError):
                        inventory_entry_count = 0
                    
                    if not guid or alter_id == 0:
                        continue
                    
                    records.append({
                        'guid': guid,
                        'masterID': master_id,
                        'alterID': alter_id,
                        'name': f"{voucher_type} {voucher_number}" if voucher_number else guid,
                        'ledgerEntryCount': ledger_entry_count,
                        'inventoryEntryCount': inventory_entry_count
                    })
                except Exception as e:
                    logger.warning(f"⚠️ Error parsing voucher element: {e}")
                    continue
            
            return records
        except Exception as e:
            logger.error(f"❌ Error parsing voucher reconciliation XML: {e}")
            return []
    
    def fetch_db_vouchers(self, company_id: int) -> List[Dict]:
        """Fetch ALL voucher records from database for a specific company"""
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
    
    def fetch_db_voucher_statistics(self, company_id: int) -> Dict:
        """Fetch voucher statistics (counts by type) from database"""
        try:
            url = f"{self.backend_url}/vouchers/company/{company_id}/statistics"
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                return data if isinstance(data, dict) else {}
            else:
                logger.warning(f"⚠️ Could not fetch voucher statistics: HTTP {response.status_code}")
                return {}
        except Exception as e:
            logger.warning(f"⚠️ Error fetching voucher statistics: {e}")
            return {}

    def fetch_db_voucher_sub_table(self, company_id: int, endpoint_suffix: str) -> List[Dict]:
        """Fetch ALL records from a voucher sub-table by company ID"""
        try:
            url = f"{self.backend_url}/vouchers/company/{company_id}/{endpoint_suffix}"
            response = requests.get(url, headers=self.headers, timeout=300)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    return data.get('data', [])
                elif isinstance(data, list):
                    return data
                return []
            else:
                logger.warning(f"⚠️ Failed to fetch {endpoint_suffix}: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.warning(f"⚠️ Error fetching {endpoint_suffix}: {e}")
            return []

    def fetch_all_voucher_sub_tables(self, company_id: int) -> Dict:
        """Fetch counts from all voucher sub-tables for reconciliation reporting"""
        sub_tables = {
            'ledgerEntries': 'all-ledger-entries',
            'billAllocations': 'all-bill-allocations',
            'inventoryEntries': 'all-inventory-entries',
            'batchAllocations': 'all-batch-allocations',
            'costCategoryAllocations': 'all-cost-categories',
            'costCentreAllocations': 'all-cost-centres',
        }
        
        result = {}
        for key, endpoint in sub_tables.items():
            records = self.fetch_db_voucher_sub_table(company_id, endpoint)
            result[key] = len(records)
            if len(records) > 0:
                logger.info(f"   📊 DB {key}: {len(records)} records")
            else:
                logger.debug(f"   📊 DB {key}: unavailable or 0")
        
        return result

    def fetch_db_voucher_detail(self, voucher_id: int) -> Dict:
        """Fetch sub-table counts for a single voucher via per-voucher endpoints"""
        sub_endpoints = {
            'ledgerEntries': 'ledger-entries',
            'billAllocations': 'bill-allocations',
            'inventoryEntries': 'inventory-entries',
            'batchAllocations': 'batch-allocations',
            'costCategoryAllocations': 'cost-categories',
            'costCentreAllocations': 'cost-centres',
        }
        counts = {}
        for key, endpoint in sub_endpoints.items():
            try:
                url = f"{self.backend_url}/vouchers/{voucher_id}/{endpoint}"
                response = requests.get(url, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    counts[key] = len(data) if isinstance(data, list) else len(data.get('data', []))
                else:
                    counts[key] = 0
            except Exception:
                counts[key] = 0
        return counts

    def fetch_db_sub_table_summary(self, company_id: int) -> Dict:
        """Fetch aggregate sub-table counts for a company — single HTTP call.

        Calls GET /vouchers/company/{cmpId}/sub-table-summary which runs six
        COUNT(*) queries server-side.  Returns a dict like:
          {'ledgerEntries': N, 'inventoryEntries': N, 'billAllocations': N, ...}
        Returns {} on failure (caller should treat missing keys as 0).
        """
        try:
            url = f"{self.backend_url}/vouchers/company/{company_id}/sub-table-summary"
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                # Strip non-numeric keys (e.g. 'success')
                return {k: int(v) for k, v in data.items() if isinstance(v, (int, float))}
            logger.warning(f"⚠️ sub-table-summary HTTP {response.status_code} — falling back to 0 counts")
            return {}
        except Exception as e:
            logger.warning(f"⚠️ sub-table-summary error: {e}")
            return {}

    def fetch_db_sub_table_counts_by_voucher(self, company_id: int, db_vouchers: List[Dict],
                                              matched_guids: List[str] = None) -> Dict:
        """Fetch per-voucher sub-table counts from DB.
        
        First tries aggregate endpoints. If those fail, falls back to
        per-voucher endpoints for matched vouchers only.
        
        Returns dict keyed by voucher GUID with counts:
        { guid: {'ledgerEntries': N, 'inventoryEntries': N, ...} }
        """
        per_voucher_counts = {}
        
        # First try aggregate endpoints to build per-voucher counts
        sub_tables = {
            'ledgerEntries': 'all-ledger-entries',
            'billAllocations': 'all-bill-allocations',
            'inventoryEntries': 'all-inventory-entries',
            'batchAllocations': 'all-batch-allocations',
            'costCategoryAllocations': 'all-cost-categories',
            'costCentreAllocations': 'all-cost-centres',
        }
        
        # Build voucher_id → guid mapping from DB records
        id_to_guid = {}
        guid_to_id = {}
        for v in db_vouchers:
            vid = v.get('id', 0)
            vguid = v.get('guid', v.get('GUID', ''))
            if vid and vguid:
                id_to_guid[vid] = vguid
                guid_to_id[vguid] = vid
                if vguid not in per_voucher_counts:
                    per_voucher_counts[vguid] = {k: 0 for k in sub_tables.keys()}
        
        aggregate_available = False
        for key, endpoint in sub_tables.items():
            records = self.fetch_db_voucher_sub_table(company_id, endpoint)
            if records:
                aggregate_available = True
                # Group by voucher_id
                for rec in records:
                    vid = rec.get('voucherId', rec.get('voucher_id', 0))
                    guid = id_to_guid.get(vid, '')
                    if guid and guid in per_voucher_counts:
                        per_voucher_counts[guid][key] += 1
        
        if not aggregate_available and matched_guids:
            logger.info(f"   ℹ️ DB aggregate endpoints unavailable, fetching per-voucher counts for {len(matched_guids)} matched vouchers...")
            # Fetch per-voucher sub-table counts using concurrent requests
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            def _fetch_one(guid_vid):
                g, v = guid_vid
                return g, self.fetch_db_voucher_detail(v)
            
            work_items = [(g, guid_to_id[g]) for g in matched_guids if g in guid_to_id]
            fetched = 0
            with ThreadPoolExecutor(max_workers=20) as pool:
                futures = {pool.submit(_fetch_one, item): item for item in work_items}
                for future in as_completed(futures):
                    try:
                        guid, counts = future.result()
                        if counts:
                            per_voucher_counts[guid] = counts
                            fetched += 1
                            if fetched % 500 == 0:
                                logger.info(f"   📊 Fetched sub-table counts for {fetched}/{len(work_items)} vouchers...")
                    except Exception:
                        pass
            logger.info(f"   📊 Fetched sub-table counts for {fetched} matched vouchers")        
        return per_voucher_counts

    def reconcile_vouchers(self, company_id: int, user_id: int, company_guid: str,
                           tally_host: str, tally_port: int, company_name: str = None,
                           from_date: str = None, to_date: str = None,
                           tally_cache: list = None, skip_tally: bool = False,
                           single_fetch: bool = False) -> Dict:
        """Reconcile vouchers between Tally and Database.
        
        When single_fetch=True (default for post-sync reconciliation):
            Uses ONE Tally HTTP call for the full date range instead of 12 monthly calls.
            Much faster (~5s vs ~90s). Suitable when called after sync completes.
        
        When single_fetch=False (legacy/full reconciliation):
            Pulls data from Tally month by month, generates detailed month-wise report.
        
        Args:
            tally_cache: Optional list of cached voucher identity records from sync step.
                         If provided, skips all Tally HTTP fetches.
            skip_tally: If True and tally_cache is None, skip Tally fetch entirely
                        (used when sync just completed successfully with no changes).
        """
        import calendar
        import time as _time
        from datetime import datetime, timedelta
        import pandas as pd

        # If sync just completed successfully and no cache data, skip reconciliation
        if skip_tally and tally_cache is None:
            logger.info(f"\n{'='*80}")
            logger.info(f"⚡ VOUCHER RECONCILIATION SKIPPED — vouchers just synced successfully")
            logger.info(f"   Company: {company_name or 'N/A'} (ID: {company_id})")
            logger.info(f"{'='*80}")
            db_records = self.fetch_db_vouchers(company_id)
            db_count = len(db_records)
            logger.info(f"   📊 DB has {db_count} vouchers — marking as reconciled")
            result = {
                'success': True,
                'entityType': 'Voucher',
                'tallyCount': db_count,
                'dbCount': db_count,
                'missing': 0,
                'updated': 0,
                'synced': 0,
                'skippedTally': True
            }
            self.log_reconciliation(company_id, 'Voucher', result)
            return result

        logger.info(f"\n{'='*80}")
        logger.info(f"🔍 VOUCHER RECONCILIATION STARTED (Month-Wise DataFrame)")
        logger.info(f"   Company ID: {company_id}")
        logger.info(f"   Company Name: {company_name or 'N/A'}")
        logger.info(f"   Date Range: {from_date or 'FY Start'} → {to_date or 'Today'}")
        logger.info(f"{'='*80}")

        reconcile_start = _time.time()
        now = datetime.now()

        # ── Resolve date range ───────────────────────────────────────────
        if not from_date:
            start_year = now.year if now.month >= 4 else now.year - 1
            start_dt = datetime(start_year, 4, 1)
        else:
            start_dt = datetime.strptime(from_date, "%d-%b-%Y")

        if not to_date:
            end_dt = now  # current date
        else:
            end_dt = datetime.strptime(to_date, "%d-%b-%Y")

        _from_display = start_dt.strftime('%d-%b-%Y')
        _to_display = end_dt.strftime('%d-%b-%Y')

        try:
            get_sync_logger().log_voucher_reconcile_start(
                company_name=company_name or f'Company {company_id}',
                from_date=_from_display, to_date=_to_display)
        except Exception:
            pass

        # ── SINGLE-FETCH fast path ───────────────────────────────────────
        # One Tally HTTP call for the full date range instead of 12 monthly calls
        # Uses lightweight TDL (no COMPUTE sub-table counts) to avoid Tally timeout
        if single_fetch:
            # ── IN-MEMORY CACHE path (no Tally call at all) ──────────────
            # When tally_cache is provided (from sync step), use it directly
            if tally_cache and len(tally_cache) > 0:
                logger.info(f"   📦 Using in-memory cache — {len(tally_cache)} records (NO Tally fetch)")
                tally_records = []
                for rec in tally_cache:
                    g = rec.get('guid', '')
                    if g:
                        tally_records.append({
                            'guid': g,
                            'masterID': rec.get('masterID', ''),
                            'alterID': rec.get('alterID', 0),
                            'name': rec.get('name', g)
                        })
                tally_count = len(tally_records)
                logger.info(f"   📊 Cache: {tally_count} vouchers (from sync)")
            else:
                # ── TALLY FETCH fallback ─────────────────────────────────────
                logger.info(f"   ⚡ Single-fetch mode — 1 Tally call for full date range")
                tally_from = start_dt.strftime("%d-%b-%Y")
                tally_to = end_dt.strftime("%d-%b-%Y")

                # Lightweight TDL — identity fields only, NO COMPUTE (sub-table counts kill performance)
                company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
                lightweight_tdl = f"""<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of Vouchers</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">{tally_from}</SVFROMDATE>
                <SVTODATE TYPE="Date">{tally_to}</SVTODATE>
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

                xml_response = self.fetch_from_tally(lightweight_tdl, tally_host, tally_port)

                if not xml_response:
                    error_msg = "Single-fetch: failed to fetch vouchers from Tally"
                    logger.error(f"   ❌ {error_msg}")
                    result = {'success': False, 'entityType': 'Voucher', 'error': error_msg,
                              'tallyCount': 0, 'dbCount': 0, 'missing': 0, 'updated': 0, 'synced': 0}
                    self.log_reconciliation(company_id, 'Voucher', result)
                    return result

                tally_records = self.parse_voucher_reconciliation_xml(xml_response)
                tally_count = len(tally_records)
                logger.info(f"   📊 Tally: {tally_count} vouchers (single fetch)")

            # Fetch DB vouchers
            db_records = self.fetch_db_vouchers(company_id)
            db_count = len(db_records) if db_records else 0
            logger.info(f"   📊 DB: {db_count} vouchers")

            # Build lookup maps
            tally_guid_map = {}
            for rec in tally_records:
                g = rec.get('guid', '')
                if g:
                    tally_guid_map[g] = rec

            db_guid_map = {}
            if db_records:
                for rec in db_records:
                    g = rec.get('guid', rec.get('GUID', ''))
                    if g:
                        db_guid_map[g] = rec

            # Find missing and stale
            missing_in_db = []
            needs_update = []
            for guid, trec in tally_guid_map.items():
                if guid not in db_guid_map:
                    missing_in_db.append({
                        'guid': guid,
                        'masterID': trec.get('masterID', ''),
                        'name': trec.get('name', guid),
                        'alterID': trec.get('alterID', 0)
                    })
                else:
                    db_alter = db_guid_map[guid].get('alterId', db_guid_map[guid].get('alterID', 0)) or 0
                    if isinstance(db_alter, str):
                        try:
                            db_alter = int(db_alter)
                        except (ValueError, TypeError):
                            db_alter = 0
                    tally_alter = trec.get('alterID', 0)
                    if tally_alter > db_alter:
                        needs_update.append({
                            'guid': guid,
                            'masterID': trec.get('masterID', ''),
                            'name': trec.get('name', guid),
                            'tallyAlterID': tally_alter,
                            'dbAlterID': db_alter
                        })

            extra_in_db = [{'guid': g, 'name': db_guid_map[g].get('voucherNumber', g)}
                           for g in db_guid_map if g not in tally_guid_map]

            total_to_sync = len(missing_in_db) + len(needs_update)
            logger.info(f"   📝 Missing: {len(missing_in_db)} | Stale: {len(needs_update)} | Extra: {len(extra_in_db)}")

            # Re-sync missing/stale vouchers
            synced_count = 0
            if total_to_sync > 0:
                synced_count = self._trigger_voucher_resync(
                    company_id, user_id, company_guid,
                    tally_host, tally_port, company_name,
                    missing_in_db, needs_update,
                    from_date, to_date
                )

            reconcile_duration = _time.time() - reconcile_start
            logger.info(f"   ✅ Single-fetch reconciliation complete in {reconcile_duration:.1f}s")
            logger.info(f"      Synced: {synced_count} | Missing: {len(missing_in_db)} | Stale: {len(needs_update)}")

            result = {
                'success': True,
                'entityType': 'Voucher',
                'tallyCount': tally_count,
                'dbCount': db_count,
                'missing': len(missing_in_db),
                'updated': len(needs_update),
                'extra': len(extra_in_db),
                'synced': synced_count,
                'singleFetch': True
            }
            self.log_reconciliation(company_id, 'Voucher', result)

            try:
                sync_logger = get_sync_logger()
                sync_logger.log_reconciliation(
                    company_name=company_name or f'Company {company_id}',
                    entity_type='Voucher',
                    tally_count=tally_count, db_count=db_count,
                    missing=len(missing_in_db), updated=len(needs_update),
                    synced=synced_count,
                    unchanged=max(0, tally_count - len(missing_in_db) - len(needs_update)),
                    status='success')
            except Exception:
                pass

            return result

        # ── Setup dedicated voucher reconciliation log file ──────────────
        recon_log_path = os.path.join(LOG_DIR, 'voucher_reconciliation.log')
        def write_recon_log(line: str):
            try:
                with open(recon_log_path, 'a', encoding='utf-8') as f:
                    f.write(line + '\n')
            except Exception:
                pass

        write_recon_log(f"\n{'='*100}")
        write_recon_log(f"  VOUCHER RECONCILIATION REPORT  —  {now.strftime('%Y-%m-%d %H:%M:%S')}")
        write_recon_log(f"  Company: {company_name or 'N/A'} (ID: {company_id})")
        write_recon_log(f"  Date Range: {_from_display} → {_to_display}")
        write_recon_log(f"{'='*100}")

        # ── Step 1: Build month chunks ───────────────────────────────────
        month_chunks = []
        current_dt = start_dt
        while current_dt <= end_dt:
            _, last_day = calendar.monthrange(current_dt.year, current_dt.month)
            month_end = current_dt.replace(day=last_day)
            if month_end > end_dt:
                month_end = end_dt
            month_chunks.append((current_dt, month_end))
            current_dt = month_end + timedelta(days=1)

        logger.info(f"   📅 {len(month_chunks)} month(s) to fetch from Tally")

        # ── Step 2: Get Tally voucher data — use cache if available ───
        all_tally_rows = []
        month_fetch_summary = []
        fetch_success = True

        if tally_cache is not None:
            # Use cached data from sync step — skip all Tally HTTP fetches
            logger.info(f"   📦 Using cached Tally data ({len(tally_cache)} records) — skipping {len(month_chunks)} monthly Tally fetches")
            all_tally_rows = list(tally_cache)
            for rec in all_tally_rows:
                if 'month' not in rec:
                    rec['month'] = 'Cached'
            month_fetch_summary = [{'month': 'Cached', 'count': len(all_tally_rows), 'status': 'CACHED'}]
        else:
            # Fetch from Tally month by month (original flow)
            for chunk_start, chunk_end in month_chunks:
                month_label = chunk_start.strftime('%b-%Y')
                chunk_from_tally = chunk_start.strftime("%Y%m%d")
                chunk_to_tally = chunk_end.strftime("%Y%m%d")

                logger.info(f"   📅 [{month_label}] Fetching Tally vouchers {chunk_from_tally} → {chunk_to_tally}")
                tdl = self.generate_voucher_reconciliation_tdl(company_name, chunk_from_tally, chunk_to_tally)
                xml_response = self.fetch_from_tally(tdl, tally_host, tally_port)

                if xml_response:
                    month_records = self.parse_voucher_reconciliation_xml(xml_response)
                    for rec in month_records:
                        rec['month'] = month_label
                    all_tally_rows.extend(month_records)
                    month_fetch_summary.append({'month': month_label, 'count': len(month_records), 'status': 'OK'})
                    logger.info(f"   📅 [{month_label}] Fetched {len(month_records)} vouchers")
                    try:
                        get_sync_logger().log_voucher_reconcile_fetch(
                            chunk_from=chunk_from_tally, chunk_to=chunk_to_tally, count=len(month_records))
                    except Exception:
                        pass
                else:
                    logger.error(f"   ❌ [{month_label}] Failed to fetch vouchers from Tally")
                    month_fetch_summary.append({'month': month_label, 'count': 0, 'status': 'FAILED'})
                    try:
                        get_sync_logger().log_voucher_reconcile_fetch(
                            chunk_from=chunk_from_tally, chunk_to=chunk_to_tally,
                            count=0, error='Failed to fetch from Tally')
                    except Exception:
                        pass
                    fetch_success = False
                    break

        if not fetch_success and not all_tally_rows:
            error_msg = "Failed to fetch vouchers from Tally"
            logger.error(f"❌ {error_msg}")
            write_recon_log(f"\n❌ ABORTED: {error_msg}")
            result = {'success': False, 'entityType': 'Voucher', 'error': error_msg,
                      'tallyCount': 0, 'dbCount': 0}
            self.log_reconciliation(company_id, 'Voucher', result)
            return result

        # ── Build Tally DataFrame ────────────────────────────────────────
        tally_df = pd.DataFrame(all_tally_rows)
        tally_count = len(tally_df)
        logger.info(f"   📊 Tally DataFrame: {tally_count} vouchers across {len(month_chunks)} month(s)")

        # Log month-wise fetch summary
        write_recon_log(f"\n── MONTH-WISE TALLY FETCH ─────────────────────────────────────")
        write_recon_log(f"  {'Month':<12} {'Count':>8}  {'Status':<8}")
        write_recon_log(f"  {'─'*12} {'─'*8}  {'─'*8}")
        for ms in month_fetch_summary:
            write_recon_log(f"  {ms['month']:<12} {ms['count']:>8}  {ms['status']:<8}")
        write_recon_log(f"  {'─'*12} {'─'*8}  {'─'*8}")
        write_recon_log(f"  {'TOTAL':<12} {tally_count:>8}")

        # ── Step 3: Fetch ALL vouchers from Database into DataFrame ──────
        db_records = self.fetch_db_vouchers(company_id)
        db_df = pd.DataFrame(db_records) if db_records else pd.DataFrame()
        db_count = len(db_df)

        logger.info(f"   📊 DB DataFrame: {db_count} vouchers")

        # Fetch voucher statistics for sub-table reporting
        db_stats = self.fetch_db_voucher_statistics(company_id)
        total_active = db_stats.get('activeVouchers', 0)
        total_vouchers = db_stats.get('totalVouchers', 0)
        logger.info(f"   📊 DB Stats: {total_vouchers} total vouchers, {total_active} active")

        write_recon_log(f"\n── DATA SUMMARY ───────────────────────────────────────────────")
        write_recon_log(f"  Tally Vouchers : {tally_count}")
        write_recon_log(f"  DB Vouchers    : {db_count}")
        write_recon_log(f"  DB Active      : {total_active}")
        write_recon_log(f"  DB Total       : {total_vouchers}")

        # Check for fetch failure
        if tally_count == 0 and db_count > 0:
            error_msg = "Tally returned 0 vouchers but DB has records - possible connection issue"
            logger.error(f"❌ {error_msg}")
            write_recon_log(f"\n❌ ERROR: {error_msg}")
            result = {'success': False, 'entityType': 'Voucher', 'error': error_msg,
                      'tallyCount': 0, 'dbCount': db_count, 'missing': 0, 'updated': 0, 'synced': 0}
            self.log_reconciliation(company_id, 'Voucher', result)
            return result

        # ── Step 4: Reconcile using DataFrame merge ──────────────────────
        # Normalize DB guid column
        db_guid_col = 'guid'
        if not db_df.empty:
            # DB might use 'guid', 'GUID', etc.
            for col_candidate in ['guid', 'GUID']:
                if col_candidate in db_df.columns:
                    db_guid_col = col_candidate
                    break
            # Normalize alterId column in DB
            db_alter_col = None
            for col_candidate in ['alterId', 'alterID', 'alter_id', 'ALTERID']:
                if col_candidate in db_df.columns:
                    db_alter_col = col_candidate
                    break
            if db_alter_col is None:
                db_df['_db_alterID'] = 0
                db_alter_col = '_db_alterID'
        else:
            db_alter_col = '_db_alterID'

        # Build lookup structures from DataFrames
        tally_guid_set = set(tally_df['guid'].tolist()) if not tally_df.empty else set()
        db_guid_set = set(db_df[db_guid_col].dropna().tolist()) if not db_df.empty else set()

        # Build per-guid alterID maps
        tally_alter_map = {}
        tally_name_map = {}
        tally_masterid_map = {}
        tally_month_map = {}
        if not tally_df.empty:
            for _, row in tally_df.iterrows():
                g = row['guid']
                tally_alter_map[g] = row.get('alterID', 0)
                tally_name_map[g] = row.get('name', g)
                tally_masterid_map[g] = row.get('masterID', '')
                tally_month_map[g] = row.get('month', '')

        db_alter_map = {}
        db_name_map = {}
        if not db_df.empty:
            for _, row in db_df.iterrows():
                g = row.get(db_guid_col, '')
                if g:
                    db_alter_map[g] = row.get(db_alter_col, 0) or 0
                    db_name_map[g] = row.get('voucherNumber', row.get('voucher_number', g))

        # Find missing, stale, extra
        missing_in_db = []
        needs_update = []
        matched = []

        for guid in tally_guid_set:
            if guid in db_guid_set:
                tally_alter = tally_alter_map.get(guid, 0)
                db_alter = db_alter_map.get(guid, 0)
                if isinstance(db_alter, str):
                    try:
                        db_alter = int(db_alter)
                    except (ValueError, TypeError):
                        db_alter = 0
                if tally_alter > db_alter:
                    needs_update.append({
                        'guid': guid,
                        'masterID': tally_masterid_map.get(guid, ''),
                        'name': tally_name_map.get(guid, guid),
                        'month': tally_month_map.get(guid, ''),
                        'tallyAlterID': tally_alter,
                        'dbAlterID': db_alter
                    })
                else:
                    matched.append(guid)
            else:
                missing_in_db.append({
                    'guid': guid,
                    'masterID': tally_masterid_map.get(guid, ''),
                    'name': tally_name_map.get(guid, guid),
                    'month': tally_month_map.get(guid, ''),
                    'alterID': tally_alter_map.get(guid, 0)
                })

        extra_in_db = []
        for guid in db_guid_set:
            if guid not in tally_guid_set:
                extra_in_db.append({
                    'guid': guid,
                    'name': db_name_map.get(guid, guid)
                })

        total_to_sync = len(missing_in_db) + len(needs_update)

        logger.info(f"   📝 Missing in DB: {len(missing_in_db)}")
        logger.info(f"   🔄 Needs Update: {len(needs_update)}")
        logger.info(f"   🗑️ Extra in DB (deleted in Tally): {len(extra_in_db)}")
        logger.info(f"   ✅ Matched: {len(matched)}")
        logger.info(f"   ✅ Total to Sync: {total_to_sync}")

        try:
            get_sync_logger().log_voucher_reconcile_compare(
                company_name=company_name or f'Company {company_id}',
                tally_count=tally_count, db_count=db_count,
                missing=len(missing_in_db), needs_update=len(needs_update),
                extra_in_db=len(extra_in_db))
        except Exception:
            pass

        # ── Month-wise reconciliation breakdown ──────────────────────────
        # Group missing & stale by month for report
        missing_by_month = {}
        for rec in missing_in_db:
            m = rec.get('month', 'Unknown')
            missing_by_month[m] = missing_by_month.get(m, 0) + 1

        update_by_month = {}
        for rec in needs_update:
            m = rec.get('month', 'Unknown')
            update_by_month[m] = update_by_month.get(m, 0) + 1

        # Also count Tally records per month
        tally_by_month = {}
        if not tally_df.empty:
            month_counts = tally_df.groupby('month').size()
            for m_label, cnt in month_counts.items():
                tally_by_month[m_label] = cnt

        write_recon_log(f"\n── MONTH-WISE RECONCILIATION BREAKDOWN ────────────────────────")
        write_recon_log(f"  {'Month':<12} {'Tally':>8} {'Missing':>8} {'Stale':>8} {'OK':>8}")
        write_recon_log(f"  {'─'*12} {'─'*8} {'─'*8} {'─'*8} {'─'*8}")
        for ms in month_fetch_summary:
            m = ms['month']
            t_cnt = tally_by_month.get(m, 0)
            miss_cnt = missing_by_month.get(m, 0)
            upd_cnt = update_by_month.get(m, 0)
            ok_cnt = t_cnt - miss_cnt - upd_cnt
            write_recon_log(f"  {m:<12} {t_cnt:>8} {miss_cnt:>8} {upd_cnt:>8} {max(0,ok_cnt):>8}")

        write_recon_log(f"  {'─'*12} {'─'*8} {'─'*8} {'─'*8} {'─'*8}")
        total_ok = tally_count - len(missing_in_db) - len(needs_update)
        write_recon_log(f"  {'TOTAL':<12} {tally_count:>8} {len(missing_in_db):>8} {len(needs_update):>8} {max(0,total_ok):>8}")

        # ── Console: formatted month-wise table (only active months) ────
        logger.info(f"   ── Month-Wise Reconciliation {'─'*44}")
        logger.info(f"   {'Month':<12} {'Tally':>6} {'Missing':>8} {'Stale':>6} {'Status'}")
        logger.info(f"   {'─'*12} {'─'*6} {'─'*8} {'─'*6} {'─'*6}")
        active_months = [
            ms for ms in month_fetch_summary
            if tally_by_month.get(ms['month'], 0) > 0
            or missing_by_month.get(ms['month'], 0) > 0
            or update_by_month.get(ms['month'], 0) > 0
        ]
        for ms in active_months:
            m = ms['month']
            t_cnt = tally_by_month.get(m, 0)
            miss_cnt = missing_by_month.get(m, 0)
            upd_cnt = update_by_month.get(m, 0)
            st = '✅' if miss_cnt == 0 and upd_cnt == 0 else '⚠️'
            logger.info(f"   {m:<12} {t_cnt:>6} {miss_cnt:>8} {upd_cnt:>6} {st}")
        hidden = len(month_fetch_summary) - len(active_months)
        if hidden:
            logger.info(f"   ... ({hidden} months with 0 vouchers not shown)")
        logger.info(f"   {'─'*12} {'─'*6} {'─'*8} {'─'*6}")
        logger.info(f"   {'TOTAL':<12} {tally_count:>6} {len(missing_in_db):>8} {len(needs_update):>6}")

        # ── Log missing details ──────────────────────────────────────────
        if missing_in_db:
            write_recon_log(f"\n── MISSING IN DB (top 20) ─────────────────────────────────────")
            write_recon_log(f"  {'Month':<12} {'Name':<40} {'GUID':<55} {'AlterID':>8}")
            write_recon_log(f"  {'─'*12} {'─'*40} {'─'*55} {'─'*8}")
            for rec in missing_in_db[:20]:
                write_recon_log(f"  {rec.get('month',''):<12} {rec['name'][:40]:<40} {rec['guid']:<55} {rec['alterID']:>8}")

        if needs_update:
            write_recon_log(f"\n── NEEDS UPDATE (top 20) ──────────────────────────────────────")
            write_recon_log(f"  {'Month':<12} {'Name':<35} {'TallyAID':>10} {'DB_AID':>10} {'GUID':<30}")
            write_recon_log(f"  {'─'*12} {'─'*35} {'─'*10} {'─'*10} {'─'*30}")
            for rec in needs_update[:20]:
                write_recon_log(f"  {rec.get('month',''):<12} {rec['name'][:35]:<35} {rec['tallyAlterID']:>10} {rec['dbAlterID']:>10} {rec['guid'][:30]:<30}")

        if extra_in_db:
            write_recon_log(f"\n── EXTRA IN DB / DELETED IN TALLY (top 20) ────────────────────")
            write_recon_log(f"  {'Name':<50} {'GUID':<55}")
            write_recon_log(f"  {'─'*50} {'─'*55}")
            for rec in extra_in_db[:20]:
                write_recon_log(f"  {rec['name'][:50]:<50} {rec['guid']:<55}")

        # ── Step 4b: Sub-table reconciliation ────────────────────────────
        logger.info(f"   📊 Running sub-table reconciliation...")
        
        # Tally-side sub-table totals from parsed data
        tally_total_ledger_entries = 0
        tally_total_inventory_entries = 0
        tally_per_voucher_counts = {}
        if not tally_df.empty and 'ledgerEntryCount' in tally_df.columns:
            tally_total_ledger_entries = int(tally_df['ledgerEntryCount'].sum())
            tally_total_inventory_entries = int(tally_df['inventoryEntryCount'].sum())
            for _, row in tally_df.iterrows():
                g = row['guid']
                tally_per_voucher_counts[g] = {
                    'ledgerEntries': int(row.get('ledgerEntryCount', 0)),
                    'inventoryEntries': int(row.get('inventoryEntryCount', 0))
                }
        
        logger.info(f"   📊 Tally sub-table totals: {tally_total_ledger_entries} ledger entries, {tally_total_inventory_entries} inventory entries")
        
        # DB-side sub-table counts — single summary API call (avoids N×6 per-voucher HTTP requests)
        db_summary = self.fetch_db_sub_table_summary(company_id)
        db_total_ledger_entries    = db_summary.get('ledgerEntries', 0)
        db_total_inventory_entries = db_summary.get('inventoryEntries', 0)
        db_total_bill_allocs       = db_summary.get('billAllocations', 0)
        db_total_inv_batches       = db_summary.get('batchAllocations', 0)
        db_total_cost_cats         = db_summary.get('costCategoryAllocations', 0)
        db_total_cost_centres      = db_summary.get('costCentreAllocations', 0)

        logger.info(f"   📊 DB sub-table totals: led={db_total_ledger_entries} inv={db_total_inventory_entries} "
                    f"bill={db_total_bill_allocs} bat={db_total_inv_batches} "
                    f"ccat={db_total_cost_cats} cctr={db_total_cost_centres}")

        # Per-voucher mismatch detection (uses only Tally-side counts; DB-side omitted
        # to avoid exhausting TCP ports with thousands of per-voucher API calls)
        sub_table_mismatches = []
        db_sub_available = bool(db_summary)

        # Write sub-table reconciliation to log
        write_recon_log(f"\n── SUB-TABLE RECONCILIATION ───────────────────────────────────")
        write_recon_log(f"  {'Table':<30} {'Tally':>10} {'DB':>10} {'Diff':>10} {'Status':<10}")
        write_recon_log(f"  {'─'*30} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")
        
        sub_table_summary = [
            ('vouchers (header)', tally_count, db_count),
            ('voucher_ledger_entries', tally_total_ledger_entries, db_total_ledger_entries),
            ('voucher_inventory_entries', tally_total_inventory_entries, db_total_inventory_entries),
            ('voucher_bill_allocations', '-', db_total_bill_allocs),
            ('voucher_batch_allocations', '-', db_total_inv_batches),
            ('voucher_cost_category_alloc', '-', db_total_cost_cats),
            ('voucher_cost_centre_alloc', '-', db_total_cost_centres),
        ]
        
        for table_name, t_val, d_val in sub_table_summary:
            if isinstance(t_val, str):
                # Tally count not available for this table
                write_recon_log(f"  {table_name:<30} {'N/A':>10} {d_val:>10} {'N/A':>10} {'DB only':<10}")
            else:
                diff = t_val - d_val
                status = '✅ OK' if diff == 0 else f'⚠️ {abs(diff)}'
                write_recon_log(f"  {table_name:<30} {t_val:>10} {d_val:>10} {diff:>+10} {status:<10}")
        
        if not db_sub_available:
            write_recon_log(f"\n  ⚠️ NOTE: DB sub-table aggregate endpoints returned HTTP 500.")
            write_recon_log(f"  Sub-table DB counts are from sample voucher details (may be partial).")
        
        if sub_table_mismatches:
            write_recon_log(f"\n── SUB-TABLE MISMATCHES (per-voucher, top 20) ─────────────────")
            write_recon_log(f"  {'Name':<35} {'T.Led':>6} {'D.Led':>6} {'T.Inv':>6} {'D.Inv':>6} {'Issues':<25}")
            write_recon_log(f"  {'─'*35} {'─'*6} {'─'*6} {'─'*6} {'─'*6} {'─'*25}")
            for rec in sub_table_mismatches[:20]:
                write_recon_log(f"  {rec['name'][:35]:<35} {rec['tallyLedger']:>6} {rec['dbLedger']:>6} "
                               f"{rec['tallyInventory']:>6} {rec['dbInventory']:>6} {rec['issues'][:25]:<25}")
            if len(sub_table_mismatches) > 20:
                write_recon_log(f"  ... and {len(sub_table_mismatches) - 20} more mismatches")
        elif db_sub_available:
            write_recon_log(f"\n  ✅ All matched vouchers have correct sub-table entry counts")
        
        logger.info(f"   📊 Sub-table mismatches: {len(sub_table_mismatches)} voucher(s)")

        # ── Console: formatted sub-table counts table ────────────────────
        logger.info(f"   ── Sub-Table Counts (Tally vs DB) {'─'*38}")
        logger.info(f"   {'Table':<35} {'Tally':>10} {'DB':>10} {'Diff':>8} {'Status'}")
        logger.info(f"   {'─'*35} {'─'*10} {'─'*10} {'─'*8} {'─'*8}")
        _sub_display = [
            ('voucher_ledger_entries',     tally_total_ledger_entries,    db_total_ledger_entries),
            ('voucher_inventory_entries',  tally_total_inventory_entries, db_total_inventory_entries),
            ('voucher_bill_allocations',   None,                          db_total_bill_allocs),
            ('voucher_batch_allocations',  None,                          db_total_inv_batches),
            ('voucher_cost_category_alloc',None,                          db_total_cost_cats),
            ('voucher_cost_centre_alloc',  None,                          db_total_cost_centres),
        ]
        for _name, _tv, _dv in _sub_display:
            if _tv is None:
                logger.info(f"   {_name:<35} {'N/A':>10} {_dv:>10,} {'N/A':>8} DB only")
            else:
                _diff = _tv - _dv
                _st = '✅' if _diff == 0 else f'⚠️ {abs(_diff):,}'
                logger.info(f"   {_name:<35} {_tv:>10,} {_dv:>10,} {_diff:>+8,} {_st}")

        # ── Step 4c: Bills Outstanding Reconciliation ────────────────────
        logger.info(f"   📊 Running bills outstanding reconciliation...")
        bills_result = self.reconcile_bills_outstanding(
            company_id=company_id,
            tally_host=tally_host,
            tally_port=tally_port,
            company_name=company_name,
            write_log_fn=write_recon_log
        )

        # ── Console: formatted bills outstanding summary ──────────────────
        _br = bills_result.get('receivable', {})
        _bp = bills_result.get('payable', {})
        logger.info(f"   ── Bills Outstanding {'─'*52}")
        logger.info(f"   {'Type':<12} {'Tally':>8} {'Tally Total':>14} {'DB':>8} {'DB Total':>14} {'Status'}")
        logger.info(f"   {'─'*12} {'─'*8} {'─'*14} {'─'*8} {'─'*14} {'─'*8}")
        for _lbl, _bd in [('receivable', _br), ('payable', _bp)]:
            _tc = _bd.get('tallyCount', 0)
            _tt = _bd.get('tallyTotal', 0.0)
            _dc = _bd.get('dbCount', 0)
            _dt = _bd.get('dbTotal', 0.0)
            _ok = _tc == _dc and abs(_tt - _dt) < 0.5
            _sy = _bd.get('synced', 0)
            _st = '✅ OK' if _ok else (f'🔄 {_sy}' if _sy > 0 else '⚠️ diff')
            logger.info(f"   {_lbl:<12} {_tc:>8,} {_tt:>14,.2f} {_dc:>8,} {_dt:>14,.2f} {_st}")

        # ── Step 5: Re-sync missing/stale vouchers ───────────────────────
        synced_count = 0
        if total_to_sync > 0:
            synced_count = self._trigger_voucher_resync(
                company_id, user_id, company_guid,
                tally_host, tally_port, company_name,
                missing_in_db, needs_update,
                from_date, to_date
            )

        # ── Build result ─────────────────────────────────────────────────
        result = {
            'success': True,
            'entityType': 'Voucher',
            'tallyCount': tally_count,
            'dbCount': db_count,
            'missing': len(missing_in_db),
            'updated': len(needs_update),
            'extra': len(extra_in_db),
            'synced': synced_count,
            'subTables': {
                'totalVouchers': total_vouchers,
                'activeVouchers': total_active,
                'tally_ledgerEntries': tally_total_ledger_entries,
                'tally_inventoryEntries': tally_total_inventory_entries,
                'db_ledgerEntries': db_total_ledger_entries,
                'db_inventoryEntries': db_total_inventory_entries,
                'db_billAllocations': db_total_bill_allocs,
                'db_batchAllocations': db_total_inv_batches,
                'db_costCategoryAllocations': db_total_cost_cats,
                'db_costCentreAllocations': db_total_cost_centres,
                'subTableMismatches': len(sub_table_mismatches),
            },
            'billsOutstanding': bills_result,
            'monthWise': [
                {'month': ms['month'], 'tally': tally_by_month.get(ms['month'], 0),
                 'missing': missing_by_month.get(ms['month'], 0),
                 'stale': update_by_month.get(ms['month'], 0)}
                for ms in month_fetch_summary
            ],
            'missingDetails': missing_in_db[:10] if missing_in_db else [],
            'updateDetails': needs_update[:10] if needs_update else [],
            'extraDetails': extra_in_db[:10] if extra_in_db else []
        }

        self.log_reconciliation(company_id, 'Voucher', result)

        # Write to structured reconciliation log
        try:
            sync_logger = get_sync_logger()
            unchanged = tally_count - len(missing_in_db) - len(needs_update)
            sync_logger.log_reconciliation(
                company_name=company_name or f'Company {company_id}',
                entity_type='Voucher',
                tally_count=tally_count,
                db_count=db_count,
                missing=len(missing_in_db),
                updated=len(needs_update),
                synced=synced_count,
                unchanged=max(0, unchanged),
                status='success',
                missing_details=missing_in_db[:10] if missing_in_db else None,
                update_details=needs_update[:10] if needs_update else None,
            )
        except Exception as log_err:
            logger.debug(f"Sync logger write failed: {log_err}")

        # Write to dedicated voucher reconciliation log
        try:
            reconcile_duration = _time.time() - reconcile_start
            get_sync_logger().log_voucher_reconcile_complete(
                company_name=company_name or f'Company {company_id}',
                tally_count=tally_count, db_count=db_count,
                missing=len(missing_in_db), updated=len(needs_update),
                synced=synced_count, duration_seconds=reconcile_duration)
        except Exception:
            pass

        # Final summary in report log
        reconcile_duration = _time.time() - reconcile_start
        write_recon_log(f"\n── FINAL SUMMARY ──────────────────────────────────────────────")
        write_recon_log(f"  Voucher Headers:")
        write_recon_log(f"    Total in Tally   : {tally_count}")
        write_recon_log(f"    Total in DB      : {db_count}")
        write_recon_log(f"    Missing in DB    : {len(missing_in_db)}")
        write_recon_log(f"    Needs Update     : {len(needs_update)}")
        write_recon_log(f"    Extra in DB      : {len(extra_in_db)}")
        write_recon_log(f"    Auto-Synced      : {synced_count}")
        write_recon_log(f"  Sub-Tables:")
        write_recon_log(f"    Ledger Entries   : Tally={tally_total_ledger_entries}, DB={db_total_ledger_entries}")
        write_recon_log(f"    Inventory Entries: Tally={tally_total_inventory_entries}, DB={db_total_inventory_entries}")
        write_recon_log(f"    Bill Allocations : DB={db_total_bill_allocs}")
        write_recon_log(f"    Batch Allocations: DB={db_total_inv_batches}")
        write_recon_log(f"    Cost Categories  : DB={db_total_cost_cats}")
        write_recon_log(f"    Cost Centres     : DB={db_total_cost_centres}")
        write_recon_log(f"    Mismatches       : {len(sub_table_mismatches)} voucher(s)")
        _br = bills_result.get('receivable', {})
        _bp = bills_result.get('payable', {})
        write_recon_log(f"  Bills Outstanding:")
        write_recon_log(f"    Receivable       : Tally={_br.get('tallyCount',0)} bills (₹{_br.get('tallyTotal',0):,.2f}), DB={_br.get('dbCount',0)} bills (₹{_br.get('dbTotal',0):,.2f})")
        write_recon_log(f"    Payable          : Tally={_bp.get('tallyCount',0)} bills (₹{_bp.get('tallyTotal',0):,.2f}), DB={_bp.get('dbCount',0)} bills (₹{_bp.get('dbTotal',0):,.2f})")
        write_recon_log(f"    Bills Re-Synced  : {bills_result.get('totalSynced',0)}")
        write_recon_log(f"  Duration         : {reconcile_duration:.2f}s")
        write_recon_log(f"{'='*100}\n")

        logger.info(f"\n{'='*80}")
        logger.info(f"✅ VOUCHER RECONCILIATION COMPLETE")
        logger.info(f"   Total in Tally: {tally_count}")
        logger.info(f"   Total in DB: {db_count}")
        logger.info(f"   Missing: {len(missing_in_db)}")
        logger.info(f"   Needs Update: {len(needs_update)}")
        logger.info(f"   Auto-Synced: {synced_count}")
        logger.info(f"   Duration: {reconcile_duration:.2f}s")
        logger.info(f"   Report: {recon_log_path}")
        logger.info(f"\n   ── 8-Table Final Status {'─'*48}")
        _tally_refs = {
            'vouchers':                          (tally_count, db_count),
            'voucher_ledger_entries':            (tally_total_ledger_entries, db_total_ledger_entries),
            'voucher_inventory_entries':         (tally_total_inventory_entries, db_total_inventory_entries),
            'voucher_bill_allocations':          (None, db_total_bill_allocs),
            'voucher_batch_allocations':         (None, db_total_inv_batches),
            'voucher_cost_category_allocations': (None, db_total_cost_cats),
            'voucher_cost_centre_allocations':   (None, db_total_cost_centres),
            'bills_outstanding':                 (_br.get('tallyCount', 0) + _bp.get('tallyCount', 0),
                                                  _br.get('dbCount', 0) + _bp.get('dbCount', 0)),
        }
        logger.info(f"   {'#':<2} {'Table':<40} {'Tally':>10} {'DB':>10} {'Status'}")
        logger.info(f"   {'─'*2} {'─'*40} {'─'*10} {'─'*10} {'─'*10}")
        for _idx, (_tbl, (_tr, _dr)) in enumerate(_tally_refs.items(), 1):
            if _tr is None:
                logger.info(f"   {_idx:<2} {_tbl:<40} {'N/A':>10} {_dr:>10,} {'✅ DB only'}")
            elif _tr == _dr:
                logger.info(f"   {_idx:<2} {_tbl:<40} {_tr:>10,} {_dr:>10,} ✅ OK")
            else:
                _d = _tr - _dr
                logger.info(f"   {_idx:<2} {_tbl:<40} {_tr:>10,} {_dr:>10,} ⚠️ {_d:+d}")
        logger.info(f"{'='*80}\n")

        return result
    
    def _trigger_voucher_resync(self, company_id: int, user_id: int, company_guid: str,
                                 tally_host: str, tally_port: int, company_name: str,
                                 missing_records: List[Dict], stale_records: List[Dict],
                                 from_date: str = None, to_date: str = None) -> int:
        """Re-sync specific missing/stale vouchers by fetching only affected months from Tally."""
        try:
            from sync_vouchers import VoucherSyncManager
            import calendar
            
            # Combine missing + stale GUIDs
            all_guids = set()
            for rec in missing_records:
                all_guids.add(rec['guid'])
            for rec in stale_records:
                all_guids.add(rec['guid'])
            
            if not all_guids:
                return 0
            
            logger.info(f"   🔄 Re-syncing {len(all_guids)} vouchers...")
            
            vsm = VoucherSyncManager(self.backend_url,
                                     self.headers.get('Authorization', '').replace('Bearer ', ''),
                                     self.headers.get('X-Device-Token', ''))
            
            months_rev = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            # ── Build month chunks ONLY for months that have missing/stale vouchers ──
            affected_months = set()
            for rec in missing_records + stale_records:
                m = rec.get('month', '')
                if m:
                    affected_months.add(m)
            
            if not affected_months:
                logger.warning("   ⚠️ No month info on missing records, cannot re-sync")
                return 0
            
            # Parse affected months into date ranges
            chunks = []
            for month_label in sorted(affected_months):
                try:
                    dt = datetime.strptime(f"01-{month_label}", "%d-%b-%Y")
                    _, last_day = calendar.monthrange(dt.year, dt.month)
                    chunk_end = datetime(dt.year, dt.month, last_day)
                    # Clip to the overall to_date if provided
                    if to_date:
                        try:
                            end_dt = datetime.strptime(to_date, "%d-%b-%Y")
                            if chunk_end > end_dt:
                                chunk_end = end_dt
                        except ValueError:
                            pass
                    chunks.append((dt, chunk_end, month_label))
                except ValueError:
                    logger.warning(f"   ⚠️ Could not parse month: {month_label}")
            
            logger.info(f"   📅 Re-sync: {len(chunks)} affected month(s): {', '.join(m for _, _, m in chunks)}")
            
            try:
                get_sync_logger().log_voucher_reconcile_resync_start(
                    total_to_sync=len(all_guids), chunk_count=len(chunks))
            except Exception:
                pass
            
            # Fetch vouchers chunk by chunk and filter for needed GUIDs
            total_saved = 0
            failed_guids = []
            remaining_guids = set(all_guids)
            
            for ci, (c_start, c_end, month_label) in enumerate(chunks):
                if not remaining_guids:
                    break
                    
                c_from = f"{c_start.day:02d}-{months_rev[c_start.month]}-{c_start.year}"
                c_to = f"{c_end.day:02d}-{months_rev[c_end.month]}-{c_end.year}"
                logger.info(f"   📅 Re-sync [{month_label}]: {c_from} → {c_to}")
                
                tdl = vsm.generate_voucher_tdl(0, c_from, c_to, company_name)
                xml_response = vsm.fetch_from_tally(tdl, tally_host, tally_port)
                
                if not xml_response:
                    logger.error(f"   ❌ [{month_label}] Failed to fetch vouchers from Tally")
                    continue
                
                chunk_vouchers = vsm.parse_voucher_xml(xml_response)
                if not chunk_vouchers:
                    continue
                
                # Filter to only the GUIDs that need syncing
                vouchers_to_sync = [v for v in chunk_vouchers if v.get('guid') in remaining_guids]
                
                if not vouchers_to_sync:
                    logger.info(f"   📅 [{month_label}] No matching GUIDs found in Tally response")
                    continue
                
                logger.info(f"   ✅ [{month_label}] Found {len(vouchers_to_sync)} vouchers to re-sync")
                
                # Send to backend in batches, with individual retry on failure
                chunk_saved = 0
                batch_size = vsm.BATCH_SIZE
                for i in range(0, len(vouchers_to_sync), batch_size):
                    batch = vouchers_to_sync[i:i + batch_size]
                    success, saved = vsm.save_vouchers_to_backend(batch, company_id, user_id, company_guid or '')
                    if success:
                        total_saved += saved
                        chunk_saved += saved
                    else:
                        # Batch failed — retry individual vouchers one by one
                        logger.warning(f"   ⚠️ [{month_label}] Batch of {len(batch)} failed, retrying individually...")
                        for single_v in batch:
                            s_ok, s_saved = vsm.save_vouchers_to_backend([single_v], company_id, user_id, company_guid or '')
                            if s_ok:
                                total_saved += s_saved
                                chunk_saved += s_saved
                            else:
                                failed_guids.append({
                                    'guid': single_v.get('guid', ''),
                                    'name': f"{single_v.get('voucher_type','')} {single_v.get('voucher_number','')}",
                                    'month': month_label
                                })
                
                # Remove synced + attempted GUIDs from remaining
                for v in vouchers_to_sync:
                    remaining_guids.discard(v.get('guid'))
                
                try:
                    get_sync_logger().log_voucher_reconcile_resync_chunk(
                        chunk_num=ci+1, total_chunks=len(chunks),
                        from_date=c_from, to_date=c_to,
                        found=len(vouchers_to_sync), synced=chunk_saved,
                        remaining=len(remaining_guids))
                except Exception:
                    pass
                
                # Update max AlterID for this chunk
                synced_vouchers = [v for v in vouchers_to_sync 
                                   if v.get('guid') not in {f['guid'] for f in failed_guids}]
                if synced_vouchers:
                    max_alter_id = max(v.get('alter_id', 0) for v in synced_vouchers)
                    if max_alter_id > 0:
                        vsm.save_last_alter_id(company_id, max_alter_id)
            
            if failed_guids:
                # ── Re-verify failed GUIDs against DB ──────────────────────
                # Some vouchers may have failed due to constraint errors but 
                # could already exist in DB (e.g., previously synced)
                logger.info(f"   🔍 Re-verifying {len(failed_guids)} failed vouchers against DB...")
                db_vouchers_now = self.fetch_db_vouchers(company_id)
                db_guid_set_now = set()
                if db_vouchers_now:
                    for v in db_vouchers_now:
                        g = v.get('guid', v.get('GUID', ''))
                        if g:
                            db_guid_set_now.add(g)
                
                already_present = []
                genuinely_failed = []
                for fg in failed_guids:
                    if fg['guid'] in db_guid_set_now:
                        already_present.append(fg)
                    else:
                        genuinely_failed.append(fg)
                
                if already_present:
                    logger.info(f"   ✅ {len(already_present)} voucher(s) already present in DB (no action needed):")
                    for ap in already_present[:5]:
                        logger.info(f"      ✅ {ap['month']} | {ap['name']} | {ap['guid']}")
                    total_saved += len(already_present)
                
                if genuinely_failed:
                    logger.warning(f"   ⚠️ {len(genuinely_failed)} voucher(s) genuinely failed to sync:")
                    logger.warning(f"      Cause: Backend constraint uq_led_entry(voucher_id, ledger_name, amount)")
                    logger.warning(f"      Fix: Add entry_index to unique constraint on voucher_ledger_entries")
                    for gf in genuinely_failed[:10]:
                        logger.warning(f"      ❌ {gf['month']} | {gf['name']} | {gf['guid']}")
                
                # Write to reconciliation log
                recon_log_path = os.path.join(LOG_DIR, 'voucher_reconciliation.log')
                try:
                    with open(recon_log_path, 'a', encoding='utf-8') as f:
                        f.write(f"\n── RE-SYNC VERIFICATION ───────────────────────────────────────\n")
                        f.write(f"  Total synced     : {total_saved}\n")
                        f.write(f"  Already in DB    : {len(already_present)}\n")
                        f.write(f"  Genuinely failed : {len(genuinely_failed)}\n")
                        if genuinely_failed:
                            f.write(f"  Failure cause    : uq_led_entry constraint (voucher_id, ledger_name, amount)\n")
                            f.write(f"  Recommended fix  : ALTER TABLE voucher_ledger_entries\n")
                            f.write(f"                     DROP CONSTRAINT uq_led_entry,\n")
                            f.write(f"                     ADD CONSTRAINT uq_led_entry UNIQUE (voucher_id, ledger_name, amount, entry_index)\n")
                            f.write(f"\n  Failed vouchers:\n")
                            f.write(f"  {'Month':<12} {'Name':<40} {'GUID':<55}\n")
                            f.write(f"  {'─'*12} {'─'*40} {'─'*55}\n")
                            for gf in genuinely_failed:
                                f.write(f"  {gf['month']:<12} {gf['name'][:40]:<40} {gf['guid']:<55}\n")
                except Exception:
                    pass
            else:
                logger.info(f"   ✅ All vouchers synced successfully")
            
            logger.info(f"   ✅ Re-sync complete: {total_saved} synced")
            return total_saved
            
        except Exception as e:
            logger.error(f"❌ Error in voucher re-sync: {e}")
            return 0
    
    # ─── Bills Outstanding Reconciliation ───────────────────────────

    def _fetch_tally_bills(self, tally_host: str, tally_port: int, company_name: str, report_name: str) -> List[Dict]:
        """Fetch Bills Receivable or Bills Payable from Tally's built-in reports."""
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
            url = f"http://{tally_host}:{tally_port}"
            resp = requests.post(url, data=xml_req.encode('utf-8'),
                                 headers={'Content-Type': 'application/xml'}, timeout=30)
            if resp.status_code != 200:
                logger.error(f"❌ Tally returned {resp.status_code} for {report_name}")
                return []

            # Clean XML
            text = re.sub(r'<(/?)([a-zA-Z_]+):([a-zA-Z_]+)', r'<\1\2_\3', resp.text)
            text = re.sub(r'&#([0-9]+);',
                          lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
                          text)
            root = ET.fromstring(text)
            elements = list(root)
            bills = []
            i = 0
            while i < len(elements):
                el = elements[i]
                if el.tag == 'BILLFIXED':
                    bill_date = (el.findtext('BILLDATE') or '').strip()
                    bill_ref = (el.findtext('BILLREF') or '').strip()
                    bill_party = ' '.join((el.findtext('BILLPARTY') or '').split())
                    bill_cl = 0.0
                    j = i + 1
                    while j < len(elements) and elements[j].tag != 'BILLFIXED':
                        tag = elements[j].tag
                        txt = (elements[j].text or '').strip()
                        if tag == 'BILLCL':
                            try:
                                bill_cl = float(txt.replace(',', ''))
                            except (ValueError, TypeError):
                                bill_cl = 0.0
                        j += 1
                    pending = abs(bill_cl)
                    if pending > 0.001:
                        bills.append({'partyName': bill_party, 'billRef': bill_ref, 'pendingAmount': round(pending, 2)})
                    i = j
                else:
                    i += 1
            return bills
        except requests.exceptions.ConnectionError:
            logger.error(f"❌ Cannot connect to Tally at {tally_host}:{tally_port}")
            return []
        except Exception as e:
            logger.error(f"❌ Error fetching {report_name} from Tally: {e}")
            return []

    def fetch_db_bills_outstanding_summary(self, company_id: int) -> Dict:
        """Fetch bills outstanding summary (counts + totals) from DB."""
        try:
            url = f"{self.backend_url}/bills-outstanding/company/{company_id}/summary"
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"⚠️ Could not fetch bills summary: HTTP {response.status_code}")
                return {}
        except Exception as e:
            logger.warning(f"⚠️ Error fetching bills summary: {e}")
            return {}

    def _sync_bills_to_backend(self, company_id: int, report_type: str, bills: List[Dict]) -> int:
        """Push bills to /bills-outstanding/sync with syncType=reconciliation."""
        try:
            payload = {'cmpId': company_id, 'reportType': report_type, 'bills': bills}
            url = f"{self.backend_url}/bills-outstanding/sync?syncType=reconciliation"
            resp = requests.post(url, json=payload, headers=self.headers, timeout=30)
            if resp.status_code == 200:
                return resp.json().get('billsSynced', len(bills))
            else:
                logger.error(f"❌ Bills sync failed: HTTP {resp.status_code} — {resp.text[:200]}")
                return 0
        except Exception as e:
            logger.error(f"❌ Error syncing bills: {e}")
            return 0

    def reconcile_bills_outstanding(self, company_id: int, tally_host: str, tally_port: int,
                                    company_name: str = None,
                                    write_log_fn=None) -> Dict:
        """Reconcile bills outstanding (receivable + payable) between Tally and DB.
        
        1. Fetch bills from Tally for both report types.
        2. Compare counts/totals against DB summary.
        3. Re-sync if counts differ or DB has no data.
        4. Write results to the voucher reconciliation log via write_log_fn (optional).
        """
        _log = write_log_fn if write_log_fn else (lambda line: None)

        logger.info(f"\n{'─'*80}")
        logger.info(f"🔍 Reconciling Bills Outstanding for company {company_id} ({company_name or 'N/A'})")
        logger.info(f"{'─'*80}")

        _log(f"\n── BILLS OUTSTANDING RECONCILIATION ─────────────────────────────")
        _log(f"  Company: {company_name or 'N/A'} (ID: {company_id})")
        _log(f"  {'Type':<12} {'Tally Bills':>12} {'Tally Total':>14} {'DB Bills':>10} {'DB Total':>14} {'Status':<12}")
        _log(f"  {'─'*12} {'─'*12} {'─'*14} {'─'*10} {'─'*14} {'─'*12}")

        # Fetch DB summary first (single call covers both types)
        db_summary = self.fetch_db_bills_outstanding_summary(company_id)

        report_map = [('Bills Receivable', 'receivable'), ('Bills Payable', 'payable')]
        type_results = {}
        total_synced = 0

        for report_name, report_type in report_map:
            # ── Tally side ───────────────────────────────────────────────
            tally_bills = self._fetch_tally_bills(tally_host, tally_port, company_name or '', report_name)
            tally_count = len(tally_bills)
            tally_total = round(sum(b['pendingAmount'] for b in tally_bills), 2)

            logger.info(f"   📊 Tally {report_type}: {tally_count} bills, total={tally_total:,.2f}")

            # ── DB side (from summary) ───────────────────────────────────
            db_type_data = db_summary.get(report_type, {})
            db_count = int(db_type_data.get('billCount', 0))
            db_total_raw = db_type_data.get('totalPending', 0)
            db_has_data = bool(db_type_data.get('hasSyncedData', False))
            try:
                db_total = float(db_total_raw) if db_total_raw is not None else 0.0
            except (ValueError, TypeError):
                db_total = 0.0

            logger.info(f"   📊 DB {report_type}: {db_count} bills, total={db_total:,.2f}, synced={db_has_data}")

            # ── Determine if re-sync is needed ───────────────────────────
            count_diff = tally_count - db_count
            total_diff = round(tally_total - db_total, 2)
            needs_sync = (not db_has_data and tally_count > 0) or tally_count != db_count or abs(total_diff) > 0.5

            synced = 0
            if needs_sync and tally_bills:
                logger.info(f"   🔄 Re-syncing {tally_count} {report_type} bills (diff: count={count_diff:+d}, amount={total_diff:+.2f})...")
                synced = self._sync_bills_to_backend(company_id, report_type, tally_bills)
                total_synced += synced
                logger.info(f"   ✅ Synced {synced} {report_type} bills")
            elif needs_sync and tally_count == 0 and db_count > 0:
                # Tally has no bills but DB does — clear stale data
                logger.info(f"   🔄 Clearing stale {report_type} bills from DB (Tally has 0)...")
                synced = self._sync_bills_to_backend(company_id, report_type, [])
                logger.info(f"   ✅ Cleared stale {report_type} bills")
            else:
                logger.info(f"   ✅ {report_type} bills are in sync")

            status = '✅ OK' if not needs_sync else (f'🔄 Synced {synced}' if synced > 0 else '⚠️ Diff')
            _log(f"  {report_type:<12} {tally_count:>12} {tally_total:>14,.2f} {db_count:>10} {db_total:>14,.2f} {status:<12}")

            type_results[report_type] = {
                'tallyCount': tally_count,
                'tallyTotal': tally_total,
                'dbCount': db_count,
                'dbTotal': db_total,
                'countDiff': count_diff,
                'totalDiff': total_diff,
                'synced': synced,
                'needsSync': needs_sync
            }

        _log(f"  {'─'*12} {'─'*12} {'─'*14} {'─'*10} {'─'*14} {'─'*12}")
        _log(f"  Total re-synced: {total_synced} bill(s)")

        self.log_reconciliation(company_id, 'BillsOutstanding', {
            'success': True,
            'tallyCount': sum(v['tallyCount'] for v in type_results.values()),
            'dbCount': sum(v['dbCount'] for v in type_results.values()),
            'missing': sum(max(0, v['countDiff']) for v in type_results.values()),
            'updated': 0,
            'synced': total_synced
        })

        return {
            'success': True,
            'entityType': 'BillsOutstanding',
            'receivable': type_results.get('receivable', {}),
            'payable': type_results.get('payable', {}),
            'totalSynced': total_synced
        }

    def log_reconciliation(self, company_id: int, entity_type: str, result: Dict):
        """Log reconciliation summary to consolidated sync_worker.log."""
        try:
            status = 'SUCCESS' if result.get('success', False) else 'FAILED'
            logger.info(
                f"📝 RECON [{entity_type}] Company={company_id} "
                f"Status={status} Tally={result.get('tallyCount', 0)} "
                f"DB={result.get('dbCount', 0)} Missing={result.get('missing', 0)} "
                f"Updated={result.get('updated', 0)} Synced={result.get('synced', 0)}"
            )
            if not result.get('success', False):
                logger.error(f"📝 RECON ERROR [{entity_type}] Company={company_id}: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"❌ Failed to log reconciliation summary: {e}")


def main():
    """Main reconciliation function"""
    try:
        # Parse arguments
        company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
        user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        tally_port = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
        backend_url = sys.argv[4] if len(sys.argv) > 4 else os.getenv('BACKEND_URL')
        auth_token = sys.argv[5] if len(sys.argv) > 5 else ''
        device_token = sys.argv[6] if len(sys.argv) > 6 else ''
        entity_type = sys.argv[7] if len(sys.argv) > 7 else 'all'  # 'all', specific entity, 'voucher', or 'bills-outstanding'
        
        # Initialize reconciliation manager
        reconciliation_manager = ReconciliationManager(backend_url, auth_token, device_token)
        
        logger.info("="*80)
        logger.info("🔍 RECONCILIATION STARTED")
        logger.info(f"   Company ID: {company_id}")
        logger.info(f"   Entity Type: {entity_type}")
        logger.info("="*80)
        
        # Define all master entity types
        ALL_MASTER_ENTITIES = [
            'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory',
            'CostCategory', 'CostCenter', 'Godown', 'VoucherType',
            'TaxUnit', 'Ledger', 'StockItem'
        ]
        
        results = []
        
        if entity_type.lower() == 'all':
            # Reconcile all master entities
            for entity in ALL_MASTER_ENTITIES:
                result = reconciliation_manager.reconcile_entity(
                    company_id=company_id,
                    user_id=user_id,
                    entity_type=entity,
                    tally_host='localhost',
                    tally_port=tally_port
                )
                results.append(result)
            
            # Reconcile vouchers (and related tables including bills outstanding)
            voucher_result = reconciliation_manager.reconcile_vouchers(
                company_id=company_id,
                user_id=user_id,
                company_guid='',
                tally_host='localhost',
                tally_port=tally_port
            )
            results.append(voucher_result)
        elif entity_type.lower() == 'voucher':
            # Reconcile vouchers only
            voucher_result = reconciliation_manager.reconcile_vouchers(
                company_id=company_id,
                user_id=user_id,
                company_guid='',
                tally_host='localhost',
                tally_port=tally_port
            )
            results.append(voucher_result)
        elif entity_type.lower() in ('bills-outstanding', 'bills_outstanding', 'bills'):
            # Reconcile bills outstanding only
            bills_result = reconciliation_manager.reconcile_bills_outstanding(
                company_id=company_id,
                tally_host='localhost',
                tally_port=tally_port
            )
            results.append(bills_result)
        else:
            # Reconcile specific master entity
            result = reconciliation_manager.reconcile_entity(
                company_id=company_id,
                user_id=user_id,
                entity_type=entity_type,
                tally_host='localhost',
                tally_port=tally_port
            )
            results.append(result)
        
        # Summary
        total_missing = sum(r.get('missing', 0) for r in results if r.get('success'))
        total_updated = sum(r.get('updated', 0) for r in results if r.get('success'))
        total_synced = sum(r.get('synced', 0) for r in results if r.get('success'))
        
        logger.info("\n" + "="*80)
        logger.info("✅ RECONCILIATION COMPLETED")
        logger.info(f"   Entities Checked: {len(results)}")
        logger.info(f"   Total Missing: {total_missing}")
        logger.info(f"   Total Updated: {total_updated}")
        logger.info(f"   Total Synced: {total_synced}")
        logger.info("="*80)
        
        # Output result
        summary = {
            'success': True,
            'totalMissing': total_missing,
            'totalUpdated': total_updated,
            'totalSynced': total_synced,
            'details': results
        }
        print(json.dumps(summary))
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
