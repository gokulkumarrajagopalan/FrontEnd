import requests
import logging
import sys
from datetime import datetime
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET
import re
import os

log_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(log_dir, f'incremental_sync_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class IncrementalSync:
    """Incremental sync for master data using AlterID filtering"""
    
    MASTERS = {
        'Group': 'GUID, MASTERID, ALTERID, Name',
        'CostCategory': 'GUID, MASTERID, ALTERID, Name',
        'CostCenter': 'GUID, MASTERID, ALTERID, Name',
        'Currency': 'GUID, MASTERID, ALTERID, Name',
        'Unit': 'GUID, MASTERID, ALTERID, Name',
        'TaxUnit': 'GUID, MASTERID, ALTERID, Name',
        'VoucherType': 'GUID, MASTERID, ALTERID, Name',
        'Godown': 'GUID, MASTERID, ALTERID, Name',
        'STOCKGROUP': 'GUID, MASTERID, ALTERID, Name',
        'StockCategory': 'GUID, MASTERID, ALTERID, Name',
        'StockItem': 'GUID, MASTERID, ALTERID, Name'
    }
    
    DEFAULT_ALTER_ID = 219
    
    def __init__(self, tally_port: int = 9000, company_name: str = None):
        self.tally_port = tally_port
        self.company_name = company_name
    
    def generate_tdl(self, last_alter_id: int, master_type: str) -> str:
        """Generate TDL for incremental fetch"""
        fetch_fields = self.MASTERS.get(master_type, 'GUID, MASTERID, ALTERID, Name')
        company_tag = f"<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>" if self.company_name else ""
        
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
                {company_tag}
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of {master_type}" ISMODIFY="No">
                        <TYPE>{master_type}</TYPE>
                        <FETCH>{fetch_fields}</FETCH>
                        <FILTERS>FilterAlterId</FILTERS>
                    </COLLECTION>
                    <SYSTEM TYPE="Formula" NAME="FilterAlterId"> $AlterID > {last_alter_id} </SYSTEM>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    def fetch_from_tally(self, tdl: str) -> Optional[str]:
        """Fetch data from Tally"""
        try:
            url = f"http://localhost:{self.tally_port}"
            response = requests.post(
                url,
                data=tdl,
                headers={'Content-Type': 'application/xml'},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.text
            else:
                logger.error(f"Tally error: HTTP {response.status_code}")
                return None
        except requests.exceptions.ConnectionError:
            logger.error(f"Could not connect to Tally at localhost:{self.tally_port}")
            return None
        except Exception as e:
            logger.error(f"Error fetching from Tally: {e}")
            return None
    
    def parse_xml(self, xml_string: str, master_type: str) -> List[Dict]:
        """Parse XML response"""
        try:
            xml_string = re.sub(r'&#([0-9]+);', lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), xml_string)
            root = ET.fromstring(xml_string)
            records = []
            
            for elem in root.iter(master_type.upper()):
                record = self._parse_element(elem)
                if record:
                    records.append(record)
            
            return records
        except Exception as e:
            logger.error(f"Error parsing XML: {e}")
            return []
    
    def _parse_element(self, elem) -> Optional[Dict]:
        """Parse individual element"""
        try:
            def get_text(tag_name):
                child = elem.find(tag_name)
                return child.text if child is not None else None
            
            alter_id = int(get_text('ALTERID') or 0)
            
            # Filter out system records (AlterID=0)
            if alter_id == 0:
                return None
            
            return {
                'guid': get_text('GUID'),
                'masterID': get_text('MASTERID'),
                'alterID': alter_id,
                'name': get_text('NAME'),
            }
        except Exception as e:
            logger.warning(f"Error parsing element: {e}")
            return None
    
    def sync(self, last_alter_id: int = None) -> Dict:
        """Sync master data incrementally"""
        if last_alter_id is None:
            last_alter_id = self.DEFAULT_ALTER_ID
        
        company_info = f" for company '{self.company_name}'" if self.company_name else ""
        logger.info(f"Starting incremental sync with lastAlterID={last_alter_id}{company_info}")
        
        results = {}
        total_records = 0
        
        for master_type in self.MASTERS.keys():
            tdl = self.generate_tdl(last_alter_id, master_type)
            xml_response = self.fetch_from_tally(tdl)
            
            if not xml_response:
                results[master_type] = {'count': 0, 'status': 'FAILED'}
                continue
            
            records = self.parse_xml(xml_response, master_type)
            results[master_type] = {'count': len(records), 'status': 'SUCCESS'}
            total_records += len(records)
            logger.info(f"{master_type}: {len(records)} records")
        
        logger.info(f"Sync completed: {total_records} total records")
        
        return {
            'success': True,
            'lastAlterID': last_alter_id,
            'company': self.company_name,
            'results': results,
            'totalRecords': total_records
        }


def main():
    try:
        tally_port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
        last_alter_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
        company_name = sys.argv[3] if len(sys.argv) > 3 else None
        
        syncer = IncrementalSync(tally_port, company_name)
        result = syncer.sync(last_alter_id)
        
        logger.info(f"Result: {result['totalRecords']} records synced")
        
    except Exception as e:
        logger.error(f"Sync failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
