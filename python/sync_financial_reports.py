#!/usr/bin/env python3
import sys
import io

# Force UTF-8 stdout/stderr on Windows (cp1252 default can't encode emoji)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import requests
import xml.etree.ElementTree as ET
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
				<SVCOMPANY>{escaped_company}</SVCOMPANY>
				<SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>
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
				<SVCOMPANY>{escaped_company}</SVCOMPANY>
				<SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>
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
				<SVCOMPANY>{escaped_company}</SVCOMPANY>
				<SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>
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
    def __init__(self, company_name, cmp_id, user_id, tally_port, backend_url, from_date=None, to_date=None, auth_token=None, device_token=None, financial_year=None):
        self.company_name = company_name
        self.cmp_id = int(cmp_id)
        self.user_id = int(user_id)
        self.tally_url = TALLY_URL_TEMPLATE.format(tally_port)
        self.backend_url = backend_url
        
        from datetime import datetime
        now = datetime.now()
        fy_start_year = now.year if now.month >= 4 else now.year - 1
        
        is_from_valid = from_date and from_date != 'None' and str(from_date).strip() != ''
        is_to_valid = to_date and to_date != 'None' and str(to_date).strip() != ''
        
        self.from_date = from_date if is_from_valid else f"{fy_start_year}0401"
        self.to_date = to_date if is_to_valid else now.strftime("%Y%m%d")
        
        self.auth_token = auth_token
        self.device_token = device_token
        
        self.headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            self.headers['Authorization'] = f'Bearer {self.auth_token}'
        if self.device_token:
            self.headers['X-Device-Token'] = self.device_token

        if financial_year and financial_year != 'None' and str(financial_year).strip() != '':
            self.financial_year = financial_year
        else:
            self.financial_year = self.compute_financial_year(self.from_date, self.to_date)

    def compute_financial_year(self, from_date, to_date):
        if not from_date or not to_date:
            return "Full"
        
        fd = str(from_date).strip()
        td = str(to_date).strip()
        
        if len(fd) != 8 or len(td) != 8:
            return "Full"
        
        try:
            from_yr = int(fd[0:4])
            from_md = fd[4:8]  # "0401"
            to_yr = int(td[0:4])
            to_md = td[4:8]    # "0331"
            
            # If dates span multiple financial years, return "Full"
            if to_yr - from_yr > 1:
                return "Full"
                
            if from_md == "0401" and to_md == "0331" and to_yr == from_yr + 1:
                short_start = str(from_yr)[2:4]
                short_end = str(to_yr)[2:4]
                return f"{short_start}-{short_end}"
            else:
                start_month = int(fd[4:6])
                if start_month >= 4:
                    fy_start = from_yr
                else:
                    fy_start = from_yr - 1
                short_start = str(fy_start)[2:4]
                short_end = str(fy_start + 1)[2:4]
                return f"{short_start}-{short_end}"
        except Exception:
            return "Full"

    def _clean_xml(self, xml_text):
        # Sanitize invalid XML characters like &#4; that Tally sends
        xml_text = re.sub(r'&#4;', '', xml_text)  # Remove &#4; specifically
        xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)  # Remove other control chars
        return xml_text

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

    def _convert_to_numeric(self, value):
        """Convert string amount to proper numeric format, handling empty/invalid values"""
        if not value or value.strip() == '':
            return None
        
        try:
            # Remove any whitespace and convert to Decimal
            clean_value = value.strip()
            # Handle negative values
            amount = float(clean_value)
            # Return as string for JSON serialization (will be converted to BigDecimal on backend)
            return str(amount)
        except (ValueError, AttributeError):
            print(f"Warning: Could not convert amount '{value}' to numeric - defaulting to None")
            return None

    def fetch_and_sync_balance_sheet(self):
        print(f"\n--- Syncing Balance Sheet ---")
        escaped = self.company_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        tdl = TDL_BALANCE_SHEET.replace("{escaped_company}", escaped).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
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
                            'subAmount': None,
                            'mainAmount': None,
                            'financialYear': self.financial_year
                        }
                elif child.tag == 'BSAMT':
                    if current_bsname is not None:
                        sub_amt_raw = child.findtext('BSSUBAMT', '')
                        main_amt_raw = child.findtext('BSMAINAMT', '')
                        
                        # Convert amounts to proper numeric format
                        current_bsname['subAmount'] = self._convert_to_numeric(sub_amt_raw)
                        current_bsname['mainAmount'] = self._convert_to_numeric(main_amt_raw)
                        parsed_data.append(current_bsname)
                        current_bsname = None
            
            if parsed_data:
                print(f"Parsed {len(parsed_data)} balance sheet entries")
                return self._post_to_backend("/reports/balancesheet/sync", parsed_data, "Balance Sheet")
            else:
                print("No Balance Sheet data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Balance Sheet: {e}")
            return False

    def fetch_and_sync_profit_loss(self):
        print(f"\n--- Syncing Profit and Loss ---")
        escaped = self.company_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        tdl = TDL_PROFIT_LOSS.replace("{escaped_company}", escaped).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
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
            elements = list(root)
            i = 0
            
            while i < len(elements):
                elem = elements[i]
                
                if elem.tag == 'DSPACCNAME':
                    # Parse top-level or group header
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
                        'subAmount': None,
                        'mainAmount': None,
                        'financialYear': self.financial_year
                    }
                    
                    # Check if next element is PLAMT (amount for this group/account)
                    if i + 1 < len(elements) and elements[i + 1].tag == 'PLAMT':
                        amount_elem = elements[i + 1]
                        # Try PLSUBAMT and PLMAINAMT
                        sub_amt = amount_elem.findtext('PLSUBAMT', '').strip()
                        main_amt = amount_elem.findtext('PLMAINAMT', '').strip()
                        if not main_amt:
                            main_amt = amount_elem.findtext('BSMAINAMT', '').strip() # Fallback just in case
                        
                        account_data['subAmount'] = self._convert_to_numeric(sub_amt)
                        account_data['mainAmount'] = self._convert_to_numeric(main_amt)
                        i += 1  # Skip the PLAMT element
                    
                    parsed_data.append(account_data)
                    
                elif elem.tag == 'BSNAME':
                    # Parse child account entry (nested structure)
                    dspaccname = elem.find('DSPACCNAME')
                    if dspaccname is not None:
                        name = dspaccname.findtext('DSPDISPNAME', '')
                        guid = dspaccname.findtext('GUID', '')
                        is_group = dspaccname.findtext('ISGROUP', '')
                        parent_grp = dspaccname.findtext('PARENTGRP', '')
                        
                        # Clean up parent group
                        if parent_grp and '&#' in parent_grp:
                            parent_grp = parent_grp.replace('&#4;', '').strip()
                        
                        account_data = {
                            'name': name,
                            'cmp_id': self.cmp_id,
                            'guid': guid if guid else '',
                            'isGroup': is_group,
                            'parentGroup': parent_grp,
                            'subAmount': None,
                            'mainAmount': None,
                            'financialYear': self.financial_year
                        }
                        
                        # Look for BSAMT in next sibling element
                        if i + 1 < len(elements) and elements[i + 1].tag == 'BSAMT':
                            bsamt = elements[i + 1]
                            sub_amt = bsamt.findtext('BSSUBAMT', '').strip() if bsamt.findtext('BSSUBAMT', '') else ''
                            main_amt = bsamt.findtext('BSMAINAMT', '').strip() if bsamt.findtext('BSMAINAMT', '') else ''
                            account_data['subAmount'] = self._convert_to_numeric(sub_amt)
                            account_data['mainAmount'] = self._convert_to_numeric(main_amt)
                            i += 1  # Skip the BSAMT sibling element
                        
                        parsed_data.append(account_data)
                
                i += 1
            
            if parsed_data:
                print(f"Parsed {len(parsed_data)} Profit & Loss records")
                return self._post_to_backend("/reports/profitloss/sync", parsed_data, "Profit and Loss")
            else:
                print("No Profit and Loss data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Profit and Loss: {e}")
            import traceback
            traceback.print_exc()
            return False

    def fetch_and_sync_trial_balance(self):
        print(f"\n--- Syncing Trial Balance ---")
        escaped = self.company_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        tdl = TDL_TRIAL_BALANCE.replace("{escaped_company}", escaped).replace("{from_date}", self.from_date).replace("{to_date}", self.to_date)
        
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
            elements = list(root)
            i = 0
            
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
                        'debitAmount': None,
                        'creditAmount': None,
                        'financialYear': self.financial_year
                    }
                    
                    # Check if next element is DSPACCINFO (amounts for this account)
                    if i + 1 < len(elements) and elements[i + 1].tag == 'DSPACCINFO':
                        info_elem = elements[i + 1]
                        
                        # Extract debit amount
                        debit_amt_node = info_elem.find('DSPCLDRAMT')
                        if debit_amt_node is not None:
                            # Try DSPCLDRAMTA first, then the node text itself
                            debit_amt = debit_amt_node.findtext('DSPCLDRAMTA', '').strip()
                            if not debit_amt:
                                debit_amt = (debit_amt_node.text or '').strip()
                            account_data['debitAmount'] = self._convert_to_numeric(debit_amt)
                        
                        # Extract credit amount
                        credit_amt_node = info_elem.find('DSPCLCRAMT')
                        if credit_amt_node is not None:
                            # Try DSPCLCRAMTA first, then the node text itself
                            credit_amt = credit_amt_node.findtext('DSPCLCRAMTA', '').strip()
                            if not credit_amt:
                                credit_amt = (credit_amt_node.text or '').strip()
                            account_data['creditAmount'] = self._convert_to_numeric(credit_amt)
                        
                        i += 1  # Skip the DSPACCINFO element
                    
                    parsed_data.append(account_data)
                
                i += 1
            
            if parsed_data:
                print(f"Parsed {len(parsed_data)} Trial Balance records")
                return self._post_to_backend("/reports/trailbalance/sync", parsed_data, "Trial Balance")
            else:
                print("No Trial Balance data parsed.")
                return True
                
        except Exception as e:
            print(f"Error processing Trial Balance: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _stamp_reports_freshness(self):
        """Record the current voucher max AlterID as the version these reports were
        built against, so clients can flag the reports as stale when newer vouchers
        arrive. Best-effort: never fails the sync."""
        import requests
        try:
            # Current voucher max AlterID from the master-mapping endpoint.
            mm = requests.get(f"{self.backend_url}/companies/{self.cmp_id}/master-mapping",
                              headers=self.headers, timeout=15)
            voucher_alter_id = 0
            if mm.status_code == 200:
                voucher_alter_id = (mm.json().get('masters', {}) or {}).get('voucher', 0) or 0

            resp = requests.post(f"{self.backend_url}/companies/{self.cmp_id}/reports-stamp",
                                 json={'voucherAlterId': voucher_alter_id},
                                 headers=self.headers, timeout=15)
            if resp.status_code == 200:
                print(f"🕒 Stamped reports freshness at voucher AlterID {voucher_alter_id}")
            else:
                print(f"⚠️ Could not stamp reports freshness: HTTP {resp.status_code}")
        except Exception as e:
            print(f"⚠️ Reports freshness stamp skipped: {e}")

    def verify_tally_company(self):
        """Strictly verify the target company is open in Tally before pulling
        reports. Tally silently serves the ACTIVE company's data when the named
        SVCURRENTCOMPANY isn't loaded — which would store the wrong company's
        financials under this company's ID. On an exact match we adopt Tally's
        exact name (casing/spacing) for the report requests.

        Returns: (is_loaded: bool, companies: list[str])
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
        try:
            resp = requests.post(self.tally_url, data=xml_req.encode('utf-8'),
                                 headers={'Content-Type': 'application/xml'}, timeout=10)
            if resp.status_code != 200:
                print(f"[WARN] Could not verify Tally companies (HTTP {resp.status_code}); proceeding")
                return True, []
            root = ET.fromstring(self._clean_xml(resp.text))
            companies = []
            for elem in root.iter('COMPANY'):
                name = elem.findtext('NAME') or elem.get('NAME', '')
                if name and name.strip() not in companies:
                    companies.append(name.strip())
            if not companies:
                print("[WARN] Could not parse Tally company list; proceeding")
                return True, []
            expected_lower = self.company_name.strip().lower()
            # STRICT exact match only — a partial match would let Tally serve the
            # active company's reports under the wrong company ID.
            for company in companies:
                if company.strip().lower() == expected_lower:
                    self.company_name = company  # adopt Tally's exact name
                    print(f"[OK] Company '{company}' is loaded in Tally")
                    return True, companies
            print(f"[ERROR] Company '{self.company_name}' is NOT loaded in Tally. Loaded: {companies}")
            return False, companies
        except requests.exceptions.ConnectionError:
            print(f"[ERROR] Cannot connect to Tally at {self.tally_url}")
            return False, []
        except Exception as e:
            print(f"[WARN] Error verifying Tally company: {e}; proceeding")
            return True, []

    def sync_all(self, report_type=None):
        # Pre-flight: ensure the correct company is loaded in Tally, else we'd
        # persist the active company's financials under this company's ID.
        is_loaded, loaded = self.verify_tally_company()
        if not is_loaded:
            msg = (f"Company '{self.company_name}' is not loaded in Tally. "
                   f"Loaded: {loaded}. Aborting to prevent data mismatch.")
            print(msg)
            return {'success': False, 'message': msg, 'details': {}}

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
        
        # Stamp report freshness when at least one report synced successfully.
        if result.get('success') or any(result.get('details', {}).values()):
            self._stamp_reports_freshness()

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
    # Mandatory: the report TDLs are scoped via SVCURRENTCOMPANY, so a blank name
    # would export the active Tally company's financials into the wrong record.
    if not company_name or company_name.strip() == '' or company_name == 'None':
        print(json.dumps({'success': False, 'message': 'Company name is required — refusing to sync the active Tally company'}))
        sys.exit(1)
    cmp_id = sys.argv[2]
    user_id = sys.argv[3]
    from_date = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'None' else None
    to_date = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != 'None' else None
    tally_port = sys.argv[6] if len(sys.argv) > 6 else "9000"
    backend_url = sys.argv[7] if len(sys.argv) > 7 else BACKEND_URL_DEFAULT
    # SECURITY: prefer secrets from environment (Electron passes them via env, not
    # argv, so they don't leak into process listings). Fall back to positional args.
    import os as _os
    auth_token = _os.environ.get('TALLY_AUTH_TOKEN') or (
        sys.argv[8] if len(sys.argv) > 8 and sys.argv[8] != 'None' else None)
    device_token = _os.environ.get('TALLY_DEVICE_TOKEN') or (
        sys.argv[9] if len(sys.argv) > 9 and sys.argv[9] != 'None' else None)
    report_type = sys.argv[10] if len(sys.argv) > 10 else None
    financial_year = sys.argv[11] if len(sys.argv) > 11 and sys.argv[11] != 'None' else None
    
    syncer = FinancialReportSync(
        company_name=company_name,
        cmp_id=cmp_id,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        tally_port=tally_port,
        backend_url=backend_url,
        auth_token=auth_token,
        device_token=device_token,
        financial_year=financial_year
    )
    
    syncer.sync_all(report_type)

if __name__ == "__main__":
    main()
