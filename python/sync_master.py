#!/usr/bin/env python3
"""
Sync Master Data - Fetch from Tally and send to Backend
Logs all operations to file
"""

import requests
import logging
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET
import re
import os

# Setup logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, f'sync_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
reconcile_log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reconcilation.txt')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SyncManager:
    """Manage sync from Tally to Backend"""
    
    MASTERS = {
        'Group': 'GUID, MASTERID, ALTERID, Name, Parent, IsRevenue',
        'Currency': 'GUID, MASTERID, ALTERID, Name',
        'Unit': 'GUID, MASTERID, ALTERID, Name',
        'StockGroup': 'GUID, MASTERID, ALTERID, Name',
        'StockCategory': 'GUID, MASTERID, ALTERID, Name',
        'CostCategory': 'GUID, MASTERID, ALTERID, Name',
        'CostCenter': 'GUID, MASTERID, ALTERID, Name',
        'Godown': 'GUID, MASTERID, ALTERID, Name',
        'VoucherType': 'GUID, MASTERID, ALTERID, Name',
        'TaxUnit': 'GUID, MASTERID, ALTERID, Name',
        'Ledger': 'GUID, MASTERID, ALTERID, Name, Parent, IsRevenue, OpeningBalance',
        'StockItem': 'GUID, MASTERID, ALTERID, Name, UQC, OpeningBalance, OpeningValue'
    }
    
    def __init__(self, company_name: str, tally_port: int = 9000, backend_url: str = None,
                 auth_token: str = None, device_token: str = None):
        self.company_name = company_name
        self.tally_port = tally_port
        self.tally_url = f"http://localhost:{tally_port}"
        self.backend_url = backend_url or "http://localhost:8080"
        self.auth_token = auth_token
        self.device_token = device_token
        
        logger.info(f"Initializing SyncManager for company: {company_name}")
        logger.info(f"Tally URL: {self.tally_url}")
        logger.info(f"Backend URL: {self.backend_url}")
    
    def generate_tdl(self, master_type: str) -> str:
        """Generate TDL for Tally"""
        fetch_fields = self.MASTERS.get(master_type, 'GUID, MASTERID, ALTERID, Name')
        
        return f"""<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of {master_type}</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE>
                <SVTODATE TYPE="Date">01-Jan-1970</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of {master_type}" ISMODIFY="No">
                        <TYPE>{master_type}</TYPE>
                        <FETCH>{fetch_fields}</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    def fetch_from_tally(self, master_type: str) -> Optional[List[Dict]]:
        """Fetch master data from Tally"""
        try:
            logger.info(f"Fetching {master_type} from Tally...")
            
            tdl = self.generate_tdl(master_type)
            response = requests.post(
                self.tally_url,
                data=tdl,
                headers={'Content-Type': 'application/xml'},
                timeout=30
            )
            
            if response.status_code == 200:
                records = self.parse_xml(response.text, master_type)
                logger.info(f"✓ Fetched {len(records)} {master_type} records from Tally")
                return records
            else:
                logger.error(f"✗ Tally error: HTTP {response.status_code}")
                return None
                
        except requests.exceptions.ConnectionError:
            logger.error(f"✗ Could not connect to Tally at {self.tally_url}")
            return None
        except Exception as e:
            logger.error(f"✗ Error fetching {master_type}: {e}")
            return None
    
    def parse_xml(self, xml_string: str, master_type: str) -> List[Dict]:
        """Parse XML response"""
        try:
            xml_string = re.sub(r'&#([0-9]+);', 
                lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), 
                xml_string)
            
            root = ET.fromstring(xml_string)
            records = []
            
            for elem in root.iter(master_type.upper()):
                record = self._parse_element(elem)
                if record:
                    records.append(record)
            
            return records
        except Exception as e:
            logger.error(f"✗ Error parsing XML for {master_type}: {e}")
            return []
    
    def _parse_element(self, elem) -> Optional[Dict]:
        """Parse individual element"""
        try:
            def get_text(tag_name):
                child = elem.find(tag_name)
                return child.text if child is not None else None
            
            alter_id = int(get_text('ALTERID') or 0)
            
            if alter_id == 0:
                return None
            
            return {
                'guid': get_text('GUID'),
                'masterID': get_text('MASTERID'),
                'alterID': alter_id,
                'name': get_text('NAME'),
                'parent': get_text('PARENT'),
                'isRevenue': get_text('ISREVENUE') == 'Yes',
                'uqc': get_text('UQC'),
                'openingBalance': get_text('OPENINGBALANCE'),
                'openingValue': get_text('OPENINGVALUE')
            }
        except Exception as e:
            logger.warning(f"⚠ Error parsing element: {e}")
            return None
    
    def send_to_backend(self, cmp_id: int, user_id: int, master_type: str, 
                       records: List[Dict], sync_type: str = "INITIAL") -> bool:
        """Send synced data to backend with upsert logic
        
        Backend will:
        - Check if (masterID, guid) exists
        - If exists and alterID changed: UPDATE the record
        - If not exists: INSERT new record
        """
        try:
            logger.info(f"Sending {len(records)} {master_type} records to backend...")
            logger.info(f"Backend will check masterID+guid and upsert based on alterID changes")
            
            payload = {
                "cmpId": cmp_id,
                "userId": user_id,
                "syncType": sync_type,
                "upsertMode": True,  # Enable upsert logic on backend
                master_type.lower(): records
            }
            
            # Map master type to endpoint
            endpoint_map = {
                'Group': '/sync/groups',
                'Currency': '/sync/currencies',
                'Unit': '/sync/units',
                'StockGroup': '/sync/stock-groups',
                'StockCategory': '/sync/stock-categories',
                'CostCategory': '/sync/cost-categories',
                'CostCenter': '/sync/cost-centers',
                'Godown': '/sync/godowns',
                'VoucherType': '/sync/voucher-types',
                'TaxUnit': '/sync/tax-units',
                'Ledger': '/sync/ledgers',
                'StockItem': '/sync/stock-items'
            }
            
            endpoint = endpoint_map.get(master_type, f'/sync/{master_type.lower()}')
            url = f"{self.backend_url}{endpoint}"
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.auth_token}' if self.auth_token else '',
                'X-Device-Token': self.device_token or ''
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✓ Successfully sent {master_type} to backend")
                logger.info(f"  Response: {result}")
                return True
            else:
                logger.error(f"✗ Backend error: HTTP {response.status_code}")
                logger.error(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"✗ Error sending to backend: {e}")
            return False
    
    def fetch_db_data(self, company_id: int, entity_type: str) -> List[Dict]:
        """Fetch data from backend GET endpoint for specific company"""
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
                logger.warning(f"⚠️ Unknown entity type: {entity_type}")
                return []
            
            url = f"{self.backend_url}/{endpoint_path}/company/{company_id}"
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.auth_token}' if self.auth_token else '',
                'X-Device-Token': self.device_token or ''
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                # Handle both array and object responses
                if isinstance(data, list):
                    records = data
                elif isinstance(data, dict) and 'data' in data:
                    records = data['data']
                else:
                    records = []
                
                logger.info(f"✅ Fetched {len(records)} {entity_type} records from DB")
                return records
            else:
                logger.warning(f"⚠️ Failed to fetch DB data: HTTP {response.status_code}")
                return []
                
        except Exception as e:
            logger.warning(f"⚠️ Error fetching DB data: {e}")
            return []
    
    def reconcile_entity(self, cmp_id: int, entity_type: str, records: List[Dict]) -> Dict:
        """Reconcile synced records with backend using real data comparison"""
        try:
            if not records:
                return {'success': True, 'matched': 0, 'missing': 0, 'extra': 0, 'new': 0, 'updated': 0, 'unchanged': 0}
            
            logger.info(f"🔍 Reconciling {entity_type}: {len(records)} Tally records with DB")
            
            # Fetch actual data from database
            db_records = self.fetch_db_data(cmp_id, entity_type)
            
            # Create lookup dictionaries for comparison
            db_lookup = {}
            for rec in db_records:
                master_id = rec.get('masterId') or rec.get('masterID')
                guid = rec.get('guid')
                if master_id and guid:
                    key = f"{master_id}_{guid}"
                    db_lookup[key] = rec
            
            tally_lookup = {}
            for rec in records:
                master_id = rec.get('masterID') or rec.get('masterId')
                guid = rec.get('guid')
                if master_id and guid:
                    key = f"{master_id}_{guid}"
                    tally_lookup[key] = rec
            
            # Compare the two datasets
            matched = 0
            missing = 0  # In Tally but not in DB
            extra = 0    # In DB but not in Tally
            updated = 0
            unchanged = 0
            
            # Check Tally records against DB
            for key, tally_rec in tally_lookup.items():
                if key in db_lookup:
                    matched += 1
                    # Check if alterID changed (updated)
                    tally_alter = str(tally_rec.get('alterID') or tally_rec.get('alterId') or '')
                    db_alter = str(db_lookup[key].get('alterId') or db_lookup[key].get('alterID') or '')
                    if tally_alter != db_alter:
                        updated += 1
                    else:
                        unchanged += 1
                else:
                    missing += 1
            
            # Check for extra records in DB
            for key in db_lookup:
                if key not in tally_lookup:
                    extra += 1
            
            result = {
                'success': True,
                'allFound': missing == 0,
                'matched': matched,
                'missing': missing,
                'extra': extra,
                'dbCount': len(db_records),
                'tallyCount': len(records),
                'new': missing,  # Records in Tally but not in DB are new
                'updated': updated,
                'unchanged': unchanged
            }
            
            # Log to reconcilation.txt
            self.log_reconciliation(
                cmp_id=cmp_id,
                entity_type=entity_type,
                sync_type='FULL_SYNC',
                tally_count=len(records),
                result=result
            )
            
            if result.get('allFound', False):
                logger.info(f"✅ Reconciliation: All {entity_type} records verified")
            else:
                logger.warning(f"⚠️ Reconciliation: {missing} {entity_type} records missing from DB")
            
            return result
                
        except Exception as e:
            logger.error(f"❌ Reconciliation error: {e}")
            result = {
                'success': False, 
                'matched': 0, 
                'missing': len(records), 
                'extra': 0,
                'error': str(e),
                'exception': True
            }
            self.log_reconciliation(
                cmp_id=cmp_id,
                entity_type=entity_type,
                sync_type='FULL_SYNC',
                tally_count=len(records),
                result=result
            )
            return result
    
    def log_reconciliation(self, cmp_id: int, entity_type: str, sync_type: str, 
                          tally_count: int, result: Dict):
        """Log reconciliation results to reconcilation.txt with detailed counts"""
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Ensure log file exists
            if not os.path.exists(reconcile_log_file):
                logger.info(f"Creating reconciliation log file: {reconcile_log_file}")
                with open(reconcile_log_file, 'w', encoding='utf-8') as f:
                    f.write(f"Reconciliation Log Created: {timestamp}\n")
                    f.write(f"{'='*80}\n\n")
            
            logger.info(f"📝 Writing reconciliation log to: {reconcile_log_file}")
            
            with open(reconcile_log_file, 'a', encoding='utf-8') as f:
                f.write(f"\n{'='*80}\n")
                f.write(f"RECONCILIATION LOG\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Company ID: {cmp_id}\n")
                f.write(f"Company Name: {self.company_name}\n")
                f.write(f"Entity Type: {entity_type}\n")
                f.write(f"Sync Type: {sync_type}\n")
                f.write(f"Tally Count: {tally_count}\n")
                f.write(f"-" * 80 + "\n")
                
                if result.get('success', False):
                    f.write(f"Status: SUCCESS\n")
                    
                    # Counts from backend response
                    db_count = result.get('dbCount', result.get('matched', 0))
                    new_records = result.get('new', result.get('inserted', 0))
                    updated_records = result.get('updated', 0)
                    unchanged_records = result.get('unchanged', result.get('matched', 0) - result.get('updated', 0))
                    
                    f.write(f"DB Count: {db_count}\n")
                    f.write(f"New (Inserted): {new_records}\n")
                    f.write(f"Updated: {updated_records}\n")
                    f.write(f"No Change: {unchanged_records}\n")
                    f.write(f"Matched: {result.get('matched', 0)}\n")
                    f.write(f"Missing: {result.get('missing', 0)}\n")
                    f.write(f"Extra: {result.get('extra', 0)}\n")
                    
                    if result.get('missing', 0) > 0:
                        f.write(f"Missing GUIDs: {result.get('missingGuids', [])}\n")
                    
                    if result.get('missing', 0) == 0 and result.get('extra', 0) == 0:
                        f.write(f"✅ All records verified successfully\n")
                    else:
                        f.write(f"⚠️ Discrepancies found\n")
                else:
                    f.write(f"Status: FAILED\n")
                    
                    # For failed reconciliation, show what we know
                    if result.get('endpoint_not_ready'):
                        f.write(f"Reason: Backend reconciliation endpoint not ready\n")
                        f.write(f"Note: Sync completed successfully, reconciliation skipped\n")
                    elif result.get('exception'):
                        f.write(f"Reason: Exception occurred during reconciliation\n")
                    
                    f.write(f"Error: {result.get('error', 'Unknown error')}\n")
                    f.write(f"Tally Records: {tally_count} (synced to backend)\n")
                    f.write(f"DB Verification: Skipped due to error\n")
                
                f.write(f"{'='*80}\n")
                f.flush()  # Force write to disk
                os.fsync(f.fileno())  # Ensure OS writes to disk
                
            logger.info(f"✅ Reconciliation log written successfully for {entity_type}")
                
        except Exception as e:
            logger.error(f"❌ Failed to write reconciliation log: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    def sync_master_type(self, cmp_id: int, user_id: int, master_type: str, 
                        sync_type: str = "INITIAL") -> bool:
        """Sync a single master type"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Starting {master_type} sync (Type: {sync_type})")
        logger.info(f"{'='*60}")
        
        records = self.fetch_from_tally(master_type)
        
        if records is None:
            logger.error(f"✗ Failed to fetch {master_type}")
            return False
        
        if not records:
            logger.info(f"ℹ No records to sync for {master_type}")
            return True
        
        success = self.send_to_backend(cmp_id, user_id, master_type, records, sync_type)
        
        if success:
            # Run reconciliation after successful sync
            reconcile_result = self.reconcile_entity(cmp_id, master_type, records)
            logger.info(f"✓ {master_type} sync completed successfully")
        else:
            logger.error(f"✗ {master_type} sync failed")
        
        logger.info(f"{'='*60}\n")
        return success
    
    def sync_all(self, cmp_id: int, user_id: int, sync_type: str = "INITIAL") -> Dict:
        """Sync all master types"""
        logger.info(f"\n{'#'*60}")
        logger.info(f"# STARTING FULL SYNC")
        logger.info(f"# Company: {self.company_name} (ID: {cmp_id})")
        logger.info(f"# Sync Type: {sync_type}")
        logger.info(f"# Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"{'#'*60}\n")
        
        results = {}
        total_records = 0
        
        for master_type in self.MASTERS.keys():
            success = self.sync_master_type(cmp_id, user_id, master_type, sync_type)
            results[master_type] = 'SUCCESS' if success else 'FAILED'
        
        logger.info(f"\n{'#'*60}")
        logger.info(f"# SYNC COMPLETED")
        logger.info(f"# Results: {results}")
        logger.info(f"{'#'*60}\n")
        
        return {
            'success': all(v == 'SUCCESS' for v in results.values()),
            'results': results,
            'log_file': log_file
        }


def main():
    try:
        if len(sys.argv) < 5:
            logger.error("Usage: sync_master.py <company_name> <cmp_id> <user_id> <tally_port> [backend_url] [auth_token] [device_token]")
            sys.exit(1)
        
        company_name = sys.argv[1]
        cmp_id = int(sys.argv[2])
        user_id = int(sys.argv[3])
        tally_port = int(sys.argv[4])
        backend_url = sys.argv[5] if len(sys.argv) > 5 else "http://localhost:8080"
        auth_token = sys.argv[6] if len(sys.argv) > 6 else None
        device_token = sys.argv[7] if len(sys.argv) > 7 else None
        
        manager = SyncManager(company_name, tally_port, backend_url, auth_token, device_token)
        result = manager.sync_all(cmp_id, user_id, "INITIAL")
        
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(json.dumps({'success': False, 'error': str(e), 'log_file': log_file}))
        sys.exit(1)


if __name__ == '__main__':
    main()
