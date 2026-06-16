import os

def fix_master(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    if 'def _build_request(self, report_name):' in content:
        content = content.replace('def _build_request(self, report_name):', 'def _build_request(self, report_name):\n        from xml.sax.saxutils import escape\n        escaped_company = escape(self.company_name) if self.company_name else ""')
        content = content.replace('<SVCURRENTCOMPANY>{self.company_name}</SVCURRENTCOMPANY>', '<SVCOMPANY>{escaped_company}</SVCOMPANY>\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

fix_master(r"D:\Talliffy\FrontEnd\python\fetch_master_data.py")
fix_master(r"D:\Talliffy\FrontEnd\python\sync_master.py")
