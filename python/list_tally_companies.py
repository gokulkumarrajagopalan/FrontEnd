import sys
import requests
import xml.etree.ElementTree as ET

def list_companies(host='localhost', port=9000):
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
        url = f"http://{host}:{port}"
        # logger or print (keeping print as it seems to be used for stdout communication)
        # However, it's better to use logger if available, but this script is simple.
        
        response = requests.post(
            url,
            data=tdl,
            headers={'Content-Type': 'application/xml'},
            timeout=10
        )
        
        if response.status_code == 200:
            root = ET.fromstring(response.text)
            companies = []
            
            for company in root.iter('COMPANY'):
                name_elem = company.find('NAME')
                if name_elem is not None and name_elem.text:
                    companies.append(name_elem.text.strip())
            
            # Print specifically the JSON output for the handler to parse if needed, 
            # or just the names. The current JS handler likely expects a specific format.
            return companies
        else:
            return []
    
    except requests.exceptions.ConnectionError:
        return []
    except Exception as e:
        return []

if __name__ == '__main__':
    host = sys.argv[1] if len(sys.argv) > 1 else 'localhost'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 9000
    
    companies = list_companies(host, port)
    import json
    print(json.dumps(companies))

