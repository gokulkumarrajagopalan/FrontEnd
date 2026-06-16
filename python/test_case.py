import requests
import xml.etree.ElementTree as ET

tally_url = "http://localhost:9000"

def test_company(company_name, use_svcompany, use_svcurrentcompany):
    print(f"\n--- Testing '{company_name}' (SVCOMP={use_svcompany}, SVCURR={use_svcurrentcompany}) ---")
    
    static_vars = "<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>\n"
    if use_svcompany:
        static_vars += f"        <SVCOMPANY>{company_name}</SVCOMPANY>\n"
    if use_svcurrentcompany:
        static_vars += f"        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>\n"

    xml_req = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>Bills Receivable</REPORTNAME>
    <STATICVARIABLES>
{static_vars}
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""
    try:
        resp = requests.post(tally_url, data=xml_req.encode('utf-8'), headers={'Content-Type': 'application/xml'}, timeout=10)
        root = ET.fromstring(resp.text)
        count = len(list(root.iter('BILLFIXED')))
        print(f"Number of bills returned: {count}")
    except Exception as e:
        print(f"Error: {e}")

# Test old code behavior (SVCOMP=False, SVCURR=True)
print("Testing with lowercase 'pvt' to see if case matters for SVCURRENTCOMPANY without SVCOMPANY:")
test_company("GD India pvt Ltd", False, True)

# Test new code behavior
print("Testing with lowercase 'pvt' with BOTH tags:")
test_company("GD India pvt Ltd", True, True)

