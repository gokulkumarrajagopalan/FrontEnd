import os
import re

def fix_indentation(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We find all occurrences of '([ \t]*)company_var = ""\n        if company_name:\n            from xml.sax.saxutils import escape\n            escaped_company = escape\(company_name\)\n            company_var = f"\\n                <SVCOMPANY>{escaped_company}</SVCOMPANY>\\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>"'
    # Wait, the string was exactly replaced as:
    # """company_var = ""
    #    if company_name:
    #        from xml.sax.saxutils import escape
    #        escaped_company = escape(company_name)
    #        company_var = f"\n                <SVCOMPANY>{escaped_company}</SVCOMPANY>\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>\""""
    # But with the leading spaces of the original string.
    
    # Let's just fix it by matching the exact bad string:
    bad_string = """        if company_name:
            from xml.sax.saxutils import escape
            escaped_company = escape(company_name)
            company_var = f"\\n                <SVCOMPANY>{escaped_company}</SVCOMPANY>\\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>\""""
            
    # And replacing it based on context
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'company_var = ""' in line and line.strip() == 'company_var = ""':
            indent = line[:len(line) - len(line.lstrip())]
            
            # check the next lines
            if i + 4 < len(lines) and 'if company_name:' in lines[i+1] and 'from xml.sax.saxutils import escape' in lines[i+2]:
                lines[i+1] = indent + 'if company_name:'
                lines[i+2] = indent + '    from xml.sax.saxutils import escape'
                lines[i+3] = indent + '    escaped_company = escape(company_name)'
                lines[i+4] = indent + '    company_var = f"\\n                <SVCOMPANY>{escaped_company}</SVCOMPANY>\\n                <SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>"'

    new_content = '\n'.join(lines)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

fix_indentation(r"D:\Talliffy\FrontEnd\python\reconciliation.py")
fix_indentation(r"D:\Talliffy\FrontEnd\python\incremental_sync.py")
