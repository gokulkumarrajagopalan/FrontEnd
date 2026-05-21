#!/usr/bin/env python3
"""
Test script for Profit & Loss XML parsing
Uses the XML data provided by the user to validate parsing
"""
import xml.etree.ElementTree as ET
import json
import re

# XML response from Tally (user-provided)
SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
    <DSPACCNAME>
        <DSPDISPNAME>Sales Accounts</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000017</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <PLAMT>
        <PLSUBAMT></PLSUBAMT>
        <BSMAINAMT>3753486.32</BSMAINAMT>
    </PLAMT>
    <BSNAME>
        <DSPACCNAME>
            <DSPDISPNAME>Amber Vision</DSPDISPNAME>
            <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00001def</GUID>
            <ISGROUP>No</ISGROUP>
            <PARENTGRP>Sales Accounts</PARENTGRP>
        </DSPACCNAME>
    </BSNAME>
    <BSAMT>
        <BSSUBAMT>6300.00</BSSUBAMT>
        <BSMAINAMT></BSMAINAMT>
    </BSAMT>
    <BSNAME>
        <DSPACCNAME>
            <DSPDISPNAME>B2C Fleet Command Subsciption</DSPDISPNAME>
            <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000ef7</GUID>
            <ISGROUP>No</ISGROUP>
            <PARENTGRP>Sales Accounts</PARENTGRP>
        </DSPACCNAME>
    </BSNAME>
    <BSAMT>
        <BSSUBAMT>10983.81</BSSUBAMT>
        <BSMAINAMT></BSMAINAMT>
    </BSAMT>
    <DSPACCNAME>
        <DSPDISPNAME>Direct Incomes</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000019</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <PLAMT>
        <PLSUBAMT></PLSUBAMT>
        <BSMAINAMT>1560667.50</BSMAINAMT>
    </PLAMT>
    <BSNAME>
        <DSPACCNAME>
            <DSPDISPNAME>Management Fee</DSPDISPNAME>
            <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00001e8a</GUID>
            <ISGROUP>No</ISGROUP>
            <PARENTGRP>Direct Incomes</PARENTGRP>
        </DSPACCNAME>
    </BSNAME>
    <BSAMT>
        <BSSUBAMT>346815.00</BSSUBAMT>
        <BSMAINAMT></BSMAINAMT>
    </BSAMT>
    <DSPACCNAME>
        <DSPDISPNAME>Indirect Expense</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-0000001c</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <PLAMT>
        <PLSUBAMT></PLSUBAMT>
        <BSMAINAMT>-4652135.93</BSMAINAMT>
    </PLAMT>
</ENVELOPE>"""


def clean_xml(xml_text):
    """Clean invalid XML characters"""
    # Remove specific invalid character &#4; and similar
    xml_text = re.sub(r'&#4;', '', xml_text)
    xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)
    return xml_text


def parse_profit_loss(xml_text, cmp_id=1):
    """Parse Profit & Loss XML"""
    # Clean XML before parsing to remove invalid characters like &#4;
    xml_text = re.sub(r'&#4;', '', xml_text)  # Remove &#4; specifically
    xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)  # Remove other invalid chars
    root = ET.fromstring(xml_text)
    parsed_data = []
    elements = list(root)
    i = 0
    
    while i < len(elements):
        elem = elements[i]
        
        if elem.tag == 'DSPACCNAME':
            # Parse top-level or group header
            name = elem.findtext('DSPDISPNAME', '')
            guid = elem.findtext('GUID', '')
            is_group = elem.findtext('ISGROUP', '')
            parent_grp = elem.findtext('PARENTGRP', '')
            
            # Clean up parent group
            if parent_grp and '&#' in parent_grp:
                parent_grp = parent_grp.replace('&#4;', '').strip()
            if parent_grp and 'Primary' in parent_grp:
                parent_grp = 'Primary'
            
            account_data = {
                'name': name,
                'cmp_id': cmp_id,
                'guid': guid if guid else '',
                'isGroup': is_group,
                'parentGroup': parent_grp,
                'subAmount': '',
                'mainAmount': ''
            }
            
            # Check if next element is PLAMT (amount for this group/account)
            if i + 1 < len(elements) and elements[i + 1].tag == 'PLAMT':
                amount_elem = elements[i + 1]
                sub_amt = amount_elem.findtext('PLSUBAMT', '').strip() if amount_elem.findtext('PLSUBAMT', '') else ''
                main_amt = amount_elem.findtext('BSMAINAMT', '').strip() if amount_elem.findtext('BSMAINAMT', '') else ''
                account_data['subAmount'] = sub_amt
                account_data['mainAmount'] = main_amt
                i += 1  # Skip the PLAMT element
            
            parsed_data.append(account_data)
            
        elif elem.tag == 'BSNAME':
            # Parse child account entry
            dspaccname = elem.find('DSPACCNAME')
            if dspaccname is not None:
                name = dspaccname.findtext('DSPDISPNAME', '')
                guid = dspaccname.findtext('GUID', '')
                is_group = dspaccname.findtext('ISGROUP', '')
                parent_grp = dspaccname.findtext('PARENTGRP', '')
                
                account_data = {
                    'name': name,
                    'cmp_id': cmp_id,
                    'guid': guid if guid else '',
                    'isGroup': is_group,
                    'parentGroup': parent_grp,
                    'subAmount': '',
                    'mainAmount': ''
                }
                
                # Look for BSAMT in next sibling element
                if i + 1 < len(elements) and elements[i + 1].tag == 'BSAMT':
                    bsamt = elements[i + 1]
                    account_data['subAmount'] = bsamt.findtext('BSSUBAMT', '').strip() if bsamt.findtext('BSSUBAMT', '') else ''
                    account_data['mainAmount'] = bsamt.findtext('BSMAINAMT', '').strip() if bsamt.findtext('BSMAINAMT', '') else ''
                    i += 1  # Skip the BSAMT sibling element
                
                parsed_data.append(account_data)
        
        i += 1
    
    return parsed_data


def print_summary(data):
    """Print summary of parsed data"""
    print("\n" + "="*100)
    print("PARSED PROFIT & LOSS DATA - SUMMARY")
    print("="*100)
    
    groups = [r for r in data if r['isGroup'] == 'Yes']
    accounts = [r for r in data if r['isGroup'] != 'Yes']
    
    print(f"\nTotal Records: {len(data)}")
    print(f"  - Parent Groups: {len(groups)}")
    print(f"  - Child Accounts: {len(accounts)}")
    
    # Group by parent
    parent_groups = {}
    for record in data:
        pg = record['parentGroup']
        if pg not in parent_groups:
            parent_groups[pg] = []
        parent_groups[pg].append(record)
    
    print(f"\nBy Parent Group:")
    for parent, records in sorted(parent_groups.items()):
        print(f"\n  📁 {parent}")
        for rec in records:
            indent = "    " if rec['isGroup'] == 'No' else "  "
            mark = "📄" if rec['isGroup'] == 'No' else "📂"
            main_amt = f"Rs. {rec['mainAmount']:>12}" if rec['mainAmount'] else "         -"
            print(f"{indent}{mark} {rec['name']:<45} | Main: {main_amt}")


def export_to_json(data, filename="profit_loss_parsed.json"):
    """Export parsed data to JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n✓ Exported to {filename}")


if __name__ == "__main__":
    print("Testing Profit & Loss XML Parser...")
    print("-" * 100)
    
    try:
        # Parse the sample XML
        parsed_data = parse_profit_loss(SAMPLE_XML)
        
        # Print results
        print_summary(parsed_data)
        
        # Export to JSON
        export_to_json(parsed_data)
        
        # Print detailed data
        print("\n" + "="*100)
        print("DETAILED RECORD VIEW")
        print("="*100)
        for i, record in enumerate(parsed_data, 1):
            print(f"\n{i}. {record['name']}")
            print(f"   GUID: {record['guid']}")
            print(f"   Is Group: {record['isGroup']}")
            print(f"   Parent Group: {record['parentGroup']}")
            print(f"   Sub Amount: {record['subAmount']}")
            print(f"   Main Amount: {record['mainAmount']}")
        
        print("\n✓ Test completed successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
