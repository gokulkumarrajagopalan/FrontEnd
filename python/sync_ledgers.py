"""
Tally Ledgers Sync Service (Multi-Company Support)
Fetches ledgers from Tally Prime via XML API and syncs to backend database
"""

import requests
import xml.etree.ElementTree as ET
import json
import sys
import re
import io
from datetime import datetime
from typing import List, Dict, Optional

# Configure UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuration
TALLY_URL = "http://localhost:9000"
BACKEND_URL = "http://localhost:8080/"

# Tally XML request template for ledgers
LEDGER_REQUEST = """
<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Collection of Ledgers</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE>
                <SVTODATE TYPE="Date">01-Jan-1970</SVTODATE>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Collection of Ledgers" ISMODIFY="No">
                        <TYPE>Ledger</TYPE>
                        <FETCH>GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, IsRevenue, LastParent, Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, LEDGERPHONE, LEDGERCOUNTRYISDCODE, LEDGERMOBILE, LEDGERCONTACT, WEBSITE, EMAIL, CURRENCYNAME, INCOMETAXNUMBER, LEDMAILINGDETAILS.*, VATAPPLICABLEDATE, VATDEALERTYPE, VATTINNUMBER, LEDGSTREGDETAILS.*</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>
"""

def clean_xml_content(xml_string: str) -> str:
    """Remove invalid XML characters and entities"""
    # Step 1: Remove invalid numeric character references (&#0; to &#31; except 9, 10, 13)
    # These are control characters that are invalid in XML
    def replace_invalid_entity(match):
        num = int(match.group(1))
        # Keep only valid XML 1.0 characters: tab(9), newline(10), carriage return(13), and >= 32
        if num in (9, 10, 13) or num >= 32:
            return match.group(0)  # Keep valid entities
        else:
            return ''  # Remove invalid entities (like &#4;)
    
    # Remove numeric entities like &#4;
    xml_string = re.sub(r'&#(\d+);', replace_invalid_entity, xml_string)
    
    # Also remove hex entities like &#x4;
    def replace_invalid_hex_entity(match):
        num = int(match.group(1), 16)
        if num in (9, 10, 13) or num >= 32:
            return match.group(0)
        else:
            return ''
    
    xml_string = re.sub(r'&#x([0-9a-fA-F]+);', replace_invalid_hex_entity, xml_string)
    
    # Step 2: Remove control characters (0x00-0x1F) except tab, newline, carriage return
    # Also remove 0x7F-0x9F range (extended control characters)
    xml_string = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_string)
    
    # Step 3: Keep only valid XML characters according to XML 1.0 spec
    # Valid: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]
    xml_string = ''.join(char for char in xml_string if ord(char) >= 0x20 or char in '\t\n\r')
    
    return xml_string

def generate_company_specific_guid(tally_guid: str, company_id: int) -> str:
    """Generate company-specific GUID or fallback to timestamp"""
    if tally_guid and tally_guid.strip():
        return tally_guid.strip()
    else:
        # Fallback for ledgers without GUID
        return f"MANUAL-{datetime.now().timestamp()}"

def fetch_ledgers_from_tally(company_id: int) -> Optional[List[Dict]]:
    """
    Fetch ledgers from Tally Prime via XML API
    
    Args:
        company_id: Company ID for GUID generation
        
    Returns:
        List of ledger dictionaries or None if error
    """
    
    try:
        print(f"🔗 Connecting to Tally Prime at {TALLY_URL}...")
        
        response = requests.post(
            TALLY_URL,
            data=LEDGER_REQUEST,
            headers={'Content-Type': 'application/xml'},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ HTTP Error: {response.status_code}")
            return None
        
        print("✅ Connected to Tally Prime")
        print("📄 Parsing XML response...")
        
        # Clean and parse XML with multiple fallback strategies
        xml_content = clean_xml_content(response.text)
        
        # Try parsing with different approaches
        root = None
        try:
            # Method 1: Direct parsing
            root = ET.fromstring(xml_content.encode('utf-8'))
            print("✅ Parsed XML successfully (Method 1)")
        except ET.ParseError as parse_err:
            print(f"⚠️  Method 1 failed: {parse_err}")
            
            try:
                # Method 2: Parse with errors ignored (using lxml if available)
                import xml.etree.ElementTree as ET2
                from io import StringIO
                
                # More aggressive cleaning
                xml_content = xml_content.replace('&#4;', '')  # Remove specific problematic entity
                xml_content = re.sub(r'&#[0-9]+;', '', xml_content)  # Remove all numeric entities
                
                root = ET2.fromstring(xml_content.encode('utf-8'))
                print("✅ Parsed XML successfully (Method 2 - aggressive cleaning)")
            except Exception as err2:
                print(f"❌ Method 2 also failed: {err2}")
                
                # Save for debugging
                debug_file = f"debug_ledgers_response_{company_id}.xml"
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(xml_content)
                print(f"   ℹ️  Saved problematic XML to: {debug_file}")
                return None
        
        if root is None:
            print("❌ All XML parsing methods failed")
            return None
        
        # Find all LEDGER elements
        ledgers = []
        ledger_elements = root.findall('.//LEDGER')
        
        print(f"📊 Found {len(ledger_elements)} ledgers in Tally")
        
        for idx, ledger_elem in enumerate(ledger_elements):
            # Extract ledger name from NAME attribute (in LEDGER tag)
            ledger_name = ledger_elem.get('NAME', '')
            
            # If NAME attribute is empty, try finding it in LANGUAGENAME.LIST/NAME.LIST/NAME
            if not ledger_name:
                name_elem = ledger_elem.find('.//LANGUAGENAME.LIST/NAME.LIST/NAME')
                if name_elem is not None and name_elem.text:
                    ledger_name = name_elem.text.strip()
            
            reserved_name = ledger_elem.get('RESERVEDNAME', '')
            
            # Debug output for first ledger
            if idx == 0:
                print(f"🔍 DEBUG: First ledger NAME = '{ledger_name}'")
            
            # Basic fields
            tally_guid = ledger_elem.findtext('GUID', '').strip()
            master_id = ledger_elem.findtext('MASTERID', '0').strip()
            alter_id = ledger_elem.findtext('ALTERID', '0').strip()
            parent = ledger_elem.findtext('PARENT', '').strip() or None
            last_parent = ledger_elem.findtext('LASTPARENT', '').strip() or None
            
            # Financial fields
            is_revenue = ledger_elem.findtext('ISREVENUE', 'No').strip()
            is_billwise_on = ledger_elem.findtext('ISBILLWISEON', 'No').strip()
            is_costcentre_on = ledger_elem.findtext('ISCOSTCENTRESON', 'No').strip()
            opening_balance = ledger_elem.findtext('OPENINGBALANCE', '0.00').strip()
            currency_name = ledger_elem.findtext('CURRENCYNAME', '').strip() or None
            
            # Description and notes
            description = ledger_elem.findtext('DESCRIPTION', '').strip() or None
            narration = ledger_elem.findtext('NARRATION', '').strip() or None
            
            # Contact details
            phone = ledger_elem.findtext('LEDGERPHONE', '').strip() or None
            mobile = ledger_elem.findtext('LEDGERMOBILE', '').strip() or None
            country_isd_code = ledger_elem.findtext('LEDGERCOUNTRYISDCODE', '').strip() or None
            contact = ledger_elem.findtext('LEDGERCONTACT', '').strip() or None
            email = ledger_elem.findtext('EMAIL', '').strip() or None
            website = ledger_elem.findtext('WEBSITE', '').strip() or None
            
            # Tax details
            income_tax_number = ledger_elem.findtext('INCOMETAXNUMBER', '').strip() or None
            
            # Mailing details
            mailing_details = ledger_elem.find('.//LEDMAILINGDETAILS.LIST')
            mailing_name = None
            address1 = None
            address2 = None
            address3 = None
            address4 = None
            state = None
            country = None
            pincode = None
            
            if mailing_details is not None:
                mailing_name = mailing_details.findtext('MAILINGNAME', '').strip() or None
                state = mailing_details.findtext('STATE', '').strip() or None
                country = mailing_details.findtext('COUNTRY', '').strip() or None
                pincode = mailing_details.findtext('PINCODE', '').strip() or None
            
            # GST details
            gst_details = ledger_elem.find('.//LEDGSTREGDETAILS.LIST')
            gst_registration_type = None
            gstin = None
            
            if gst_details is not None:
                gst_registration_type = gst_details.findtext('GSTREGISTRATIONTYPE', '').strip() or None
                gstin = gst_details.findtext('GSTIN', '').strip() or None
            
            # VAT details
            vat_applicable_date = ledger_elem.findtext('VATAPPLICABLEDATE', '').strip() or None
            vat_dealer_type = ledger_elem.findtext('VATDEALERTYPE', '').strip() or None
            vat_tin_number = ledger_elem.findtext('VATTINNUMBER', '').strip() or None
            
            # Generate company-specific GUID
            company_guid = generate_company_specific_guid(tally_guid, company_id)
            
            # Parse opening balance
            try:
                opening_balance_amount = float(opening_balance.replace(',', ''))
            except:
                opening_balance_amount = 0.00
            
            ledger_data = {
                'ledName': ledger_name,
                'guid': company_guid,
                'masterId': int(master_id) if master_id.isdigit() else 0,
                'alterId': int(alter_id) if alter_id.isdigit() else 0,
                'ledParent': parent,
                'ledPrimaryGroup': last_parent,
                'ledDescription': description,
                'ledNote': narration,
                'ledBillwiseOn': is_billwise_on.lower() == 'yes',
                'ledIsCostcentreOn': is_costcentre_on.lower() == 'yes',
                'ledMailingName': mailing_name or ledger_name,
                'ledAddress1': address1,
                'ledAddress2': address2,
                'ledAddress3': address3,
                'ledAddress4': address4,
                'ledState': state,
                'ledCountry': country,
                'ledContact': contact,
                'ledPhone': phone,
                'ledMobile': mobile,
                'ledEmail': email,
                'ledWebsite': website,
                'ledOpeningBalance': opening_balance_amount,
                'ledGstApplicable': gstin is not None,
                'ledGstRegistrationType': gst_registration_type,
                'ledGstin': gstin,
                'ledVatApplicable': vat_tin_number is not None,
                'ledVatRegistrationType': vat_dealer_type,
                'ledVatNo': vat_tin_number,
                'isRevenue': is_revenue.lower() == 'yes',
                'isReserved': bool(reserved_name),
                'reservedName': reserved_name or None,
                'currencyName': currency_name,
                'isActive': True,
                'syncStatus': 'SYNCED',
                'lastSyncDate': datetime.now().isoformat()
            }
            
            ledgers.append(ledger_data)
        
        print(f"✅ Parsed {len(ledgers)} ledgers successfully")
        return ledgers
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Tally Prime on port 9000")
        print("   Please ensure:")
        print("   • Tally Prime is running")
        print("   • ODBC/HTTP Server is enabled in Tally")
        print("   • The correct company is opened in Tally")
        return None
    except requests.exceptions.Timeout:
        print("❌ Connection to Tally Prime timed out")
        return None
    except ET.ParseError as e:
        print(f"❌ XML Parse Error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return None

def sync_ledgers_to_backend(ledgers: List[Dict], company_id: int, user_id: int, auth_token: str, device_token: str) -> bool:
    """
    Send ledgers to backend for database storage
    
    Args:
        ledgers: List of ledger dictionaries
        company_id: Company ID to associate ledgers with
        user_id: User ID who initiated sync
        auth_token: JWT authentication token
        device_token: Device authentication token
        
    Returns:
        True if successful, False otherwise
    """
    
    try:
        # Add company and user ID to each ledger (CRITICAL FOR MULTI-COMPANY)
        for ledger in ledgers:
            ledger['cmpId'] = company_id
            ledger['userId'] = user_id
        
        print(f"💾 Sending {len(ledgers)} ledgers to backend...")
        print(f"   📌 Company ID: {company_id}")
        print(f"   👤 User ID: {user_id}")
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
        
        response = requests.post(
            f"{BACKEND_URL}/ledgers/sync",
            json=ledgers,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                processed_count = result.get('totalProcessed', result.get('count', len(ledgers)))
                print(f"✅ Successfully synced {processed_count} ledgers to database")
                print(f"   ✓ All ledgers saved for Company #{company_id}, User #{user_id}")
                return True
            else:
                print(f"❌ Backend error: {result.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend at {BACKEND_URL}")
        return False
    except Exception as e:
        print(f"❌ Error syncing to backend: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main sync workflow"""
    
    # Parse command line arguments
    if len(sys.argv) < 5:
        print("Usage: python sync_ledgers.py <company_id> <user_id> <auth_token> <device_token>")
        sys.exit(1)
    
    company_id = int(sys.argv[1])
    user_id = int(sys.argv[2])
    auth_token = sys.argv[3]
    device_token = sys.argv[4]
    
    print("=" * 70)
    print("🔄 TALLY LEDGERS SYNC SERVICE (Multi-Company Support)")
    print("=" * 70)
    print(f"📌 Company ID: {company_id}")
    print(f"👤 User ID: {user_id}")
    print(f"🔑 Auth Token: {'*' * 20}...{auth_token[-10:]}")
    print("=" * 70)
    print()
    
    # Step 1: Fetch from Tally (company-specific)
    ledgers = fetch_ledgers_from_tally(company_id)
    
    if not ledgers:
        print("\n❌ Failed to fetch ledgers from Tally")
        result = {
            'success': False,
            'message': 'Failed to fetch ledgers from Tally Prime'
        }
        print("\n" + json.dumps(result))
        sys.exit(1)
    
    print()
    print("=" * 70)
    print(f"📦 Sample Ledger Data (first ledger):")
    if ledgers:
        sample = ledgers[0].copy()
        sample['cmpId'] = company_id
        sample['userId'] = user_id
        print(json.dumps(sample, indent=2))
    print("=" * 70)
    print()
    
    # Step 2: Sync to backend
    success = sync_ledgers_to_backend(ledgers, company_id, user_id, auth_token, device_token)
    
    if success:
        print()
        print("=" * 70)
        print("✅ SYNC COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"✓ {len(ledgers)} ledgers synced for Company #{company_id}")
        print(f"✓ Associated with User #{user_id}")
        print("=" * 70)
        
        # Return JSON result for frontend
        result = {
            'success': True,
            'count': len(ledgers),
            'companyId': company_id,
            'userId': user_id,
            'message': f'Successfully synced {len(ledgers)} ledgers'
        }
        print("\n" + json.dumps(result))
        sys.exit(0)
    else:
        print()
        print("=" * 70)
        print("❌ SYNC FAILED")
        print("=" * 70)
        
        result = {
            'success': False,
            'message': 'Failed to sync ledgers to backend'
        }
        print("\n" + json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
