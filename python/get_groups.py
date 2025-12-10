"""
Fetch Groups data from Tally
"""
import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional

# Tally connection settings
TALLY_URL = "http://localhost:9000"

def fetch_groups_from_tally() -> Optional[List[Dict]]:
    """
    Fetch all groups from Tally
    
    Returns:
        List of group dictionaries or None if failed
    """
    
    # XML request to fetch groups
    xml_request = """
    <ENVELOPE>
        <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Collection</TYPE>
            <ID>Collection of Groups</ID>
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
                        <COLLECTION NAME="Collection of Groups" ISMODIFY="No">
                            <TYPE>Group</TYPE>
                            <FETCH>GUID,MASTERID,ALTERID,Name,OnlyAlias,Parent,IsRevenue</FETCH>
                        </COLLECTION>
                    </TDLMESSAGE>
                </TDL>
            </DESC>
        </BODY>
    </ENVELOPE>
    """
    
    try:
        # Send POST request to Tally
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(TALLY_URL, data=xml_request.strip(), headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
            return None
        
        # Clean invalid XML characters from Tally response
        xml_content = response.text
        # Replace invalid character references (control characters)
        import re
        xml_content = re.sub(r'&#([0-9]+);', lambda m: '' if int(m.group(1)) < 32 and int(m.group(1)) not in [9, 10, 13] else m.group(0), xml_content)
        
        # Parse XML response
        root = ET.fromstring(xml_content.encode('utf-8'))
        
        # Find all GROUP elements
        groups = []
        
        # Navigate to BODY -> DATA -> COLLECTION
        body = root.find('.//BODY')
        if body is None:
            print("Error: BODY element not found in response")
            return None
        
        data = body.find('DATA')
        if data is None:
            print("Error: DATA element not found in response")
            return None
        
        collection = data.find('COLLECTION')
        if collection is None:
            print("Error: COLLECTION element not found in response")
            return None
        
        # Extract all GROUP elements
        for group_elem in collection.findall('GROUP'):
            group_data = {}
            
            # Get name from attribute
            group_data['name'] = group_elem.get('NAME', 'N/A')
            
            # Extract all child elements
            for child in group_elem:
                tag = child.tag
                value = child.text if child.text else ''
                
                # Handle specific fields
                if tag == 'GUID':
                    group_data['guid'] = value.strip()
                elif tag == 'MASTERID':
                    group_data['masterId'] = value.strip()
                elif tag == 'ALTERID':
                    group_data['alterId'] = value.strip()
                elif tag == 'PARENT':
                    group_data['parent'] = value.strip()
                elif tag == 'ISREVENUE':
                    group_data['isRevenue'] = value.strip().lower() == 'yes'
                elif tag == 'ONLYALIAS':
                    group_data['alias'] = value.strip()
                else:
                    # Store any other fields as-is
                    group_data[tag.lower()] = value.strip()
            
            groups.append(group_data)
        
        return groups
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Tally. Make sure Tally is running on port 9000.")
        return None
    except requests.exceptions.Timeout:
        print("Error: Request to Tally timed out.")
        return None
    except ET.ParseError as e:
        print(f"Error parsing XML response: {e}")
        print(f"Response content: {response.text}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None


def print_groups(groups: List[Dict]):
    """
    Pretty print groups data
    
    Args:
        groups: List of group dictionaries
    """
    if not groups:
        print("No groups found.")
        return
    
    print(f"\n{'='*80}")
    print(f"Found {len(groups)} groups:")
    print(f"{'='*80}\n")
    
    for i, group in enumerate(groups, 1):
        print(f"{i}. {group.get('name', 'N/A')}")
        print(f"   GUID: {group.get('guid', 'N/A')}")
        print(f"   Master ID: {group.get('masterId', 'N/A')}")
        print(f"   Alter ID: {group.get('alterId', 'N/A')}")
        print(f"   Parent: {group.get('parent', 'Primary')}")
        print(f"   Is Revenue: {group.get('isRevenue', False)}")
        print()


def main():
    """
    Main function to fetch and display groups
    """
    print("Fetching groups from Tally...")
    print(f"Tally URL: {TALLY_URL}")
    print()
    
    groups = fetch_groups_from_tally()
    
    if groups is not None:
        print_groups(groups)
        
        # Also print as JSON for easy integration
        import json
        print(f"\n{'='*80}")
        print("JSON Output:")
        print(f"{'='*80}\n")
        print(json.dumps(groups, indent=2))
        
        return groups
    else:
        print("Failed to fetch groups from Tally.")
        return None


if __name__ == "__main__":
    main()
