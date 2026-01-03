#!/usr/bin/env python3
"""
Fetch Master Data from Tally
Fetches all master data (Groups, StockItems, etc.) for a specific company
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

log_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(log_dir, f'fetch_master_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class MasterDataFetcher:
    """Fetch all master data from Tally for a company"""
    
    MASTERS = {
        'Group': 'GUID, MASTERID, ALTERID, Name, Parent, IsRevenue',
        'CostCategory': 'GUID, MASTERID, ALTERID, Name',
        'CostCenter': 'GUID, MASTERID, ALTERID, Name',
        'Currency': 'GUID, MASTERID, ALTERID, Name',
        'Unit': 'GUID, MASTERID, ALTERID, Name',
        'TaxUnit': 'GUID, MASTERID, ALTERID, Name',
        'VoucherType': 'GUID, MASTERID, ALTERID, Name',
        'Godown': 'GUID, MASTERID, ALTERID, Name',
        'STOCKGROUP': 'GUID, MASTERID, ALTERID, Name',
        'StockCategory': 'GUID, MASTERID, ALTERID, Name',
        'StockItem': 'GUID, MASTERID, ALTERID, Name, UQC, OpeningBalance, OpeningValue'
    }
    
    def __init__(self, company_name: str, tally_port: int = 9000):
        self.company_name = company_name
        self.tally_port = tally_port
        self.tally_url = f"http://localhost:{tally_port}"
    
    def generate_tdl(self, master_type: str) -> str:
        """Generate TDL to fetch all records for a master type"""
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
    
    def fetch_from_tally(self, tdl: str) -> Optional[str]:
        """Fetch data from Tally"""
        try:
            response = requests.post(
                self.tally_url,
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
            logger.error(f"Could not connect to Tally at {self.tally_url}")
            return None
        except Exception as e:
            logger.error(f"Error fetching from Tally: {e}")
            return None
    
    def parse_xml(self, xml_string: str, master_type: str) -> List[Dict]:
        """Parse XML response"""
        try:
            # Remove invalid XML characters
            xml_string = re.sub(r'&#([0-9]+);', lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), xml_string)
            root = ET.fromstring(xml_string)
            records = []
            
            for elem in root.iter(master_type.upper()):
                record = self._parse_element(elem)
                if record:
                    records.append(record)
            
            return records
        except Exception as e:
            logger.error(f"Error parsing XML for {master_type}: {e}")
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
                'parent': get_text('PARENT'),
                'isRevenue': get_text('ISREVENUE') == 'Yes',
                'uqc': get_text('UQC'),
                'openingBalance': get_text('OPENINGBALANCE'),
                'openingValue': get_text('OPENINGVALUE')
            }
        except Exception as e:
            logger.warning(f"Error parsing element: {e}")
            return None
    
    def fetch_all(self) -> Dict:
        """Fetch all master data"""
        logger.info(f"Fetching all master data for company: {self.company_name}")
        
        all_data = {}
        total_records = 0
        
        for master_type in self.MASTERS.keys():
            logger.info(f"Fetching {master_type}...")
            
            tdl = self.generate_tdl(master_type)
            xml_response = self.fetch_from_tally(tdl)
            
            if not xml_response:
                logger.warning(f"Failed to fetch {master_type}")
                all_data[master_type] = []
                continue
            
            records = self.parse_xml(xml_response, master_type)
            all_data[master_type] = records
            total_records += len(records)
            logger.info(f"{master_type}: {len(records)} records")
        
        logger.info(f"Total records fetched: {total_records}")
        
        return all_data


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("Company name required")
        
        company_name = sys.argv[1]
        tally_port = int(sys.argv[2]) if len(sys.argv) > 2 else 9000
        is_first_sync = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else False
        
        logger.info(f"Starting master data fetch for {company_name}")
        
        fetcher = MasterDataFetcher(company_name, tally_port)
        master_data = fetcher.fetch_all()
        
        # Output as JSON
        result = {
            'success': True,
            'company': company_name,
            'data': master_data,
            'message': 'Master data fetched successfully'
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        result = {
            'success': False,
            'data': {},
            'message': str(e)
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == '__main__':
    main()
