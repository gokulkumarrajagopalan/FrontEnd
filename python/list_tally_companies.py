"""
Quick script to list all companies in Tally
"""
import requests
import xml.etree.ElementTree as ET

def list_companies():
    """List all companies from Tally"""
    
    tdl = """<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>All Companies</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="All Companies">
                        <TYPE>Company</TYPE>
                        <FETCH>NAME, GUID</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    try:
        url = "http://localhost:9000"
        print(f"Connecting to Tally at {url}...")
        
        response = requests.post(
            url,
            data=tdl,
            headers={'Content-Type': 'application/xml'},
            timeout=10
        )
        
        if response.status_code == 200:
            print("\n✅ Connected to Tally successfully!\n")
            
            root = ET.fromstring(response.text)
            companies = []
            
            for company in root.iter('COMPANY'):
                name_elem = company.find('NAME')
                if name_elem is not None and name_elem.text:
                    companies.append(name_elem.text.strip())
            
            print(f"📋 Found {len(companies)} companies:\n")
            for idx, company in enumerate(companies, 1):
                print(f"{idx}. {company}")
            
            return companies
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            return []
    
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Tally. Make sure:")
        print("   1. Tally is running")
        print("   2. ODBC/HTTP is enabled in Tally (F12)")
        print("   3. Port 9000 is accessible")
        return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

if __name__ == '__main__':
    list_companies()
