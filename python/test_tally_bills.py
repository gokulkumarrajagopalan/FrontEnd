import requests
import xml.etree.ElementTree as ET

tally_url = "http://localhost:9000"

def test_company(company_name):
    print(f"\n--- Testing Bills Receivable for: {company_name} ---")
    xml_req = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>Bills Receivable</REPORTNAME>
    <STATICVARIABLES>
        <SVCOMPANY>{company_name}</SVCOMPANY>
        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""
    try:
        resp = requests.post(tally_url, data=xml_req.encode('utf-8'), headers={'Content-Type': 'application/xml'}, timeout=10)
        print(f"Status: {resp.status_code}")
        # Let's count BILLFIXED elements to see how many bills we got
        root = ET.fromstring(resp.text)
        count = len(list(root.iter('BILLFIXED')))
        print(f"Number of bills returned: {count}")
        # Look for company name in the response, sometimes Tally includes it
        for elem in root.iter('COMPANYNAME'):
            print(f"COMPANYNAME in response: {elem.text}")
            
        # Try to print the first bill's party to identify which company it belongs to
        first_bill = next(root.iter('BILLFIXED'), None)
        if first_bill is not None:
            party = first_bill.findtext('BILLPARTY')
            print(f"First bill party: {party}")
    except Exception as e:
        print(f"Error: {e}")

test_company("GD India Pvt Ltd")
test_company("Talliffy Global Systems LLC")
