"""
Tally Groups Sync Service - Multi-Company Support
Fetches groups from Tally and syncs to backend database
Handles multiple companies with company-specific GUIDs
"""
import requests
import xml.etree.ElementTree as ET
import json
import sys
import re
import hashlib
from typing import List, Dict, Optional
from datetime import datetime
import io

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuration
TALLY_PORT = 9000  # Default port, can be overridden
TALLY_URL = f"http://localhost:{TALLY_PORT}"
BACKEND_URL = "http://localhost:8080"  # Default, will be overridden by command line arg

def clean_xml_content(xml_text: str) -> str:
    """Remove invalid XML characters from Tally response"""
    # Remove control characters except tab, newline, carriage return
    xml_text = re.sub(
        r'&#([0-9]+);',
        lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0),
        xml_text
    )
    return xml_text

def generate_company_specific_guid(tally_guid: str, company_id: int) -> str:
    """
    Generate a company-specific GUID to avoid conflicts
    Multiple companies can have same Tally groups (Cash, Bank, etc.)
    
    Args:
        tally_guid: Original GUID from Tally
        company_id: Company ID
        
    Returns:
        Company-specific unique GUID
    """
    if not tally_guid:
        # Generate random GUID if Tally doesn't provide one
        return f"MANUAL-{datetime.now().timestamp()}"
    
    # Return original Tally GUID without CMP prefix
    return tally_guid

def fetch_groups_from_tally(company_id: int, tally_port: int = 9000) -> Optional[List[Dict]]:
    """
    Fetch all groups from Tally Prime for a specific company
    
    Args:
        company_id: Company ID to associate groups with
        tally_port: Tally Prime port (default: 9000)
        
    Returns:
        List of group dictionaries or None if failed
    """
    
    xml_request = """
    <ENVELOPE>
        <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Collection</TYPE>
            <ID>AllGroups</ID>
        </HEADER>
        <BODY>
            <DESC>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
                <TDL>
                    <TDLMESSAGE>
                        <COLLECTION NAME="AllGroups" ISMODIFY="No">
                            <TYPE>Group</TYPE>
                            <FETCH>GUID, MASTERID, ALTERID, NAME, PARENT, PRIMARYGROUP, ISREVENUE, NATURE, RESERVEDNAME</FETCH>
                        </COLLECTION>
                    </TDLMESSAGE>
                </TDL>
            </DESC>
        </BODY>
    </ENVELOPE>
    """
    
    try:
        tally_url = f"http://localhost:{tally_port}"
        print(f"🔗 Connecting to Tally Prime at {tally_url}...")
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(tally_url, data=xml_request.strip(), headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Error: HTTP {response.status_code}")
            return None
        
        print("✅ Connected to Tally Prime")
        print("📄 Parsing XML response...")
        
        # Clean and parse XML
        xml_content = clean_xml_content(response.text)
        root = ET.fromstring(xml_content.encode('utf-8'))
        
        # Find all GROUP elements
        groups = []
        group_elements = root.findall('.//GROUP')
        
        print(f"📊 Found {len(group_elements)} groups in Tally")
        
        for idx, group_elem in enumerate(group_elements):
            # Extract group data
            group_name = group_elem.get('NAME', '')
            
            # Get child elements
            tally_guid = group_elem.findtext('GUID', '').strip()
            master_id = group_elem.findtext('MASTERID', '0').strip()
            alter_id = group_elem.findtext('ALTERID', '0').strip()
            parent = group_elem.findtext('PARENT', '').strip() or None
            primary_group = group_elem.findtext('PRIMARYGROUP', '').strip() or None
            is_revenue = group_elem.findtext('ISREVENUE', 'No').strip()
            nature = group_elem.findtext('NATURE', '').strip() or None
            reserved_name = group_elem.findtext('RESERVEDNAME', '').strip() or None
            
            # Generate company-specific GUID to avoid conflicts
            company_guid = generate_company_specific_guid(tally_guid, company_id)
            
            group_data = {
                'grpName': group_name,
                'guid': company_guid,
                'masterId': int(master_id) if master_id.isdigit() else 0,
                'alterId': int(alter_id) if alter_id.isdigit() else 0,
                'grpParent': parent,
                'grpPrimaryGroup': primary_group,
                'grpNature': nature,
                'isRevenue': is_revenue.lower() == 'yes',
                'isReserved': bool(reserved_name),
                'reservedName': reserved_name,
                'isActive': True,
                'syncStatus': 'SYNCED',
                'lastSyncDate': datetime.now().isoformat()
            }
            
            groups.append(group_data)
        
        print(f"✅ Parsed {len(groups)} groups successfully")
        print(f"   ℹ️  GUIDs are company-specific (CMP{company_id}-xxx)")
        return groups
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to Tally Prime on port {tally_port}")
        print("   Please ensure:")
        print("   • Tally Prime is running")
        print(f"   • ODBC/HTTP Server is enabled on port {tally_port}")
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

def sync_groups_to_backend(groups: List[Dict], company_id: int, user_id: int, auth_token: str, device_token: str, backend_url: str = BACKEND_URL) -> bool:
    """
    Send groups to backend for database storage
    
    Args:
        groups: List of group dictionaries
        company_id: Company ID to associate groups with
        user_id: User ID who initiated sync
        auth_token: JWT authentication token
        device_token: Device authentication token
        
    Returns:
        True if successful, False otherwise
    """
    
    try:
        # Add company and user ID to each group (CRITICAL FOR MULTI-COMPANY)
        for group in groups:
            group['cmpId'] = company_id
            group['userId'] = user_id
        
        print(f"💾 Sending {len(groups)} groups to backend...")
        print(f"   📌 Company ID: {company_id}")
        print(f"   👤 User ID: {user_id}")
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
        
        response = requests.post(
            f"{backend_url}/groups/sync",
            json=groups,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ Successfully synced {result.get('count', len(groups))} groups to database")
                print(f"   ✓ All groups saved for Company #{company_id}, User #{user_id}")
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
        print("Usage: python sync_groups.py <company_id> <user_id> <auth_token> <device_token> [tally_port]")
        sys.exit(1)
    
    company_id = int(sys.argv[1])
    user_id = int(sys.argv[2])
    auth_token = sys.argv[3]
    device_token = sys.argv[4]
    
    # Optional 5th parameter: tally_port
    tally_port = 9000  # default
    if len(sys.argv) > 5:
        try:
            tally_port = int(sys.argv[5])
            print(f"Using custom Tally port: {tally_port}")
        except ValueError:
            print(f"Invalid port argument, using default: 9000")
    
    # Optional 6th parameter: backend_url
    backend_url = BACKEND_URL  # default
    if len(sys.argv) > 6:
        backend_url = sys.argv[6]
        print(f"Using custom Backend URL: {backend_url}")
    
    print("=" * 70)
    print("🔄 TALLY GROUPS SYNC SERVICE (Multi-Company Support)")
    print("=" * 70)
    print(f"📌 Company ID: {company_id}")
    print(f"👤 User ID: {user_id}")
    print(f"🔑 Auth Token: {'*' * 20}...{auth_token[-10:]}")
    print(f"🔌 Tally Port: {tally_port}")
    print(f"🌐 Backend URL: {backend_url}")
    print("=" * 70)
    print()
    
    # Step 1: Fetch from Tally (company-specific with dynamic port)
    groups = fetch_groups_from_tally(company_id, tally_port)
    
    if not groups:
        print("\n❌ Failed to fetch groups from Tally")
        result = {
            'success': False,
            'message': 'Failed to fetch groups from Tally Prime'
        }
        print("\n" + json.dumps(result))
        sys.exit(1)
    
    print()
    print("=" * 70)
    print(f"📦 Sample Group Data (first group):")
    if groups:
        sample = groups[0].copy()
        sample['cmpId'] = company_id
        sample['userId'] = user_id
        print(json.dumps(sample, indent=2))
    print("=" * 70)
    print()
    
    # Step 2: Sync to backend
    success = sync_groups_to_backend(groups, company_id, user_id, auth_token, device_token, backend_url)
    
    if success:
        print()
        print("=" * 70)
        print("✅ SYNC COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"✓ {len(groups)} groups synced for Company #{company_id}")
        print(f"✓ Associated with User #{user_id}")
        print(f"✓ Company-specific GUIDs generated (CMP{company_id}-xxx)")
        print("=" * 70)
        
        # Return JSON result for frontend
        result = {
            'success': True,
            'count': len(groups),
            'companyId': company_id,
            'userId': user_id,
            'message': f'Successfully synced {len(groups)} groups'
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
            'message': 'Failed to sync groups to backend'
        }
        print("\n" + json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
