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
		<ID>My Profit and Loss</ID>
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
					<REPORT NAME='My Profit and Loss' ISMODIFY='No' ISFIXED='No' ISINITIALIZE='No' ISOPTION='No' ISINTERNAL='No'>
						<VARIABLE>SVEXPORTFORMAT,SVCURRENTCOMPANY,SVFROMDATE,SVTODATE,ReportTitle,ReportSubTitle</VARIABLE>
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

def fetch_and_parse(cmp_id=1):
    print(f"Sending Profit and Loss request to Tally at {TALLY_URL}...")
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
        current_name_obj = None
        
        for child in root:
            if child.tag == 'DSPACCNAME':
                name = child.findtext('DSPDISPNAME', '')
                guid = child.findtext('GUID', '')
                is_group = child.findtext('ISGROUP', '')
                parent_grp = child.findtext('PARENTGRP', '')
                
                # Clean special characters in parent_grp
                if parent_grp and 'Primary' in parent_grp:
                    parent_grp = 'Primary'
                    
                current_name_obj = {
                    'name': name,
                    'cmp_id': int(cmp_id),
                    'guid': guid,
                    'isGroup': is_group,
                    'parentGroup': parent_grp,
                    'subAmount': '',
                    'mainAmount': ''
                }
            elif child.tag == 'PLAMT':
                if current_name_obj is not None:
                    sub_amt = child.findtext('PLSUBAMT', '')
                    main_amt = child.findtext('BSMAINAMT', '') # Tally usually uses BSMAINAMT here even for PL
                    
                    # Some lines (like net profit) might use PLMAINAMT instead depending on Tally version, handle both
                    if not main_amt:
                        main_amt = child.findtext('PLMAINAMT', '')
                        
                    current_name_obj['subAmount'] = sub_amt
                    current_name_obj['mainAmount'] = main_amt
                    
                    parsed_data.append(current_name_obj)
                    current_name_obj = None # Reset for next
                    
        print(f"Successfully parsed {len(parsed_data)} items.")
        
        # Save to database directly
        if parsed_data:
            sync_url = f"{BACKEND_URL}/reports/profitloss/sync"
            print(f"Syncing data to backend at {sync_url}...")
            headers = {'Content-Type': 'application/json'}
            try:
                sync_resp = requests.post(sync_url, json=parsed_data, headers=headers, timeout=30)
                if sync_resp.status_code in [200, 201]:
                    print("✓ Profit and Loss successfully synced to database")
                else:
                    print(f"✗ Failed to sync to database. Status: {sync_resp.status_code}, Error: {sync_resp.text}")
            except requests.exceptions.RequestException as e:
                print(f"Backend connection error: {e}")
        else:
            print("No data parsed to export. Check if Tally has data for this period.")
            
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")
    except ET.ParseError as e:
        print(f"XML Parsing error: {e}")
        print("Raw XML snippet (first 1000 chars):", xml_text[:1000])

if __name__ == "__main__":
    cmp_id = sys.argv[1] if len(sys.argv) > 1 else 1
    fetch_and_parse(cmp_id)
