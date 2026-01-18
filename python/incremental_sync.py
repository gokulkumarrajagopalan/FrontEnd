"""
Incremental Sync Script with AlterID Filtering, Reconciliation & First-Time Sync
Syncs only new/modified records based on AlterID to handle large volumes efficiently
"""

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


class IncrementalSyncManager:
    """Manages incremental sync based on AlterID with reconciliation"""
    
    BATCH_SIZE = 500
    BATCH_DELAY = 0.1  # 100ms delay between batches
    
    def __init__(self, backend_url: str, auth_token: str, device_token: str):
        self.backend_url = backend_url.rstrip('/')
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
    
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
        """Update company sync status in database after sync completion
        
        Args:
            company_id: Company ID to update
            sync_status: Status to set ('synced', 'pending', 'in-progress', 'failed')
            success: Whether sync was successful
        """
        try:
            url = f"{self.backend_url}/companies/{company_id}/sync-status"
            
            payload = {
                'syncStatus': sync_status if success else 'failed',
                'lastSyncDate': datetime.now().isoformat() if success else None,
                'updatedAt': datetime.now().isoformat()
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
    
    def generate_incremental_tdl(self, last_alter_id: int, entity_type: str = 'Ledger', company_name: str = None) -> str:
        """Generate TDL for incremental fetch based on AlterID"""
        
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
                        <FILTERS>AlterIdFilter</FILTERS>
                    </COLLECTION>
                    <SYSTEM TYPE="FORMULAE" NAME="AlterIdFilter"> $Alterid > {last_alter_id} </SYSTEM>
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
                record.update({
                    'alias': get_text('ONLYALIAS') or get_text('ALIAS'),
                    'parent': get_text('PARENT'),
                    'isRevenue': get_text('ISREVENUE') == 'Yes',
                    'description': get_text('DESCRIPTION'),
                    'narration': get_text('NARRATION'),
                    'isBillWiseOn': get_text('ISBILLWISEON') == 'Yes',
                    'isCostCentresOn': get_text('ISCOSTCENTRESON') == 'Yes',
                    'openingBalance': float(get_text('OPENINGBALANCE') or 0),
                    'phone': get_text('LEDGERPHONE'),
                    'mobile': get_text('LEDGERMOBILE'),
                    'email': get_text('EMAIL'),
                    'website': get_text('WEBSITE'),
                    'currencyName': get_text('CURRENCYNAME'),
                    'incometaxNumber': get_text('INCOMETAXNUMBER'),
                    'vatTINNumber': get_text('VATTINNUMBER'),
                    'vatDealerType': get_text('VATDEALERTYPE'),
                })
            elif entity_type == 'VoucherType':
                # Extract numbering method from nested VOUCHERNUMBERSERIES.LIST
                numbering_method = None
                vch_series = elem.find('.//VOUCHERNUMBERSERIES.LIST/NUMBERINGMETHOD')
                if vch_series is not None:
                    numbering_method = vch_series.text
                
                record.update({
                    'alias': get_text('MAILINGNAME'),
                    'parent': get_text('PARENT'),
                    'isActive': get_text('ISACTIVE') == 'Yes',
                    'numberingMethod': numbering_method,
                    'reservedName': elem.get('RESERVEDNAME', ''),
                })
            elif entity_type == 'Unit':
                record.update({
                    'originalName': get_text('ORIGINALNAME'),
                    'simpleUnit': get_text('ISSIMPLEUNIT') == 'Yes',
                    'reservedName': elem.get('RESERVEDNAME', ''),
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
                    'baseUnits': get_text('BASEUNITS'),
                    'additionalUnits': get_text('ADDITIONALUNITS'),
                    'costingMethod': get_text('COSTINGMETHOD'),
                    'valuationMethod': get_text('VALUATIONMETHOD'),
                    'gstTypeOfSupply': get_text('GSTTYPEOFSUPPLY'),
                    'hsnCode': get_text('HSNCODE'),
                    'openingBalance': float(get_text('OPENINGBALANCE') or 0),
                    'openingValue': float(get_text('OPENINGVALUE') or 0),
                    'openingRate': float(get_text('OPENINGRATE') or 0),
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
                prepared.append({
                    'userId': user_id,
                    'cmpId': company_id,
                    'masterId': record.get('masterID'),
                    'alterId': record.get('alterID'),
                    'guid': record.get('guid'),
                    'ledName': record.get('name'),
                    'ledAlias': record.get('alias'),
                    'ledParent': record.get('parent'),
                    'ledDescription': record.get('description'),
                    'ledPhone': record.get('phone'),
                    'ledMobile': record.get('mobile'),
                    'ledEmail': record.get('email'),
                    'ledWebsite': record.get('website'),
                    'currencyName': record.get('currencyName'),
                    'incomeTaxNumber': record.get('incometaxNumber'),
                    'vatTinNumber': record.get('vatTINNumber'),
                    'ledOpeningBalance': record.get('openingBalance', 0),
                    'ledBillwiseOn': record.get('isBillWiseOn', False),
                    'ledIsCostcentreOn': record.get('isCostCentresOn', False),
                    'isRevenue': record.get('isRevenue', False),
                    'isActive': True
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
        """Save batch of records to database"""
        try:
            url = f"{self.backend_url}{endpoint}/sync"
            
            if VERBOSE_MODE:
                logger.debug(f"Posting {len(records)} records to {url}")
            
            response = requests.post(url, json=records, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                # Backend SyncResponse format: {success, totalReceived, totalProcessed, message}
                count = result.get('totalProcessed', result.get('count', len(records)))
                if VERBOSE_MODE:
                    logger.debug(f"Saved {count} records")
                return True, count
            else:
                logger.error(f"Database error: HTTP {response.status_code} - {response.text[:200]}")
                return False, 0
        except Exception as e:
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
    
    def sync_incremental(self, company_id: int, user_id: int, tally_port: int, 
                        entity_type: str = 'Ledger', endpoint: str = '/api/ledgers',
                        is_first_sync: bool = False, last_alter_id: int = None, 
                        company_name: str = None) -> Dict:
        """Execute incremental sync with optional reconciliation
        
        Args:
            last_alter_id: If provided, use this as the starting point instead of fetching from backend
            company_name: Tally company name to switch context
        """
        
        sync_type = 'FIRST-TIME' if is_first_sync else 'incremental'
        if VERBOSE_MODE:
            logger.info(f"\n🔄 {sync_type} {entity_type} sync for company {company_id}")
            if company_name:
                logger.info(f"🏢 Tally Company: {company_name}")
        
        # Use provided last_alter_id or fetch from backend (PER ENTITY TYPE)
        if last_alter_id is None:
            last_alter_id = self.get_last_alter_id(company_id, entity_type)
        elif VERBOSE_MODE:
            logger.debug(f"Using max AlterID for {entity_type}: {last_alter_id}")
        
        # Generate TDL with AlterID filter
        tdl = self.generate_incremental_tdl(last_alter_id, entity_type, company_name)
        
        # Fetch from Tally
        if VERBOSE_MODE:
            logger.debug("Fetching from Tally Prime...")
        xml_response = self.fetch_from_tally(tdl, tally_port)
        
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
            
            return {'success': True, 'message': 'No new records', 'count': 0, 'lastAlterID': last_alter_id}
        
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
                logger.error(f"❌ Failed to save batch {i // self.BATCH_SIZE + 1}")
                return {'success': False, 'message': 'Failed to save batch', 'count': total_saved}
            
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
        
        return {
            'success': True,
            'message': f'Successfully synced {total_saved} {entity_type}s',
            'count': total_saved,
            'lastAlterID': max_alter_id
        }


def main():
    """Main sync function"""
    try:
        # Parse arguments
        company_id = sys.argv[1] if len(sys.argv) > 1 else '1'  # Can be 'all' or specific ID
        user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        tally_port = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
        backend_url = sys.argv[4] if len(sys.argv) > 4 else os.getenv('BACKEND_URL')
        auth_token = sys.argv[5] if len(sys.argv) > 5 else ''
        device_token = sys.argv[6] if len(sys.argv) > 6 else ''
        entity_type = sys.argv[7] if len(sys.argv) > 7 else 'Ledger'
        max_alter_id = int(sys.argv[8]) if len(sys.argv) > 8 else 0  # Max alterID from database
        
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
                
                logger.info(f"\n{'='*60}")
                logger.info(f"📦 Company {cmp_id}: {cmp_name}")
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
                            tally_port=tally_port,
                            entity_type=sync_entity,
                            endpoint=sync_endpoint,
                            is_first_sync=is_first_sync,
                            last_alter_id=max_alter_id,
                            company_name=cmp_name
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
                        tally_port=tally_port,
                        entity_type=entity_type,
                        endpoint=endpoint,
                        is_first_sync=is_first_sync,
                        last_alter_id=max_alter_id,
                        company_name=cmp_name  # Pass company name to switch Tally context
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
                
                # Get company name
                company_name = None
                try:
                    companies = sync_manager.fetch_companies()
                    company = next((c for c in companies if c['id'] == company_id), None)
                    if company:
                        company_name = company['name']
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
                        tally_port=tally_port,
                        entity_type=current_entity_type,
                        endpoint=endpoint,
                        is_first_sync=is_first_sync,
                        last_alter_id=max_alter_id,
                        company_name=company_name
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
            
            # Get company name for Tally context
            company_name = None
            try:
                companies = sync_manager.fetch_companies()
                company = next((c for c in companies if c['id'] == company_id), None)
                if company:
                    company_name = company['name']
            except:
                pass
            
            # Execute sync - fetch only records with alterID > max_alter_id
            result = sync_manager.sync_incremental(
                company_id=company_id,
                user_id=user_id,
                tally_port=tally_port,
                entity_type=entity_type,
                endpoint=endpoint,
                is_first_sync=is_first_sync,
                last_alter_id=max_alter_id,
                company_name=company_name
            )
            
            # Update company sync status based on result
            if result['success']:
                sync_manager.update_company_sync_status(company_id, 'synced', True)
            else:
                sync_manager.update_company_sync_status(company_id, 'failed', False)
            
            # Output result
            print(json.dumps(result))
            sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))
        sys.exit(1)


if __name__ == '__main__':
    main()
