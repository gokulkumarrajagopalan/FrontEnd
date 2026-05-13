#!/usr/bin/env python3
"""
Test script for Trial Balance XML parsing
Uses the XML data provided by the user to validate parsing
"""
import xml.etree.ElementTree as ET
import json
import re

# Sample XML from user (abbreviated for testing)
SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
    <DSPACCNAME>
        <DSPDISPNAME>Capital Account</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000001</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA></DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>303613.17</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Capital Account</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00001e01</GUID>
        <ISGROUP>No</ISGROUP>
        <PARENTGRP>Capital Account</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA></DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>300000.00</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Retained Earings</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00001db2</GUID>
        <ISGROUP>No</ISGROUP>
        <PARENTGRP>Capital Account</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA></DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>3613.17</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Loans (Liability)</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000002</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA></DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>885785.00</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Current Liabilities</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000003</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-59032.84</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>598617.28</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Fixed Assets</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000004</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-964600.98</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>21987.00</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Current Assets</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000006</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-1525575.54</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>107292.35</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Sales Accounts</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000017</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-49951.45</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>2069064.83</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Purchase Accounts</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000018</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-596560.83</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>494085.33</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Direct Incomes</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-00000019</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA></DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>1213852.50</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Direct Expenses</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-0000001a</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-453332.00</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA></DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Indirect Expense</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-0000001c</GUID>
        <ISGROUP>Yes</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-2229890.41</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA>7479.86</DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
    <DSPACCNAME>
        <DSPDISPNAME>Profit &amp; Loss A/c</DSPDISPNAME>
        <GUID>b8ff75ff-2077-4339-9a20-33df86b31660-0000001e</GUID>
        <ISGROUP>No</ISGROUP>
        <PARENTGRP>&#4; Primary</PARENTGRP>
    </DSPACCNAME>
    <DSPACCINFO>
        <DSPCLDRAMT>
            <DSPCLDRAMTA>-888031.85</DSPCLDRAMTA>
        </DSPCLDRAMT>
        <DSPCLCRAMT>
            <DSPCLCRAMTA></DSPCLCRAMTA>
        </DSPCLCRAMT>
    </DSPACCINFO>
</ENVELOPE>"""


def clean_xml(xml_text):
    """Clean invalid XML characters"""
    xml_text = re.sub(r'&#4;', '', xml_text)
    xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)
    return xml_text


def parse_trial_balance(xml_text, cmp_id=1):
    """Parse Trial Balance XML"""
    xml_text = clean_xml(xml_text)
    root = ET.fromstring(xml_text)
    parsed_data = []
    elements = list(root)
    i = 0
    
    while i < len(elements):
        elem = elements[i]
        
        if elem.tag == 'DSPACCNAME':
            # Parse account header
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
                'debitAmount': '',
                'creditAmount': ''
            }
            
            # Check if next element is DSPACCINFO
            if i + 1 < len(elements) and elements[i + 1].tag == 'DSPACCINFO':
                info_elem = elements[i + 1]
                
                # Extract debit amount
                debit_amt_node = info_elem.find('DSPCLDRAMT')
                if debit_amt_node is not None:
                    debit_amt = debit_amt_node.findtext('DSPCLDRAMTA', '').strip() if debit_amt_node.findtext('DSPCLDRAMTA', '') else ''
                    account_data['debitAmount'] = debit_amt
                
                # Extract credit amount
                credit_amt_node = info_elem.find('DSPCLCRAMT')
                if credit_amt_node is not None:
                    credit_amt = credit_amt_node.findtext('DSPCLCRAMTA', '').strip() if credit_amt_node.findtext('DSPCLCRAMTA', '') else ''
                    account_data['creditAmount'] = credit_amt
                
                i += 1  # Skip DSPACCINFO
            
            parsed_data.append(account_data)
        
        i += 1
    
    return parsed_data


def print_summary(data):
    """Print summary of parsed data"""
    print("\n" + "="*120)
    print("PARSED TRIAL BALANCE DATA - SUMMARY")
    print("="*120)
    
    groups = [r for r in data if r['isGroup'] == 'Yes']
    accounts = [r for r in data if r['isGroup'] != 'Yes']
    
    total_debits = 0
    total_credits = 0
    parent_distribution = {}
    
    print(f"\nTotal Records: {len(data)}")
    print(f"  - Groups: {len(groups)}")
    print(f"  - Accounts: {len(accounts)}")
    
    # Calculate totals and parent distribution
    for record in data:
        pg = record['parentGroup']
        if pg not in parent_distribution:
            parent_distribution[pg] = {'count': 0, 'debit': 0, 'credit': 0}
        parent_distribution[pg]['count'] += 1
        
        try:
            if record['debitAmount']:
                total_debits += float(record['debitAmount'])
                parent_distribution[pg]['debit'] += float(record['debitAmount'])
        except (ValueError, TypeError):
            pass
        
        try:
            if record['creditAmount']:
                total_credits += float(record['creditAmount'])
                parent_distribution[pg]['credit'] += float(record['creditAmount'])
        except (ValueError, TypeError):
            pass
    
    print(f"\nBalance Summary:")
    print(f"  Total Debits:  Rs. {total_debits:>15,.2f}")
    print(f"  Total Credits: Rs. {total_credits:>15,.2f}")
    print(f"  Difference:    Rs. {abs(total_debits - total_credits):>15,.2f}")
    
    if abs(total_debits - total_credits) < 0.01:
        print(f"  ✓ Trial Balance BALANCED")
    else:
        print(f"  ⚠ Trial Balance OUT OF BALANCE")
    
    print(f"\nBy Parent Group:")
    for parent, data_info in sorted(parent_distribution.items()):
        print(f"\n  {parent}:")
        print(f"    - Items: {data_info['count']}")
        print(f"    - Debits:  Rs. {data_info['debit']:>12,.2f}")
        print(f"    - Credits: Rs. {data_info['credit']:>12,.2f}")


def export_to_json(data, filename="trial_balance_parsed.json"):
    """Export parsed data to JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n✓ Exported to {filename}")


if __name__ == "__main__":
    print("Testing Trial Balance XML Parser...")
    print("-" * 120)
    
    try:
        # Parse the sample XML
        parsed_data = parse_trial_balance(SAMPLE_XML)
        
        # Print results
        print_summary(parsed_data)
        
        # Export to JSON
        export_to_json(parsed_data)
        
        # Print detailed data
        print("\n" + "="*120)
        print("DETAILED RECORD VIEW")
        print("="*120)
        for i, record in enumerate(parsed_data, 1):
            debit = record['debitAmount'] if record['debitAmount'] else '-'
            credit = record['creditAmount'] if record['creditAmount'] else '-'
            group = "📂" if record['isGroup'] == 'Yes' else "📄"
            print(f"\n{i:2d}. {group} {record['name']}")
            print(f"    GUID: {record['guid']}")
            print(f"    Is Group: {record['isGroup']}")
            print(f"    Parent Group: {record['parentGroup']}")
            print(f"    Debit:  {debit:>12}")
            print(f"    Credit: {credit:>12}")
        
        print("\n✓ Test completed successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
