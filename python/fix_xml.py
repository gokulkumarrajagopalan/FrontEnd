import os
import re

python_dir = r"D:\Talliffy\FrontEnd\python"

old_pattern_1 = r'company_var = f"\\n                <SVCURRENTCOMPANY>\{company_name\}</SVCURRENTCOMPANY>" if company_name else ""'
new_pattern_1 = '''company_var = ""
        if company_name:
            from xml.sax.saxutils import escape
            escaped_company = escape(company_name)
            company_var = f"\\n                <SVCOMPANY>{escaped_company}</SVCOMPANY>\\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>"'''

old_pattern_2 = r'<SVCURRENTCOMPANY>\{self\.company_name\}</SVCURRENTCOMPANY>'
new_pattern_2 = r'<SVCOMPANY>{escaped_company}</SVCOMPANY>\n                    <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>'

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix pattern 1
    if 'company_var = f"\\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""' in content:
        content = content.replace('company_var = f"\\n                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>" if company_name else ""', new_pattern_1)
        print(f"Fixed pattern 1 in {filepath}")

    # Fix pattern 2 (fetch_master_data.py, sync_master.py)
    if 'fetch_master_data.py' in filepath or 'sync_master.py' in filepath:
        if '<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>' in content:
            # We need to add the escape logic
            # Find the function def that contains this
            if 'def _build_request(' in content:
                content = content.replace('def _build_request(self, report_name):', 'def _build_request(self, report_name):\n        from xml.sax.saxutils import escape\n        escaped_company = escape(self.company_name) if self.company_name else ""')
                content = content.replace('<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>', '<SVCOMPANY>{escaped_company}</SVCOMPANY>\n                    <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>')
                print(f"Fixed pattern 2 in {filepath}")

    # Fix pattern 3 (sync_worker.py)
    if 'sync_worker.py' in filepath:
        if '<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>' in content:
            content = content.replace('def run_sync(args, entity_type="ALL"):', 'def run_sync(args, entity_type="ALL"):\n    pass') # wait, let's look at sync_worker.py
            
    # Fix pattern 4 (sync_financial_reports.py)
    if 'sync_financial_reports.py' in filepath:
        if '<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>' in content:
            content = content.replace('def get_balance_sheet(tally_url, company_name, from_date=None, to_date=None):', 'def get_balance_sheet(tally_url, company_name, from_date=None, to_date=None):\n    from xml.sax.saxutils import escape\n    escaped_company = escape(company_name) if company_name else ""')
            content = content.replace('def get_profit_loss(tally_url, company_name, from_date=None, to_date=None):', 'def get_profit_loss(tally_url, company_name, from_date=None, to_date=None):\n    from xml.sax.saxutils import escape\n    escaped_company = escape(company_name) if company_name else ""')
            content = content.replace('def get_trial_balance(tally_url, company_name, from_date=None, to_date=None):', 'def get_trial_balance(tally_url, company_name, from_date=None, to_date=None):\n    from xml.sax.saxutils import escape\n    escaped_company = escape(company_name) if company_name else ""')
            content = content.replace('<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>', '<SVCOMPANY>{escaped_company}</SVCOMPANY>\n\t\t\t\t<SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>')
            print(f"Fixed pattern 4 in {filepath}")

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for filename in os.listdir(python_dir):
    if filename.endswith(".py"):
        fix_file(os.path.join(python_dir, filename))
