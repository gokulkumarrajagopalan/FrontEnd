#!/usr/bin/env python3
"""
Profit & Loss Data Sync Migration Script
Syncs all P&L data from Tally to the database with improved parsing
"""
import requests
import xml.etree.ElementTree as ET
import json
import re
import sys
from datetime import datetime
from typing import List, Dict, Tuple

class ProfitLossMigration:
    def __init__(self, backend_url="http://localhost:8080", auth_token=None):
        self.backend_url = backend_url
        self.auth_token = auth_token
        self.headers = {'Content-Type': 'application/json'}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'
        
        self.sync_results = {
            'success_count': 0,
            'failed_count': 0,
            'total_records': 0,
            'details': []
        }
    
    def _clean_xml(self, xml_text):
        """Clean invalid XML characters"""
        xml_text = re.sub(r'&#4;', '', xml_text)
        xml_text = re.sub(r'&#x?[0-3][\da-fA-F];', '', xml_text)
        return xml_text
    
    def sync_profit_loss_data(self, parsed_data: List[Dict]) -> Tuple[bool, str]:
        """Sync parsed P&L data to backend"""
        if not parsed_data:
            return False, "No data to sync"
        
        try:
            endpoint = f"{self.backend_url}/reports/profitloss/sync"
            response = requests.post(endpoint, json=parsed_data, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                return True, f"Synced {len(parsed_data)} records"
            else:
                return False, f"Status {response.status_code}: {response.text}"
        except Exception as e:
            return False, str(e)
    
    def validate_parsed_data(self, data: List[Dict]) -> Tuple[bool, List[str]]:
        """Validate parsed data before sync"""
        errors = []
        
        if not data:
            errors.append("No data to validate")
            return False, errors
        
        required_fields = ['name', 'cmp_id', 'guid', 'isGroup', 'parentGroup', 'mainAmount', 'subAmount']
        
        for i, record in enumerate(data):
            for field in required_fields:
                if field not in record:
                    errors.append(f"Record {i}: Missing field '{field}'")
            
            if record['isGroup'] not in ['Yes', 'No', '']:
                errors.append(f"Record {i}: Invalid isGroup value '{record['isGroup']}'")
        
        return len(errors) == 0, errors
    
    def generate_report(self, data: List[Dict]) -> str:
        """Generate a summary report of P&L data"""
        if not data:
            return "No data to report"
        
        groups = [r for r in data if r['isGroup'] == 'Yes']
        accounts = [r for r in data if r['isGroup'] != 'Yes']
        
        # Calculate totals
        group_totals = {}
        for record in groups:
            try:
                amount = float(record['mainAmount']) if record['mainAmount'] else 0
                group_totals[record['name']] = amount
            except (ValueError, TypeError):
                pass
        
        # Group by parent
        parent_distribution = {}
        for record in data:
            pg = record['parentGroup']
            if pg not in parent_distribution:
                parent_distribution[pg] = {'groups': 0, 'accounts': 0}
            
            if record['isGroup'] == 'Yes':
                parent_distribution[pg]['groups'] += 1
            else:
                parent_distribution[pg]['accounts'] += 1
        
        report = []
        report.append(f"\n{'='*80}")
        report.append("PROFIT & LOSS SYNC REPORT")
        report.append(f"{'='*80}")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Total Records: {len(data)}")
        report.append(f"  - Groups: {len(groups)}")
        report.append(f"  - Accounts: {len(accounts)}")
        report.append(f"\nParent Group Distribution:")
        
        for parent, dist in sorted(parent_distribution.items()):
            total = dist['groups'] + dist['accounts']
            report.append(f"  {parent}: {total} items ({dist['groups']} groups, {dist['accounts']} accounts)")
        
        report.append(f"\nGroup Totals (Main Amount):")
        for group, total in sorted(group_totals.items(), key=lambda x: x[1], reverse=True):
            report.append(f"  {group}: Rs. {total:,.2f}")
        
        # Calculate net
        net_profit = sum(group_totals.values())
        report.append(f"\nCalculated Net: Rs. {net_profit:,.2f}")
        
        report.append(f"\n{'='*80}\n")
        
        return '\n'.join(report)
    
    def export_results(self, data: List[Dict], filename: str = None) -> str:
        """Export results to JSON file"""
        if filename is None:
            filename = f"pl_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
            return f"Exported to {filename}"
        except Exception as e:
            return f"Export failed: {e}"
    
    def run_migration(self, input_file: str = None, parsed_data: List[Dict] = None) -> bool:
        """Run the migration process"""
        print(f"\n{'='*80}")
        print("PROFIT & LOSS MIGRATION SCRIPT")
        print(f"{'='*80}\n")
        
        # Load data
        if parsed_data is None:
            if not input_file:
                print("❌ No input data provided")
                return False
            
            try:
                with open(input_file, 'r') as f:
                    parsed_data = json.load(f)
                print(f"✓ Loaded {len(parsed_data)} records from {input_file}")
            except Exception as e:
                print(f"❌ Failed to load input file: {e}")
                return False
        
        # Validate data
        print("\nValidating data...")
        is_valid, errors = self.validate_parsed_data(parsed_data)
        
        if not is_valid:
            print(f"❌ Validation failed:")
            for error in errors[:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(errors) > 10:
                print(f"   ... and {len(errors) - 10} more errors")
            return False
        
        print("✓ Data validation passed")
        
        # Generate report
        print("\nGenerating report...")
        report = self.generate_report(parsed_data)
        print(report)
        
        # Sync to backend
        print("Syncing to backend...")
        success, message = self.sync_profit_loss_data(parsed_data)
        
        if success:
            print(f"✓ {message}")
            self.sync_results['success_count'] = len(parsed_data)
        else:
            print(f"❌ {message}")
            self.sync_results['failed_count'] = len(parsed_data)
        
        # Export backup
        print("\nExporting backup...")
        export_msg = self.export_results(parsed_data)
        print(f"✓ {export_msg}")
        
        print(f"\n{'='*80}\n")
        return success


def main():
    if len(sys.argv) < 2:
        print("Usage: python migrate_profit_loss.py <input_json_file> [backend_url] [auth_token]")
        print("\nExample:")
        print("  python migrate_profit_loss.py profit_loss_parsed.json http://localhost:8080 token123")
        sys.exit(1)
    
    input_file = sys.argv[1]
    backend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8080"
    auth_token = sys.argv[3] if len(sys.argv) > 3 else None
    
    migration = ProfitLossMigration(backend_url=backend_url, auth_token=auth_token)
    success = migration.run_migration(input_file=input_file)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
