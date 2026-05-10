#!/usr/bin/env python3
import requests
import xml.etree.ElementTree as ET
import sys
import re
import json
import os
import threading

TALLY_URL_TEMPLATE = "http://localhost:{}"
BACKEND_URL_DEFAULT = "http://localhost:8080"

# --- TDL Requests ---
TDL_BALANCE_SHEET = """<ENVELOPE>
	<HEADER>
		<VERSION>1</VERSION>
		<TALLYREQUEST>EXPORT</TALLYREQUEST>
		<TYPE>DATA</TYPE>
		<ID>My Balance Sheet</ID>
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
					<REPORT NAME='My Balance Sheet' ISMODIFY='No' ISFIXED='No' ISINITIALIZE='No' ISOPTION='No' ISINTERNAL='No'>
						<VARIABLE>SVFROMDATE,SVTODATE,SVCURRENTCOMPANY,ReportTitle,ReportSubTitle</VARIABLE>
						<USE>Balance Sheet</USE>
						<FORMS>Balance Sheet</FORMS>
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
						<VARIABLE>SVFROMDATE,SVTODATE,SVEXPORTFORMAT,SVCURRENTCOMPANY,ReportTitle,ReportSubTitle</VARIABLE>
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


class FinancialReportSync:
    def __init__(self, company_name, cmp_id, user_id, tally_port, backend_url, from_date=None, to_date=None, auth_token=None, device_token=None):
        self.company_name = company_name
        self.cmp_id = int(cmp_id)
        self.user_id = int(user_id)
        self.tally_url = TALLY_URL_TEMPLATE.format(tally_port)
        self.backend_url = backend_url
        self.from_date = from_date or "20240401"
        self.to_date = to_date or "20250331"
        self.auth_token = auth_token
        self.device_token = device_token
        
        self.headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            self.headers['Authorization'] = f'Bearer {self.auth_token}'
        if self.device_token:
            self.headers['X-Device-Token'] = self.device_token

    def _clean_xml(self, xml_text):
        # Sanitize invalid XML characters like &#4; that Tally sends
        return re.sub(r'&#x?[0-9a-fA-F]+;', '', xml_text)

    def _post_to_backend(self, endpoint, data, report_name):
        sync_url = f"{self.backend_url}{endpoint}"
        print(f"Syncing {report_name} to backend at {sync_url}...")
        try:
            response = requests.post(sync_url, json=data, headers=self.headers, timeout=30)
            if response.status_code in [200, 201]:
                print(f"[SUCCESS] {report_name} successfully synced to database (Count: {len(data)})")
                return True
            else:
                print(f"[FAILED] Sync {report_name} failed. Status: {response.status_code}, Error: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Backend connection error for {report_name}: {e}")
            return False

    def fetch_and_sync_balance_sheet(self):
        print(f"\n--- Syncing Balance Sheet ---")
        tdl = TDL_BALANCE_SHEET.replace("{company_name}", self.company_name).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
        try:
            response = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            if response.status_code != 200:
                print(f"Failed to connect to Tally. Status Code: {response.status_code}")
                return False

            xml_text = self._clean_xml(response.text)
            if "DSPACCNAME" not in xml_text:
                print("Invalid response from Tally. It may not have exported properly.")
                return False

            root = ET.fromstring(xml_text)
            parsed_data = []
            current_bsname = None
            
            for child in root:
                if child.tag == 'BSNAME':
                    dsp_accname = child.find('DSPACCNAME')
                    if dsp_accname is not None:
                        name = dsp_accname.findtext('DSPDISPNAME', '')
                        guid = dsp_accname.findtext('GUID', '')
                        is_group = dsp_accname.findtext('ISGROUP', '')
                        parent_grp = dsp_accname.findtext('PARENTGRP', '')
                        
                        if parent_grp and 'Primary' in parent_grp:
                            parent_grp = 'Primary'
                            
                        current_bsname = {
                            'name': name,
                            'cmp_id': self.cmp_id,
                            'guid': guid,
                            'isGroup': is_group,
                            'parentGroup': parent_grp,
                            'subAmount': '',
                            'mainAmount': ''
                        }
                elif child.tag == 'BSAMT':
                    if current_bsname is not None:
                        current_bsname['subAmount'] = child.findtext('BSSUBAMT', '')
                        current_bsname['mainAmount'] = child.findtext('BSMAINAMT', '')
                        parsed_data.append(current_bsname)
                        current_bsname = None
            
            if parsed_data:
                return self._post_to_backend("/reports/balancesheet/sync", parsed_data, "Balance Sheet")
            else:
                print("No Balance Sheet data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Balance Sheet: {e}")
            return False

    def fetch_and_sync_profit_loss(self):
        print(f"\n--- Syncing Profit and Loss ---")
        tdl = TDL_PROFIT_LOSS.replace("{company_name}", self.company_name).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
        try:
            response = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            if response.status_code != 200:
                print(f"Failed to connect to Tally. Status Code: {response.status_code}")
                return False

            xml_text = self._clean_xml(response.text)
            if "DSPACCNAME" not in xml_text:
                print("Invalid response from Tally. It may not have exported properly.")
                return False

            root = ET.fromstring(xml_text)
            parsed_data = []
            current_name_obj = None
            
            for child in root:
                if child.tag == 'DSPACCNAME':
                    name = child.findtext('DSPDISPNAME', '')
                    guid = child.findtext('GUID', '')
                    is_group = child.findtext('ISGROUP', '')
                    parent_grp = child.findtext('PARENTGRP', '')
                    
                    if parent_grp and 'Primary' in parent_grp:
                        parent_grp = 'Primary'
                        
                    current_name_obj = {
                        'name': name,
                        'cmp_id': self.cmp_id,
                        'guid': guid,
                        'isGroup': is_group,
                        'parentGroup': parent_grp,
                        'subAmount': '',
                        'mainAmount': ''
                    }
                elif child.tag == 'PLAMT':
                    if current_name_obj is not None:
                        sub_amt = child.findtext('PLSUBAMT', '')
                        main_amt = child.findtext('BSMAINAMT', '')
                        if not main_amt:
                            main_amt = child.findtext('PLMAINAMT', '')
                            
                        current_name_obj['subAmount'] = sub_amt
                        current_name_obj['mainAmount'] = main_amt
                        parsed_data.append(current_name_obj)
                        current_name_obj = None
            
            if parsed_data:
                return self._post_to_backend("/reports/profitloss/sync", parsed_data, "Profit and Loss")
            else:
                print("No Profit and Loss data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Profit and Loss: {e}")
            return False

    def fetch_and_sync_trial_balance(self):
        print(f"\n--- Syncing Trial Balance ---")
        tdl = TDL_TRIAL_BALANCE.replace("{company_name}", self.company_name).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
        try:
            response = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            if response.status_code != 200:
                print(f"Failed to connect to Tally. Status Code: {response.status_code}")
                return False

            xml_text = self._clean_xml(response.text)
            if "DSPACCNAME" not in xml_text:
                print("Invalid response from Tally. It may not have exported properly.")
                return False

            root = ET.fromstring(xml_text)
            parsed_data = []
            current_name_obj = None
            
            for child in root:
                if child.tag == 'DSPACCNAME':
                    name = child.findtext('DSPDISPNAME', '')
                    guid = child.findtext('GUID', '')
                    is_group = child.findtext('ISGROUP', '')
                    parent_grp = child.findtext('PARENTGRP', '')
                    
                    if parent_grp and 'Primary' in parent_grp:
                        parent_grp = 'Primary'
                        
                    current_name_obj = {
                        'name': name,
                        'cmp_id': self.cmp_id,
                        'guid': guid,
                        'isGroup': is_group,
                        'parentGroup': parent_grp,
                        'debitAmount': '',
                        'creditAmount': ''
                    }
                elif child.tag == 'DSPACCINFO':
                    if current_name_obj is not None:
                        debit_amt_node = child.find('DSPCLDRAMT')
                        debit_amt = debit_amt_node.findtext('DSPCLDRAMTA', '') if debit_amt_node is not None else ''
                            
                        credit_amt_node = child.find('DSPCLCRAMT')
                        credit_amt = credit_amt_node.findtext('DSPCLCRAMTA', '') if credit_amt_node is not None else ''
                            
                        current_name_obj['debitAmount'] = debit_amt
                        current_name_obj['creditAmount'] = credit_amt
                        
                        parsed_data.append(current_name_obj)
                        current_name_obj = None
            
            if parsed_data:
                return self._post_to_backend("/reports/trailbalance/sync", parsed_data, "Trial Balance")
            else:
                print("No Trial Balance data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Trial Balance: {e}")
            return False

    def sync_all(self, report_type=None):
        if report_type == 'balancesheet':
            success = self.fetch_and_sync_balance_sheet()
            result = {'success': success, 'details': {'balance_sheet': success}}
        elif report_type == 'profitloss':
            success = self.fetch_and_sync_profit_loss()
            result = {'success': success, 'details': {'profit_loss': success}}
        elif report_type == 'trailbalance':
            success = self.fetch_and_sync_trial_balance()
            result = {'success': success, 'details': {'trial_balance': success}}
        else:
            print(f"Starting Financial Reports Sync for Company: {self.company_name} (ID: {self.cmp_id})")
            bs_success = self.fetch_and_sync_balance_sheet()
            pl_success = self.fetch_and_sync_profit_loss()
            tb_success = self.fetch_and_sync_trial_balance()
            
            result = {
                'success': bs_success and pl_success and tb_success,
                'details': {
                    'balance_sheet': bs_success,
                    'profit_loss': pl_success,
                    'trial_balance': tb_success
                }
            }
        
        print("\n--- Sync Summary ---")
        print(json.dumps(result, indent=2))
        return result


def monitor_parent_process():
    """
    Monitor stdin for closure. When Electron parent process dies or kills the script,
    the stdin pipe will close, signaling this script to exit.
    """
    try:
        # sys.stdin.read() will block until the pipe is closed
        sys.stdin.read()
        # If read() returns, the pipe is closed
        os._exit(0)
    except Exception:
        os._exit(0)


def main():
    # Start parent process monitor thread
    monitor_thread = threading.Thread(target=monitor_parent_process, daemon=True)
    monitor_thread.start()

    if len(sys.argv) < 4:
        print("Usage: python sync_financial_reports.py <company_name> <cmp_id> <user_id> [from_date] [to_date] [tally_port] [backend_url] [auth_token] [device_token]")
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
    report_type = sys.argv[10] if len(sys.argv) > 10 else None
    
    syncer = FinancialReportSync(
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
    
    syncer.sync_all(report_type)

if __name__ == "__main__":
    main()
