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
        
        # Identify which company's data this actually is
        first_bill = next(root.iter('BILLFIXED'), None)
        if first_bill is not None:
            party = first_bill.findtext('BILLPARTY')
            print(f"First bill party: {party}")
    except Exception as e:
        print(f"Error: {e}")

print("Testing GD India Pvt Ltd:")
test_company("GD India Pvt Ltd", True, True)
test_company("GD India Pvt Ltd", True, False)
test_company("GD India Pvt Ltd", False, True)
test_company("GD India Pvt Ltd", False, False)

print("\nTesting Talliffy Global Systems LLC:")
test_company("Talliffy Global Systems LLC", True, True)
test_company("Talliffy Global Systems LLC", True, False)
test_company("Talliffy Global Systems LLC", False, True)
test_company("Talliffy Global Systems LLC", False, False)
