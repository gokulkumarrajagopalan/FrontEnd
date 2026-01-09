import requests
import sys
import os
import json
import xml.etree.ElementTree as ET
import re
import logging
from datetime import datetime
from typing import Dict, List, Optional

# Logging configuration
LOG_LEVEL = os.getenv('SYNC_LOG_LEVEL', 'INFO')
VERBOSE_MODE = os.getenv('SYNC_VERBOSE', 'false').lower() == 'true'

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(levelname)s - %(message)s' if VERBOSE_MODE else '%(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Reconciliation log file
RECONCILE_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reconcilation.txt')


class ReconciliationManager:
    """Manages reconciliation between Tally and Database"""
    
    BATCH_SIZE = 500
    
    def __init__(self, backend_url: str, auth_token: str, device_token: str):
        self.backend_url = backend_url.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
    
    def generate_reconciliation_tdl(self, entity_type: str = 'Ledger', company_name: str = None) -> str:
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
            'Ledger': "GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, IsRevenue, LastParent, Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, LEDGERPHONE, LEDGERCOUNTRYISDCODE, LEDGERMOBILE, LEDGERCONTACT, WEBSITE, EMAIL, CURRENCYNAME, INCOMETAXNUMBER, LEDMAILINGDETAILS.*, VATAPPLICABLEDATE, VATDEALERTYPE, VATTINNUMBER, LEDGSTREGDETAILS.*",
            'StockItem': "GUID, MASTERID, ALTERID, Name, Alias, Parent, Category, Description, BaseUnits, OpeningBalance, OpeningValue, OpeningRate, ReorderLevel, MinimumLevel, HSNCode, GST",
        }
        
        fetch_fields = entity_fields.get(entity_type, "GUID, MASTERID, ALTERID, Name")
        
        # Add company name to STATICVARIABLES if provided
        company_var = f"\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""
        
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
                <SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE>
                <SVTODATE TYPE="Date">01-Jan-1970</SVTODATE>
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
    
    def fetch_from_tally(self, tdl: str, tally_port: int) -> Optional[str]:
        """Fetch data from Tally Prime"""
        try:
            url = f"http://localhost:{tally_port}"
            response = requests.post(
                url,
                data=tdl,
                headers={'Content-Type': 'application/xml'},
                timeout=60
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
                        tally_port: int, company_name: str = None) -> Dict:
        """Reconcile specific entity type between Tally and Database"""
        
        logger.info(f"\n🔍 Reconciling {entity_type} for company {company_id}")
        
        # Step 1: Fetch ALL records from Tally (NO FILTER)
        tdl = self.generate_reconciliation_tdl(entity_type, company_name)
        xml_response = self.fetch_from_tally(tdl, tally_port)
        
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
        
        # Parse Tally records
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
            sync_result = self.trigger_sync(company_id, user_id, entity_type, tally_port, company_name, all_to_sync)
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
        
        # Log to reconcilation.txt
        self.log_reconciliation(company_id, entity_type, result)
        
        return result
    
    def trigger_sync(self, company_id: int, user_id: int, entity_type: str, 
                    tally_port: int, company_name: str = None, missing_records: List[Dict] = None) -> Dict:
        """Trigger sync to insert/update records - fetches ALL from Tally and filters for missing ones"""
        try:
            logger.info(f"   🔄 Triggering sync for {entity_type}...")
            
            # Import incremental sync modules
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
            xml_response = sync_manager.fetch_from_tally(tdl, tally_port)
            
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
    
    def log_reconciliation(self, company_id: int, entity_type: str, result: Dict):
        """Log reconciliation results to reconcilation.txt"""
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Ensure log file exists
            if not os.path.exists(RECONCILE_LOG_FILE):
                with open(RECONCILE_LOG_FILE, 'w', encoding='utf-8') as f:
                    f.write(f"Reconciliation Log Created: {timestamp}\n")
                    f.write(f"{'='*80}\n\n")
            
            with open(RECONCILE_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(f"\n{'='*80}\n")
                f.write(f"RECONCILIATION LOG\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Company ID: {company_id}\n")
                f.write(f"Entity Type: {entity_type}\n")
                f.write(f"-" * 80 + "\n")
                
                if result.get('success', False):
                    f.write(f"Status: ✅ SUCCESS\n\n")
                    
                    tally_count = result.get('tallyCount', 0)
                    db_count = result.get('dbCount', 0)
                    missing = result.get('missing', 0)
                    updated = result.get('updated', 0)
                    synced = result.get('synced', 0)
                    
                    f.write(f"📊 COUNTS:\n")
                    f.write(f"   Tally Records:  {tally_count}\n")
                    f.write(f"   DB Records:     {db_count}\n")
                    f.write(f"   Missing in DB:  {missing}\n")
                    f.write(f"   Needs Update:   {updated}\n")
                    f.write(f"   Synced:         {synced}\n\n")
                    
                    # Log missing details
                    if result.get('missingDetails'):
                        f.write(f"📝 MISSING IN DB (First 10):\n")
                        for rec in result['missingDetails']:
                            f.write(f"   - {rec['name']} (ID: {rec['masterID']}, AlterID: {rec['alterID']})\n")
                        f.write("\n")
                    
                    # Log update details
                    if result.get('updateDetails'):
                        f.write(f"🔄 NEEDS UPDATE (First 10):\n")
                        for rec in result['updateDetails']:
                            f.write(f"   - {rec['name']} (Tally: {rec['tallyAlterID']} > DB: {rec['dbAlterID']})\n")
                        f.write("\n")
                    
                    if missing == 0 and updated == 0:
                        f.write(f"✅ All records in sync!\n")
                    else:
                        f.write(f"⚠️ Reconciliation completed with differences\n")
                    
                else:
                    f.write(f"Status: ❌ FAILED\n\n")
                    f.write(f"Error: {result.get('error', 'Unknown error')}\n")
                    f.write(f"Tally Count: {result.get('tallyCount', 0)}\n")
                    f.write(f"DB Count: {result.get('dbCount', 0)}\n")
                
                f.write(f"{'='*80}\n")
                f.flush()
                os.fsync(f.fileno())
                
        except Exception as e:
            logger.error(f"❌ Failed to write reconciliation log: {e}")


def main():
    """Main reconciliation function"""
    try:
        # Parse arguments
        company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
        user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        tally_port = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
        backend_url = sys.argv[4] if len(sys.argv) > 4 else 'http://localhost:8080'
        auth_token = sys.argv[5] if len(sys.argv) > 5 else ''
        device_token = sys.argv[6] if len(sys.argv) > 6 else ''
        entity_type = sys.argv[7] if len(sys.argv) > 7 else 'all'  # 'all' or specific entity
        
        # Initialize reconciliation manager
        reconciliation_manager = ReconciliationManager(backend_url, auth_token, device_token)
        
        logger.info("="*80)
        logger.info("🔍 RECONCILIATION STARTED")
        logger.info(f"   Company ID: {company_id}")
        logger.info(f"   Entity Type: {entity_type}")
        logger.info("="*80)
        
        # Define all entity types
        ALL_ENTITIES = [
            'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory',
            'CostCategory', 'CostCenter', 'Godown', 'VoucherType',
            'TaxUnit', 'Ledger', 'StockItem'
        ]
        
        results = []
        
        if entity_type.lower() == 'all':
            # Reconcile all entities
            for entity in ALL_ENTITIES:
                result = reconciliation_manager.reconcile_entity(
                    company_id=company_id,
                    user_id=user_id,
                    entity_type=entity,
                    tally_port=tally_port
                )
                results.append(result)
        else:
            # Reconcile specific entity
            result = reconciliation_manager.reconcile_entity(
                company_id=company_id,
                user_id=user_id,
                entity_type=entity_type,
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
