#!/usr/bin/env python3
"""
Improved Profit and Loss Parser for Tally XML
Captures all accounts, parent groups, and their values correctly
"""
import requests
import xml.etree.ElementTree as ET
import sys
import re
import json
import os
import threading
from typing import List, Dict, Any

TALLY_URL_TEMPLATE = "http://localhost:{}"
BACKEND_URL_DEFAULT = "http://localhost:8080"

TDL_PROFIT_LOSS = """<ENVELOPE>
	<HEADER>
		<VERSION>1</VERSION>
		<TALLYREQUEST>EXPORT</TALLYREQUEST>
		<TYPE>DATA</TYPE>
		<ID>My Profit and Loss</ID>
	</HEADER>
	<BODY>
		<DESC>
			<STATICVARIABLES>
				<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
				<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
				<SVFROMDATE TYPE='Date'>{from_date}</SVFROMDATE>
				<SVTODATE TYPE='Date'>{to_date}</SVTODATE>
				<DSPNameStyle>NameOnly</DSPNameStyle>
				<EXPLODEFLAG>Yes</EXPLODEFLAG>
			</STATICVARIABLES>
			<TDL>
				<TDLMESSAGE>
					<REPORT NAME='My Profit and Loss' ISMODIFY='No' ISFIXED='No' ISINITIALIZE='No' ISOPTION='No' ISINTERNAL='No'>
						<VARIABLE>SVFROMDATE,SVTODATE,SVEXPORTFORMAT,SVCURRENTCOMPANY,ReportTitle,ReportSubTitle</VARIABLE>
						<USE>Profit and Loss</USE>
						<FORMS>Profit and Loss</FORMS>
					</REPORT>
					<FIELD ISMODIFY='Yes' NAME='DSP AccName'>
						<Fields>GUID,ISGROUP,PARENTGRP</Fields>
					</FIELD>
					<FIELD NAME='GUID'>
						<SET>$GUID</SET>
					</FIELD>
					<FIELD NAME='ISGROUP'>
						<SET>$$ISGROUP</SET>
					</FIELD>
					<FIELD NAME='PARENTGRP'>
						<SET>$Parent</SET>
					</FIELD>
				</TDLMESSAGE>
			</TDL>
		</DESC>
	</BODY>
</ENVELOPE>"""


class ImprovedProfitLossSync:
    def __init__(self, company_name, cmp_id, user_id, tally_port, backend_url, from_date=None, to_date=None, auth_token=None, device_token=None):
        self.company_name = company_name
        self.cmp_id = int(cmp_id)
        self.user_id = int(user_id)
        self.tally_url = TALLY_URL_TEMPLATE.format(tally_port)
        self.backend_url = backend_url
        self.from_date = from_date or "19800401"
        self.to_date = to_date or "20260531"
        self.auth_token = auth_token
        self.device_token = device_token
        
        self.headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            self.headers['Authorization'] = f'Bearer {self.auth_token}'
        if self.device_token:
            self.headers['X-Device-Token'] = self.device_token

    def _clean_xml(self, xml_text):
        """Sanitize invalid XML characters like &#4; that Tally sends"""
        # Remove specific invalid character &#4; and similar
        xml_text = re.sub(r'&#4;', '', xml_text)
        xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)
        return xml_text

    def _post_to_backend(self, endpoint, data, report_name):
        """Post data to backend API"""
        sync_url = f"{self.backend_url}{endpoint}"
        print(f"\nSyncing {report_name} to backend: {sync_url}")
        print(f"Total records to sync: {len(data)}")
        
        try:
            response = requests.post(sync_url, json=data, headers=self.headers, timeout=30)
            if response.status_code in [200, 201]:
                print(f"✓ [SUCCESS] {report_name} synced successfully!")
                print(f"  Records synced: {len(data)}")
                return True
            else:
                print(f"✗ [FAILED] Status: {response.status_code}")
                print(f"  Error: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Backend connection error: {e}")
            return False

    def _normalize_amount(self, amount_str):
        """Normalize amount string - return empty string if None or empty"""
        if not amount_str or amount_str.strip() == '':
            return ''
        return amount_str.strip()

    def _parse_profit_loss_xml(self, xml_text) -> List[Dict[str, Any]]:
        """
        Parse Profit & Loss XML with improved hierarchy handling
        
        Structure expected:
        - DSPACCNAME (parent group header)
        - PLAMT (parent group totals)
        - BSNAME (child account)
          - DSPACCNAME (child details)
          - BSAMT (child amounts)
        - ... repeat pattern
        """
        parsed_data = []
        root = ET.fromstring(xml_text)
        
        i = 0
        elements = list(root)
        
        while i < len(elements):
            elem = elements[i]
            
            if elem.tag == 'DSPACCNAME':
                # Parse top-level or group header
                account_data = self._extract_account_info(elem)
                
                # Check if next element is PLAMT (amount for this group/account)
                if i + 1 < len(elements) and elements[i + 1].tag == 'PLAMT':
                    amount_elem = elements[i + 1]
                    account_data['subAmount'] = self._normalize_amount(
                        amount_elem.findtext('PLSUBAMT', '')
                    )
                    account_data['mainAmount'] = self._normalize_amount(
                        amount_elem.findtext('BSMAINAMT', '')
                    )
                    i += 1  # Skip the PLAMT element
                else:
                    account_data['subAmount'] = ''
                    account_data['mainAmount'] = ''
                
                parsed_data.append(account_data)
                
            elif elem.tag == 'BSNAME':
                # Parse child account entry
                account_data = self._parse_bsname_block(elem)
                if account_data:
                    parsed_data.append(account_data)
            
            i += 1
        
        return parsed_data

    def _extract_account_info(self, dspaccname_elem) -> Dict[str, Any]:
        """Extract account information from DSPACCNAME element"""
        name = dspaccname_elem.findtext('DSPDISPNAME', '')
        guid = dspaccname_elem.findtext('GUID', '')
        is_group = dspaccname_elem.findtext('ISGROUP', '')
        parent_grp = dspaccname_elem.findtext('PARENTGRP', '')
        
        # Clean up parent group
        if parent_grp and '&#' in parent_grp:
            parent_grp = parent_grp.replace('&#4;', '').strip()
        if parent_grp and 'Primary' in parent_grp:
            parent_grp = 'Primary'
        
        return {
            'name': name,
            'cmp_id': self.cmp_id,
            'guid': guid if guid else '',
            'isGroup': is_group,
            'parentGroup': parent_grp,
            'subAmount': '',
            'mainAmount': ''
        }

    def _parse_bsname_block(self, bsname_elem) -> Dict[str, Any]:
        """Parse BSNAME block which contains account with its amounts"""
        dspaccname = bsname_elem.find('DSPACCNAME')
        if dspaccname is None:
            return None
        
        account_data = self._extract_account_info(dspaccname)
        
        # Look for BSAMT in the BSNAME element
        bsamt = bsname_elem.find('BSAMT')
        if bsamt is not None:
            account_data['subAmount'] = self._normalize_amount(
                bsamt.findtext('BSSUBAMT', '')
            )
            account_data['mainAmount'] = self._normalize_amount(
                bsamt.findtext('BSMAINAMT', '')
            )
        
        return account_data

    def fetch_and_sync_profit_loss(self):
        """Fetch and sync Profit & Loss data"""
        print(f"\n{'='*60}")
        print(f"[PROFIT & LOSS SYNC]")
        print(f"Company: {self.company_name} (ID: {self.cmp_id})")
        print(f"Period: {self.from_date} to {self.to_date}")
        print(f"{'='*60}")
        
        # Format TDL request
        tdl = TDL_PROFIT_LOSS.replace("{company_name}", self.company_name)\
                               .replace("{from_date}", self.from_date)\
                               .replace("{to_date}", self.to_date)
        
        try:
            # Connect to Tally
            print(f"\nConnecting to Tally at {self.tally_url}...")
            response = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            
            if response.status_code != 200:
                print(f"✗ Tally connection failed. Status: {response.status_code}")
                return False
            
            print("✓ Connected to Tally")
            
            # Clean and parse XML
            xml_text = self._clean_xml(response.text)
            if "DSPACCNAME" not in xml_text:
                print("✗ Invalid response from Tally - no account data found")
                return False
            
            print("Parsing XML response...")
            parsed_data = self._parse_profit_loss_xml(xml_text)
            
            if not parsed_data:
                print("✗ No Profit and Loss data could be parsed")
                return False
            
            # Print sample data
            print(f"\n✓ Parsed {len(parsed_data)} records")
            print("\nSample records (first 5):")
            for i, record in enumerate(parsed_data[:5], 1):
                print(f"  {i}. {record['name']:<40} | Parent: {record['parentGroup']:<15} | Main: {record['mainAmount']}")
            
            # Sync to backend
            success = self._post_to_backend(
                "/reports/profitloss/sync",
                parsed_data,
                "Profit and Loss"
            )
            
            if success:
                print(f"\n✓ Profit & Loss sync completed successfully!")
                print(f"  Total: {len(parsed_data)} records")
                self._print_summary(parsed_data)
            
            return success
            
        except ET.ParseError as e:
            print(f"✗ XML parsing error: {e}")
            return False
        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _print_summary(self, parsed_data):
        """Print summary of parsed data"""
        groups = [r for r in parsed_data if r['isGroup'] == 'Yes']
        accounts = [r for r in parsed_data if r['isGroup'] != 'Yes']
        parent_groups = {}
        
        for record in parsed_data:
            pg = record['parentGroup']
            if pg:
                parent_groups[pg] = parent_groups.get(pg, 0) + 1
        
        print(f"\n  Groups: {len(groups)}")
        print(f"  Accounts: {len(accounts)}")
        print(f"  Parent Groups: {len(parent_groups)}")
        
        if parent_groups:
            print(f"\n  Parent Group Distribution:")
            for pg, count in sorted(parent_groups.items(), key=lambda x: x[1], reverse=True):
                print(f"    - {pg}: {count} items")


def monitor_parent_process():
    """Monitor stdin for closure"""
    try:
        sys.stdin.read()
        os._exit(0)
    except Exception:
        os._exit(0)


def main():
    monitor_thread = threading.Thread(target=monitor_parent_process, daemon=True)
    monitor_thread.start()

    if len(sys.argv) < 4:
        print("Usage: python improved_profit_loss_sync.py <company_name> <cmp_id> <user_id> [from_date] [to_date] [tally_port] [backend_url] [auth_token] [device_token]")
        sys.exit(1)
    
    company_name = sys.argv[1]
    cmp_id = sys.argv[2]
    user_id = sys.argv[3]
    from_date = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'None' else None
    to_date = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != 'None' else None
    tally_port = sys.argv[6] if len(sys.argv) > 6 else "9000"
    backend_url = sys.argv[7] if len(sys.argv) > 7 else BACKEND_URL_DEFAULT
    auth_token = sys.argv[8] if len(sys.argv) > 8 else None
    device_token = sys.argv[9] if len(sys.argv) > 9 else None
    
    syncer = ImprovedProfitLossSync(
        company_name=company_name,
        cmp_id=cmp_id,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        tally_port=tally_port,
        backend_url=backend_url,
        auth_token=auth_token,
        device_token=device_token
    )
    
    syncer.fetch_and_sync_profit_loss()


if __name__ == "__main__":
    main()
