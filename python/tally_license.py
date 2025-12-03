"""
Tally License Information Fetcher
Retrieves license and system information from Tally
"""

import socket
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional

class TallyLicenseInfo:
    """Handles Tally license information retrieval"""
    
    def __init__(self, host: str = 'localhost', port: int = 9000):
        self.host = host
        self.port = port
    
    def get_license_info(self) -> Optional[Dict[str, Any]]:
        """
        Fetch license and system information from Tally
        
        Returns:
            Dictionary with license info or None if failed
        """
        try:
            # Build XML request
            xml_request = self._build_license_request()
            
            # Send request to Tally
            response = self._send_request(xml_request)
            
            if response:
                # Parse response
                license_info = self._parse_response(response)
                return license_info
            
            return None
            
        except Exception as e:
            print(f"Error fetching license info: {e}")
            return None
    
    def _build_license_request(self) -> str:
        """Build XML request for license info"""
        xml = """<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Function</TYPE>
<ID>$$LicenseInfo</ID>
</HEADER>
<BODY>
<DESC>
<FUNCPARAMLIST>
<PARAM>Serial Number</PARAM>
</FUNCPARAMLIST>
</DESC>
</BODY>
</ENVELOPE>"""
        return xml
    
    def _send_request(self, xml_request: str) -> Optional[str]:
        """
        Send XML request to Tally and get response
        
        Args:
            xml_request: XML string to send
            
        Returns:
            Response XML string or None
        """
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((self.host, self.port))
            
            # Send request
            sock.sendall(xml_request.encode('utf-8'))
            
            # Receive response
            response = b''
            while True:
                try:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                except socket.timeout:
                    break
            
            sock.close()
            
            if response:
                return response.decode('utf-8', errors='ignore')
            
            return None
            
        except Exception as e:
            print(f"Error sending request to Tally: {e}")
            return None
    
    def _parse_response(self, xml_response: str) -> Optional[Dict[str, Any]]:
        """
        Parse Tally XML response
        
        Args:
            xml_response: XML response from Tally
            
        Returns:
            Dictionary with parsed data or None
        """
        try:
            root = ET.fromstring(xml_response)
            
            # Extract header info
            header = root.find('HEADER')
            body = root.find('BODY')
            
            license_info = {
                'status': 'unknown',
                'license_number': None,
                'product_version': None,
                'company_count': 0,
                'ledger_count': 0,
                'voucher_count': 0,
            }
            
            if header is not None:
                status = header.find('STATUS')
                if status is not None:
                    license_info['status'] = 'active' if status.text == '1' else 'inactive'
                
                # Product version
                prod_major = header.find('PRODMAJORVER')
                prod_minor = header.find('PRODMINORVER')
                prod_rel = header.find('PRODMAJORREL')
                if prod_major is not None and prod_minor is not None and prod_rel is not None:
                    license_info['product_version'] = f"{prod_major.text}.{prod_minor.text}.{prod_rel.text}"
            
            if body is not None:
                # Extract company info counts
                cmpinfo = body.find('.//CMPINFO')
                if cmpinfo is not None:
                    company = cmpinfo.find('COMPANY')
                    ledger = cmpinfo.find('LEDGER')
                    voucher = cmpinfo.find('VOUCHER')
                    
                    if company is not None:
                        license_info['company_count'] = int(company.text or 0)
                    if ledger is not None:
                        license_info['ledger_count'] = int(ledger.text or 0)
                    if voucher is not None:
                        license_info['voucher_count'] = int(voucher.text or 0)
                
                # Extract license number (result)
                result = body.find('.//RESULT')
                if result is not None:
                    license_info['license_number'] = result.text
            
            return license_info
            
        except ET.ParseError as e:
            print(f"Error parsing XML response: {e}")
            return None
        except Exception as e:
            print(f"Error processing response: {e}")
            return None
    
    def get_company_info(self) -> Optional[Dict[str, Any]]:
        """
        Fetch company information from Tally
        
        Returns:
            Dictionary with company info or None
        """
        try:
            xml_request = """<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>Company</ID>
</HEADER>
<BODY>
<DESC>
<TallyFilteredList>
<TallyFilter>
<FilteredField>$Name</FilteredField>
</TallyFilter>
</TallyFilteredList>
</DESC>
</BODY>
</ENVELOPE>"""
            
            response = self._send_request(xml_request)
            if response:
                return self._parse_company_response(response)
            
            return None
            
        except Exception as e:
            print(f"Error fetching company info: {e}")
            return None
    
    def _parse_company_response(self, xml_response: str) -> Optional[Dict[str, Any]]:
        """Parse company information response"""
        try:
            root = ET.fromstring(xml_response)
            companies = []
            
            for company in root.findall('.//COMPANY'):
                name = company.find('NAME')
                if name is not None:
                    companies.append({
                        'name': name.text or 'Unknown',
                        'data': company.attrib
                    })
            
            return {
                'companies': companies,
                'count': len(companies)
            }
            
        except Exception as e:
            print(f"Error parsing company response: {e}")
            return None


# Example usage
if __name__ == '__main__':
    license_info = TallyLicenseInfo()
    
    # Get license info
    info = license_info.get_license_info()
    if info:
        print("License Information:")
        print(f"  Status: {info['status']}")
        print(f"  License Number: {info['license_number']}")
        print(f"  Product Version: {info['product_version']}")
        print(f"  Companies: {info['company_count']}")
        print(f"  Ledgers: {info['ledger_count']}")
        print(f"  Vouchers: {info['voucher_count']}")
    
    # Get company info
    companies = license_info.get_company_info()
    if companies:
        print(f"\nCompanies ({companies['count']}):")
        for company in companies['companies']:
            print(f"  - {company['name']}")
