import requests
import xml.etree.ElementTree as ET
import sys
import re

TALLY_URL = "http://localhost:9000"
BACKEND_URL = "http:// 35.175.182.24:8080/api"

TDL_REQUEST = """<ENVELOPE>
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
				<SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
				<SVFROMDATE TYPE='Date'>20250401</SVFROMDATE>
				<SVTODATE TYPE='Date'>20260331</SVTODATE>
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

def fetch_and_parse(cmp_id=1):
    print(f"Sending Balance Sheet request to Tally at {TALLY_URL}...")
    try:
        response = requests.post(TALLY_URL, data=TDL_REQUEST.encode('utf-8'), timeout=60)
        if response.status_code != 200:
            print(f"Failed to connect to Tally. Status Code: {response.status_code}")
            return
            
        xml_text = response.text
        if "DSPACCNAME" not in xml_text:
            print("Invalid response from Tally. It may not have exported properly.")
            print(xml_text[:500])
            return
            
        # Sanitize invalid XML characters like &#4; that Tally sends
        xml_text = re.sub(r'&#x?[0-9a-fA-F]+;', '', xml_text)
        
        print("Response received. Parsing XML...")
        root = ET.fromstring(xml_text)
        
        parsed_data = []
        
        # In Tally Balance Sheet XML, BSNAME and BSAMT tags are sequential siblings
        # We will iterate over all children of ENVELOPE
        
        current_bsname = None
        
        for child in root:
            if child.tag == 'BSNAME':
                dsp_accname = child.find('DSPACCNAME')
                if dsp_accname is not None:
                    name = dsp_accname.findtext('DSPDISPNAME', '')
                    guid = dsp_accname.findtext('GUID', '')
                    is_group = dsp_accname.findtext('ISGROUP', '')
                    parent_grp = dsp_accname.findtext('PARENTGRP', '')
                    
                    # Clean special characters in parent_grp (like &#4; Primary -> Primary)
                    if parent_grp and 'Primary' in parent_grp:
                        parent_grp = 'Primary'
                        
                    current_bsname = {
                        'name': name,
                        'cmp_id': int(cmp_id),
                        'guid': guid,
                        'isGroup': is_group,
                        'parentGroup': parent_grp,
                        'subAmount': '',
                        'mainAmount': ''
                    }
            elif child.tag == 'BSAMT':
                if current_bsname is not None:
                    sub_amt = child.findtext('BSSUBAMT', '')
                    main_amt = child.findtext('BSMAINAMT', '')
                    
                    current_bsname['subAmount'] = sub_amt
                    current_bsname['mainAmount'] = main_amt
                    
                    parsed_data.append(current_bsname)
                    current_bsname = None # Reset for next
                    
        print(f"Successfully parsed {len(parsed_data)} items.")
        
        # Save to database directly
        if parsed_data:
            sync_url = f"{BACKEND_URL}/reports/balancesheet/sync"
            print(f"Syncing data to backend at {sync_url}...")
            # We don't need auth token if security checks are disabled or mocked for test
            # If token is needed, we would add it here
            headers = {'Content-Type': 'application/json'}
            # We assume user id 1 / cmp id 1 for test scripts as previously discussed
            try:
                sync_resp = requests.post(sync_url, json=parsed_data, headers=headers, timeout=30)
                if sync_resp.status_code in [200, 201]:
                    print("✓ Balance Sheet successfully synced to database")
                else:
                    print(f"✗ Failed to sync to database. Status: {sync_resp.status_code}, Error: {sync_resp.text}")
            except requests.exceptions.RequestException as e:
                print(f"Backend connection error: {e}")
        else:
            print("No data parsed to export.")
            
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")
    except ET.ParseError as e:
        print(f"XML Parsing error: {e}")
        
if __name__ == "__main__":
    cmp_id = sys.argv[1] if len(sys.argv) > 1 else 1
    fetch_and_parse(cmp_id)
