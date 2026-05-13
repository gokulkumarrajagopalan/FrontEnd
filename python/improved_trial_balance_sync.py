#!/usr/bin/env python3
"""
Improved Trial Balance Parser for Tally XML
Captures all accounts with debit/credit amounts correctly
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

TDL_TRIAL_BALANCE = """<ENVELOPE>
	<HEADER>
		<VERSION>1</VERSION>
		<TALLYREQUEST>Export</TALLYREQUEST>
		<TYPE>Data</TYPE>
		<ID>My Trial Balance</ID>
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
					<REPORT NAME='My Trial Balance' ISMODIFY='No' ISFIXED='No' ISINITIALIZE='No' ISOPTION='No' ISINTERNAL='No'>
						<VARIABLE>SVEXPORTFORMAT,SVCURRENTCOMPANY,SVFROMDATE,SVTODATE,ReportTitle,ReportSubTitle</VARIABLE>
						<USE>Trial Balance</USE>
						<FORMS>Group Summary</FORMS>
					</REPORT>
					<FIELD ISMODIFY='Yes' NAME='DSP AccName'>
						<Fields>GUID,ISGROUP, PARENTGRP</Fields>
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


class ImprovedTrialBalanceSync:
    def __init__(self, company_name, cmp_id, user_id, tally_port, backend_url, from_date=None, to_date=None, auth_token=None, device_token=None):
        self.company_name = company_name
        self.cmp_id = int(cmp_id)
        self.user_id = int(user_id)
        self.tally_url = TALLY_URL_TEMPLATE.format(tally_port)
        self.backend_url = backend_url
        self.from_date = from_date or "20250401"
        self.to_date = to_date or "20260331"
        self.auth_token = auth_token
        self.device_token = device_token
        
        self.headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            self.headers['Authorization'] = f'Bearer {self.auth_token}'
        if self.device_token:
            self.headers['X-Device-Token'] = self.device_token

    def _clean_xml(self, xml_text):
        """Sanitize invalid XML characters like &#4; that Tally sends"""
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

    def _parse_trial_balance_xml(self, xml_text) -> List[Dict[str, Any]]:
        """
        Parse Trial Balance XML
        
        Structure expected:
        - DSPACCNAME (account header)
        - DSPACCINFO (account amounts with debit/credit)
        """
        parsed_data = []
        root = ET.fromstring(xml_text)
        
        i = 0
        elements = list(root)
        
        while i < len(elements):
            elem = elements[i]
            
            if elem.tag == 'DSPACCNAME':
                # Parse account header
                name = elem.findtext('DSPDISPNAME', '')
                guid = elem.findtext('GUID', '')
                is_group = elem.findtext('ISGROUP', '')
                parent_grp = elem.findtext('PARENTGRP', '')
                
                # Clean up parent group
                if parent_grp and '&#' in parent_grp:
                    parent_grp = parent_grp.replace('&#4;', '').strip()
                if parent_grp and 'Primary' in parent_grp:
                    parent_grp = 'Primary'
                
                account_data = {
                    'name': name,
                    'cmp_id': self.cmp_id,
                    'guid': guid if guid else '',
                    'isGroup': is_group,
                    'parentGroup': parent_grp,
                    'debitAmount': '',
                    'creditAmount': ''
                }
                
                # Check if next element is DSPACCINFO (amounts for this account)
                if i + 1 < len(elements) and elements[i + 1].tag == 'DSPACCINFO':
                    info_elem = elements[i + 1]
                    
                    # Extract debit amount
                    debit_amt_node = info_elem.find('DSPCLDRAMT')
                    if debit_amt_node is not None:
                        debit_amt = debit_amt_node.findtext('DSPCLDRAMTA', '')
                        account_data['debitAmount'] = self._normalize_amount(debit_amt)
                    
                    # Extract credit amount
                    credit_amt_node = info_elem.find('DSPCLCRAMT')
                    if credit_amt_node is not None:
                        credit_amt = credit_amt_node.findtext('DSPCLCRAMTA', '')
                        account_data['creditAmount'] = self._normalize_amount(credit_amt)
                    
                    i += 1  # Skip the DSPACCINFO element
                
                parsed_data.append(account_data)
            
            i += 1
        
        return parsed_data

    def fetch_and_sync_trial_balance(self):
        """Fetch and sync Trial Balance data"""
        print(f"\n{'='*60}")
        print(f"[TRIAL BALANCE SYNC]")
        print(f"Company: {self.company_name} (ID: {self.cmp_id})")
        print(f"Period: {self.from_date} to {self.to_date}")
        print(f"{'='*60}")
        
        # Format TDL request
        tdl = TDL_TRIAL_BALANCE.replace("{company_name}", self.company_name)\
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
            parsed_data = self._parse_trial_balance_xml(xml_text)
            
            if not parsed_data:
                print("✗ No Trial Balance data could be parsed")
                return False
            
            # Print sample data
            print(f"\n✓ Parsed {len(parsed_data)} records")
            print("\nSample records (first 10):")
            for i, record in enumerate(parsed_data[:10], 1):
                debit = record['debitAmount'] if record['debitAmount'] else '-'
                credit = record['creditAmount'] if record['creditAmount'] else '-'
                print(f"  {i:2d}. {record['name']:<40} | D: {debit:>12} | C: {credit:>12}")
            
            # Sync to backend
            success = self._post_to_backend(
                "/reports/trailbalance/sync",
                parsed_data,
                "Trial Balance"
            )
            
            if success:
                print(f"\n✓ Trial Balance sync completed successfully!")
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
        
        # Calculate totals
        total_debits = 0
        total_credits = 0
        parent_groups = {}
        
        for record in parsed_data:
            pg = record['parentGroup']
            if pg not in parent_groups:
                parent_groups[pg] = {'groups': 0, 'accounts': 0, 'debit': 0, 'credit': 0}
            
            if record['isGroup'] == 'Yes':
                parent_groups[pg]['groups'] += 1
            else:
                parent_groups[pg]['accounts'] += 1
            
            try:
                if record['debitAmount']:
                    total_debits += float(record['debitAmount'])
                    parent_groups[pg]['debit'] += float(record['debitAmount'])
            except (ValueError, TypeError):
                pass
            
            try:
                if record['creditAmount']:
                    total_credits += float(record['creditAmount'])
                    parent_groups[pg]['credit'] += float(record['creditAmount'])
            except (ValueError, TypeError):
                pass
        
        print(f"\n  Groups: {len(groups)}")
        print(f"  Accounts: {len(accounts)}")
        print(f"\n  Total Debits: Rs. {total_debits:,.2f}")
        print(f"  Total Credits: Rs. {total_credits:,.2f}")
        print(f"  Difference: Rs. {abs(total_debits - total_credits):,.2f}")
        
        if abs(total_debits - total_credits) < 0.01:
            print(f"  ✓ Trial Balance BALANCED")
        else:
            print(f"  ⚠ Trial Balance OUT OF BALANCE")
        
        if parent_groups:
            print(f"\n  Parent Group Distribution:")
            for pg, data in sorted(parent_groups.items()):
                total = data['groups'] + data['accounts']
                print(f"    - {pg}: {total} items (D: Rs. {data['debit']:,.2f} | C: Rs. {data['credit']:,.2f})")


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
        print("Usage: python improved_trial_balance_sync.py <company_name> <cmp_id> <user_id> [from_date] [to_date] [tally_port] [backend_url] [auth_token] [device_token]")
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
    
    syncer = ImprovedTrialBalanceSync(
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
    
    syncer.fetch_and_sync_trial_balance()


if __name__ == "__main__":
    main()
