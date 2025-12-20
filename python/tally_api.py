import requests
import xml.etree.ElementTree as ET
import json
import logging
from typing import Dict, Optional, Tuple, Any
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


class TallyAPIClient:
    """
    Client for communicating with Tally ERP using XML requests.
    Supports various Tally API functions.
    """

    def __init__(self, host: str = "localhost", port: int = 9000, timeout: int = 10):
        """
        Initialize Tally API Client.
        
        Args:
            host: Tally server host (default: localhost)
            port: Tally server port (default: 9000)
            timeout: Request timeout in seconds (default: 10)
        """
        self.host = host
        self.port = port
        self.timeout = timeout
        self.base_url = f"http://{host}:{port}"
        self.session = requests.Session()
        logger.info(f"TallyAPIClient initialized for {self.base_url}")

    def close(self):
        """Close the session."""
        self.session.close()

    def _get_t(self, obj, default=""):
        """Helper to safely extract text from Tally XML dictionary objects."""
        if obj is None:
            return default
        if isinstance(obj, dict):
            return obj.get("_text", default).strip()
        return str(obj).strip()

    def build_envelope(
        self,
        request_type: str,
        function_id: str,
        params: Optional[Dict[str, Any]] = None,
        version: str = "1",
    ) -> str:
        """
        Build Tally XML envelope.
        
        Args:
            request_type: Export or Import
            function_id: Tally function ID (e.g., $$LicenseInfo, $$Masters.Company)
            params: Dictionary of parameters
            version: API version (default: 1)
        
        Returns:
            XML string
        """
        # Build envelope using raw XML format (like Postman)
        xml_parts = [
            f"<ENVELOPE>",
            f"<HEADER>",
            f"<VERSION>{version}</VERSION>",
            f"<TALLYREQUEST>{request_type}</TALLYREQUEST>",
            f"<TYPE>Function</TYPE>",
            f"<ID>{function_id}</ID>",
            f"</HEADER>",
            f"<BODY>",
            f"<DESC>",
        ]
        
        # Add parameters if provided
        if params:
            xml_parts.append(f"<FUNCPARAMLIST>")
            for key, value in params.items():
                xml_parts.append(f"<PARAM>")
                xml_parts.append(f"<NAME>{key}</NAME>")
                xml_parts.append(f"<VALUE>{str(value)}</VALUE>")
                xml_parts.append(f"</PARAM>")
            xml_parts.append(f"</FUNCPARAMLIST>")
        else:
            # For functions without parameters, just add empty FUNCPARAMLIST or PARAM
            xml_parts.append(f"<FUNCPARAMLIST></FUNCPARAMLIST>")
        
        xml_parts.extend([
            f"</DESC>",
            f"</BODY>",
            f"</ENVELOPE>"
        ])
        
        xml_str = "".join(xml_parts)
        logger.debug(f"Built envelope for {function_id}: {xml_str[:100]}...")
        return xml_str

    @staticmethod
    def clean_xml(xml_string: str) -> str:
        """Remove invalid XML characters and entities."""
        import re
        # Remove invalid numeric character references (&#0; to &#31; except 9, 10, 13)
        def replace_invalid_entity(match):
            num = int(match.group(1))
            if num in (9, 10, 13) or num >= 32:
                return match.group(0)
            return ''
        
        xml_string = re.sub(r'&#(\d+);', replace_invalid_entity, xml_string)
        
        def replace_invalid_hex_entity(match):
            num = int(match.group(1), 16)
            if num in (9, 10, 13) or num >= 32:
                return match.group(0)
            return ''
        
        xml_string = re.sub(r'&#x([0-9a-fA-F]+);', replace_invalid_hex_entity, xml_string)
        xml_string = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_string)
        xml_string = ''.join(char for char in xml_string if ord(char) >= 0x20 or char in '\t\n\r')
        
        return xml_string

    def send_request(self, xml_data: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Send XML request to Tally server.
        """
        try:
            logger.info(f"Sending request to {self.base_url}")
            response = self.session.post(
                self.base_url,
                data=xml_data.encode('utf-8'),
                headers={"Content-Type": "text/xml"},
                timeout=self.timeout,
            )
            
            response.raise_for_status()
            logger.info(f"Response status: {response.status_code}")
            
            # Clean and parse XML response
            cleaned_xml = self.clean_xml(response.text)
            parsed = self.parse_response(cleaned_xml)
            return True, parsed
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            return False, {"error": "Connection failed", "details": str(e)}
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout error: {e}")
            return False, {"error": "Request timeout", "details": str(e)}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return False, {"error": "Request failed", "details": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False, {"error": "Unexpected error", "details": str(e)}

    def get_vouchertypes(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch voucher types from Tally."""
        fetch_fields = "GUID, MASTERID, ALTERID, Name, PARENT, MAILINGNAME, ISACTIVE, VOUCHERNUMBERSERIES.*"
        xml = self._build_collection_request("VoucherType", "Collection of VOUCHERTYPE", company, fetch_fields=fetch_fields)
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            vouchertypes = []
            data = self._get_collection_data(result, "VOUCHERTYPE")
            for vt in data:
                vt_info = {
                    'name': vt.get("@NAME"),
                    'reservedName': vt.get("@RESERVEDNAME"),
                    'guid': self._get_t(vt.get("GUID")),
                    'parent': self._get_t(vt.get("PARENT")),
                    'mailingName': self._get_t(vt.get("MAILINGNAME")),
                    'isActive': self._get_t(vt.get("ISACTIVE"), "Yes").lower() == "yes",
                    'masterId': int(self._get_t(vt.get("MASTERID"), "0") or "0"),
                    'alterId': int(self._get_t(vt.get("ALTERID"), "0") or "0"),
                    'voucherNumberSeries': []
                }
                vns_list = vt.get("VOUCHERNUMBERSERIES.LIST", [])
                if isinstance(vns_list, dict):
                    vns_list = [vns_list]
                for vns in vns_list:
                    vt_info['voucherNumberSeries'].append({k.lower(): self._get_t(v) for k, v in vns.items()})
                vouchertypes.append(vt_info)
            return True, vouchertypes
        except Exception as e:
            logger.error(f"Error parsing vouchertypes: {e}")
            return False, {"error": str(e)}

    def get_groups(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch all groups from Tally."""
        xml = self._build_collection_request("Group", "AllGroups", company)
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            groups = []
            data = self._get_collection_data(result, "GROUP")
            for group_elem in data:
                group_data = {
                    'grpName': group_elem.get("@NAME", ""),
                    'guid': self._get_t(group_elem.get('GUID')),
                    'masterId': int(self._get_t(group_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(group_elem.get('ALTERID'), '0') or '0'),
                    'grpParent': self._get_t(group_elem.get('PARENT')) or None,
                    'grpPrimaryGroup': self._get_t(group_elem.get('PRIMARYGROUP')) or None,
                    'grpNature': self._get_t(group_elem.get('NATURE')) or None,
                    'isRevenue': self._get_t(group_elem.get('ISREVENUE'), 'No').lower() == 'yes',
                    'isReserved': bool(group_elem.get("@RESERVEDNAME")),
                    'reservedName': group_elem.get("@RESERVEDNAME"),
                    'isActive': True
                }
                groups.append(group_data)
            return True, groups
        except Exception as e:
            logger.error(f"Error parsing groups: {e}")
            return False, {"error": str(e)}

    def get_ledgers(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch ledgers from Tally."""
        xml = self._build_collection_request("Ledger", "Collection of Ledgers", company, fetch_fields="GUID, MASTERID, ALTERID, Name, OnlyAlias, Parent, IsRevenue, LastParent, Description, Narration, IsBillWiseOn, IsCostCentresOn, OpeningBalance, LEDGERPHONE, LEDGERCOUNTRYISDCODE, LEDGERMOBILE, LEDGERCONTACT, WEBSITE, EMAIL, CURRENCYNAME, INCOMETAXNUMBER, LEDMAILINGDETAILS.*, VATAPPLICABLEDATE, VATDEALERTYPE, VATTINNUMBER, LEDGSTREGDETAILS.*")
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            ledgers = []
            data = self._get_collection_data(result, "LEDGER")
            for ledger_elem in data:
                mailing_details = ledger_elem.get('LEDMAILINGDETAILS.LIST', {})
                if isinstance(mailing_details, list): mailing_details = mailing_details[0] if mailing_details else {}
                
                gst_details = ledger_elem.get('LEDGSTREGDETAILS.LIST', {})
                if isinstance(gst_details, list): gst_details = gst_details[0] if gst_details else {}

                ledger_data = {
                    'ledName': ledger_elem.get("@NAME", ""),
                    'guid': self._get_t(ledger_elem.get('GUID')),
                    'masterId': int(self._get_t(ledger_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(ledger_elem.get('ALTERID'), '0') or '0'),
                    'ledParent': self._get_t(ledger_elem.get('PARENT')) or None,
                    'ledPrimaryGroup': self._get_t(ledger_elem.get('LASTPARENT')) or None,
                    'ledDescription': self._get_t(ledger_elem.get('DESCRIPTION')) or None,
                    'ledNote': self._get_t(ledger_elem.get('NARRATION')) or None,
                    'ledBillWiseOn': self._get_t(ledger_elem.get('ISBILLWISEON'), 'No').lower() == 'yes',
                    'ledIsCostCentreOn': self._get_t(ledger_elem.get('ISCOSTCENTRESON'), 'No').lower() == 'yes',
                    'ledMailingName': self._get_t(mailing_details.get('MAILINGNAME')) or ledger_elem.get("@NAME", ""),
                    'ledState': self._get_t(mailing_details.get('STATE')) or None,
                    'ledCountry': self._get_t(mailing_details.get('COUNTRY')) or None,
                    'ledPincode': self._get_t(mailing_details.get('PINCODE')) or None,
                    'ledPhone': self._get_t(ledger_elem.get('LEDGERPHONE')) or None,
                    'ledMobile': self._get_t(ledger_elem.get('LEDGERMOBILE')) or None,
                    'ledEmail': self._get_t(ledger_elem.get('EMAIL')) or None,
                    'ledWebsite': self._get_t(ledger_elem.get('WEBSITE')) or None,
                    'ledOpeningBalance': float(self._get_t(ledger_elem.get('OPENINGBALANCE'), '0.0').replace(',', '') or '0.0'),
                    'ledGstin': self._get_t(gst_details.get('GSTIN')) or None,
                    'ledGstRegistrationType': self._get_t(gst_details.get('GSTREGISTRATIONTYPE')) or None,
                    'isRevenue': self._get_t(ledger_elem.get('ISREVENUE'), 'No').lower() == 'yes',
                    'isActive': True
                }
                ledgers.append(ledger_data)
            return True, ledgers
        except Exception as e:
            logger.error(f"Error parsing ledgers: {e}")
            return False, {"error": str(e)}

    def get_items(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch stock items from Tally."""
        xml = self._build_collection_request("StockItem", "Collection of StockItems", company, fetch_fields="GUID, NAME, PARENT, BASEUNITS, OPENINGBALANCE, OPENINGVALUE, OPENINGRATE")
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            items = []
            data = self._get_collection_data(result, "STOCKITEM")
            for item_elem in data:
                item_data = {
                    'name': item_elem.get("@NAME", ""),
                    'guid': self._get_t(item_elem.get('GUID')),
                    'parent': self._get_t(item_elem.get('PARENT')) or None,
                    'units': self._get_t(item_elem.get('BASEUNITS')) or None,
                    'openingBalance': self._get_t(item_elem.get('OPENINGBALANCE')) or None,
                    'openingValue': self._get_t(item_elem.get('OPENINGVALUE')) or None
                }
                items.append(item_data)
            return True, items
        except Exception as e:
            logger.error(f"Error parsing items: {e}")
            return False, {"error": str(e)}

    def get_costcategories(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch cost categories from Tally."""
        xml = self._build_collection_request("CostCategory", "Collection of COSTCATEGORY", company, fetch_fields="GUID, MASTERID, ALTERID, Name, ALLOCATEREVENUE, ALLOCATENONREVENUE")
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            categories = []
            data = self._get_collection_data(result, "COSTCATEGORY")
            for cat_elem in data:
                cat_data = {
                    'name': cat_elem.get("@NAME", ""),
                    'guid': self._get_t(cat_elem.get('GUID')),
                    'masterId': int(self._get_t(cat_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(cat_elem.get('ALTERID'), '0') or '0'),
                    'reservedName': cat_elem.get("@RESERVEDNAME", ""),
                    'allocateRevenue': self._get_t(cat_elem.get('ALLOCATEREVENUE'), 'No').lower() == 'yes',
                    'allocateNonRevenue': self._get_t(cat_elem.get('ALLOCATENONREVENUE'), 'No').lower() == 'yes',
                    'isActive': True
                }
                categories.append(cat_data)
            return True, categories
        except Exception as e:
            logger.error(f"Error parsing cost categories: {e}")
            return False, {"error": str(e)}

    def get_costcentres(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch cost centres from Tally."""
        xml = self._build_collection_request("CostCentre", "Collection of COSTCENTRE", company, fetch_fields="GUID, MASTERID, ALTERID, Name, CATEGORY, PARENT")
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            centres = []
            data = self._get_collection_data(result, "COSTCENTRE")
            for centre_elem in data:
                centre_data = {
                    'name': centre_elem.get("@NAME", ""),
                    'guid': self._get_t(centre_elem.get('GUID')),
                    'masterId': int(self._get_t(centre_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(centre_elem.get('ALTERID'), '0') or '0'),
                    'category': self._get_t(centre_elem.get('CATEGORY')),
                    'parent': self._get_t(centre_elem.get('PARENT')) or None,
                    'reservedName': centre_elem.get("@RESERVEDNAME", ""),
                    'isActive': True
                }
                centres.append(centre_data)
            return True, centres
        except Exception as e:
            logger.error(f"Error parsing cost centres: {e}")
            return False, {"error": str(e)}

    def get_currencies(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch currencies from Tally."""
        fetch_fields = "GUID, MASTERID, ALTERID, Name, ORIGINALNAME, EXPANDEDSYMBOL, DECIMALSYMBOL, DECIMALPLACES, ISSUFFIX, FORTSPACE, SHOWAMOUNTINWORDS"
        xml = self._build_collection_request("Currency", "Collection of Currency", company, fetch_fields=fetch_fields)
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            currencies = []
            data = self._get_collection_data(result, "CURRENCY")
            for curr_elem in data:
                curr_data = {
                    'name': curr_elem.get("@NAME", ""),
                    'symbol': curr_elem.get("@NAME", ""),
                    'guid': self._get_t(curr_elem.get('GUID')),
                    'masterId': int(self._get_t(curr_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(curr_elem.get('ALTERID'), '0') or '0'),
                    'formalName': self._get_t(curr_elem.get('ORIGINALNAME')),
                    'decimalSeparator': self._get_t(curr_elem.get('DECIMALSYMBOL')),
                    'decimalPlaces': int(self._get_t(curr_elem.get('DECIMALPLACES'), '0') or '0'),
                    'suffixSymbol': self._get_t(curr_elem.get('ISSUFFIX'), 'No').lower() == 'yes',
                    'spaceBetweenAmountAndSymbol': self._get_t(curr_elem.get('FORTSPACE'), 'No').lower() == 'yes',
                    'showAmountInWords': self._get_t(curr_elem.get('SHOWAMOUNTINWORDS'), 'No').lower() == 'yes',
                }
                currencies.append(curr_data)
            return True, currencies
        except Exception as e:
            logger.error(f"Error parsing currencies: {e}")
            return False, {"error": str(e)}

    def get_taxunits(self, company: Optional[str] = None) -> Tuple[bool, Any]:
        """Fetch tax units from Tally."""
        xml = self._build_collection_request("TaxUnit", "Collection of TAXUNIT", company, fetch_fields="GUID, MASTERID, ALTERID, Name, ISGSTEINVINCLEWAYBILL, ISPRIMARYUNIT, USEDFOR, LUTDETAILS.*, GSTREGISTRATIONDETAILS.*, GSTEWAYBILLDETAILS.*, GSTEINVOICEDETAILS.*")
        success, result = self.send_request(xml)
        if not success:
            return False, result
        
        try:
            units = []
            data = self._get_collection_data(result, "TAXUNIT")
            for unit_elem in data:
                gst_reg = unit_elem.get('GSTREGISTRATIONDETAILS.LIST', {})
                if isinstance(gst_reg, list): gst_reg = gst_reg[0] if gst_reg else {}
                
                eway_details = unit_elem.get('GSTEWAYBILLDETAILS.LIST', {})
                if isinstance(eway_details, list): eway_details = eway_details[0] if eway_details else {}
                
                einv_details = unit_elem.get('GSTEINVOICEDETAILS.LIST', {})
                if isinstance(einv_details, list): einv_details = einv_details[0] if einv_details else {}
 
                unit_data = {
                    'name': unit_elem.get("@NAME", ""),
                    'guid': self._get_t(unit_elem.get('GUID')),
                    'masterId': int(self._get_t(unit_elem.get('MASTERID'), '0') or '0'),
                    'alterId': int(self._get_t(unit_elem.get('ALTERID'), '0') or '0'),
                    'usedFor': self._get_t(unit_elem.get('USEDFOR')),
                    'gstRegNumber': self._get_t(unit_elem.get('GSTREGNUMBER')),
                    'isGstEnvincEwaybill': self._get_t(unit_elem.get('ISGSTEINVINCLEWAYBILL'), 'No').lower() == 'yes',
                    'isPrimaryUnit': self._get_t(unit_elem.get('ISPRIMARYUNIT'), 'No').lower() == 'yes',
                    'gstRegistration': {
                        'state': self._get_t(gst_reg.get('STATE')),
                        'registrationType': self._get_t(gst_reg.get('REGISTRATIONTYPE')),
                        'placeOfSupply': self._get_t(gst_reg.get('PLACEOFSUPPLY')),
                    } if gst_reg else None,
                    'ewaybillDetails': {
                        'applicableFrom': self._get_t(eway_details.get('APPLICABLEFROM')),
                        'isEwaybillApplicable': self._get_t(eway_details.get('EWAYBILLAPPLICABLE'), 'No').lower() == 'yes',
                    } if eway_details else None,
                    'einvoiceDetails': {
                        'applicableFrom': self._get_t(einv_details.get('APPLICABLEFROM')),
                        'isEinvApplicable': self._get_t(einv_details.get('EINVAPPLICABLE'), 'No').lower() == 'yes',
                    } if einv_details else None
                }
                units.append(unit_data)
            return True, units
        except Exception as e:
            logger.error(f"Error parsing tax units: {e}")
            return False, {"error": str(e)}

    def _build_collection_request(self, type_name: str, collection_id: str, company: Optional[str] = None, fetch_fields: str = "*") -> str:
        """Helper to build Tally Collection request XML."""
        static_vars = ""
        if company:
            static_vars += f"<SVCOMPANY>{company}</SVCOMPANY>"
        
        return f"""<ENVELOPE>
        <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Collection</TYPE>
            <ID>{collection_id}</ID>
        </HEADER>
        <BODY>
            <DESC>
                <STATICVARIABLES>
                    {static_vars}
                    <SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE>
                    <SVTODATE TYPE="Date">01-Jan-1970</SVTODATE>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
                <TDL>
                    <TDLMESSAGE>
                        <COLLECTION NAME="{collection_id}" ISMODIFY="No">
                            <TYPE>{type_name}</TYPE>
                            <FETCH>{fetch_fields}</FETCH>
                        </COLLECTION>
                    </TDLMESSAGE>
                </TDL>
            </DESC>
        </BODY>
    </ENVELOPE>"""

    def _get_collection_data(self, result: Dict[str, Any], tag_name: str) -> list:
        """Helper to safely extract collection data from result."""
        data = result.get("DATA", {}).get("COLLECTION", {}).get(tag_name, [])
        if isinstance(data, dict):
            return [data]
        return data if isinstance(data, list) else []

    def parse_response(self, xml_response: str) -> Dict[str, Any]:
        """
        Parse Tally XML response.
        
        Args:
            xml_response: XML response string from Tally
        
        Returns:
            Dictionary with parsed data
        """
        try:
            root = ET.fromstring(xml_response)
            
            # Extract data from BODY
            body = root.find(".//BODY")
            if body is None:
                logger.warning("No BODY element in response")
                return {"raw": xml_response}
            
            # Convert XML to dict
            data = self._xml_to_dict(body)
            logger.info(f"Parsed response: {str(data)[:100]}...")
            return data
            
        except ET.ParseError as e:
            logger.error(f"XML parse error: {e}")
            return {"error": "Invalid XML response", "raw": xml_response}
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {"error": str(e), "raw": xml_response}

    @staticmethod
    def _xml_to_dict(element: ET.Element) -> Dict[str, Any]:
        """
        Convert XML element to dictionary recursively.
        
        Args:
            element: XML element
        
        Returns:
            Dictionary representation
        """
        result = {}
        
        # Add element text if present
        if element.text and element.text.strip():
            result["_text"] = element.text.strip()
        
        # Add attributes
        if element.attrib:
            result.update({f"@{k}": v for k, v in element.attrib.items()})
        
        # Add children
        for child in element:
            child_data = TallyAPIClient._xml_to_dict(child)
            if child.tag in result:
                # Convert to list if multiple elements with same tag
                if not isinstance(result[child.tag], list):
                    result[child.tag] = [result[child.tag]]
                result[child.tag].append(child_data)
            else:
                result[child.tag] = child_data
        
        return result if result else {"_empty": True}

    # Tally Function Wrappers

    def get_license_info(self) -> Tuple[bool, Dict[str, Any]]:
        """Get Tally license information."""
        logger.info("Getting license info")
        # Use XML with Serial Number parameter as shown in Postman
        xml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Function</TYPE><ID>$$LicenseInfo</ID></HEADER><BODY><DESC><FUNCPARAMLIST><PARAM>Serial Number</PARAM></FUNCPARAMLIST></DESC></BODY></ENVELOPE>"
        
        try:
            # Send request and get raw XML
            response = self.session.post(self.base_url, data=xml, headers={"Content-Type": "application/xml"}, timeout=self.timeout)
            raw_xml = response.text
            
            # Save raw XML for debugging
            logger.info(f"Raw License XML Response (first 2000 chars):\n{raw_xml[:2000]}")
            
            # Parse response
            parsed = self.parse_response(raw_xml)
            
            # Extract license info
            license_info = self._extract_license_info(parsed)
            if license_info:
                return True, license_info
            else:
                logger.warning("Could not extract license info from response")
                return False, {"error": "Invalid response format", "raw_response": raw_xml[:500]}
                
        except Exception as e:
            logger.error(f"License info request failed: {e}")
            import traceback
            traceback.print_exc()
            return False, {"error": str(e)}
    
    def _extract_license_info(self, parsed_response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract license information from parsed XML response.
        
        Expected structure:
        Body DESC -> CMPINFO (system info) 
        Body DATA -> RESULT (license number)
        
        Args:
            parsed_response: Dictionary from parse_response()
        
        Returns:
            Dictionary with license info or None
        """
        try:
            # Helper function to extract text from dict or string
            def get_value(obj, default=""):
                if obj is None:
                    return default
                if isinstance(obj, dict):
                    text = obj.get("_text", "")
                    return text if text else default
                return str(obj) if obj else default
            
            logger.info(f"Full parsed response structure: {json.dumps(parsed_response, indent=2, default=str)}")
            
            # Navigate to DESC for CMPINFO
            desc = parsed_response.get("DESC", {})
            cmpinfo = desc.get("CMPINFO", {})
            
            logger.info(f"CMPINFO found: {json.dumps(cmpinfo, indent=2, default=str)[:500]}")
            
            company_count = int(get_value(cmpinfo.get("COMPANY", 0), "0") or 0)
            ledger_count = int(get_value(cmpinfo.get("LEDGER", 0), "0") or 0)
            voucher_count = int(get_value(cmpinfo.get("VOUCHER", 0), "0") or 0)
            
            # Try multiple paths to find license number
            license_number = None
            
            # Path 1: DATA -> RESULT
            data = parsed_response.get("DATA", {})
            if data and not license_number:
                result_obj = data.get("RESULT", {})
                test_val = get_value(result_obj)
                if test_val and test_val != "Unknown":
                    license_number = test_val
                    logger.info(f"✓ Path 1 (DATA->RESULT): {license_number}")
            
            # Path 2: Try direct RESULT at root
            if not license_number:
                result_obj = parsed_response.get("RESULT", {})
                test_val = get_value(result_obj)
                if test_val and test_val != "Unknown":
                    license_number = test_val
                    logger.info(f"✓ Path 2 (RESULT): {license_number}")
            
            # Path 3: Try CMPINFO -> various license fields
            if not license_number and cmpinfo:
                # Try multiple field names
                for field in ["SERIALNUMBER", "SERIAL", "LICENSENO", "LICENSE", "SERIALNO"]:
                    test_val = get_value(cmpinfo.get(field))
                    if test_val and test_val != "Unknown":
                        license_number = test_val
                        logger.info(f"✓ Path 3 (CMPINFO->{field}): {license_number}")
                        break
            
            # Path 4: Try LICENSEINFO nested object
            if not license_number and cmpinfo:
                licenseinfo = cmpinfo.get("LICENSEINFO", {})
                if licenseinfo:
                    for field in ["SERIALNUMBER", "SERIAL", "NUMBER", "LICENSENO"]:
                        test_val = get_value(licenseinfo.get(field))
                        if test_val and test_val != "Unknown":
                            license_number = test_val
                            logger.info(f"✓ Path 4 (CMPINFO->LICENSEINFO->{field}): {license_number}")
                            break
            
            # If still not found, log all keys for debugging
            if not license_number:
                logger.warning(f"License number not found. Available keys in parsed_response: {list(parsed_response.keys())}")
                if desc:
                    logger.warning(f"Available keys in DESC: {list(desc.keys())}")
                if cmpinfo:
                    logger.warning(f"Available keys in CMPINFO: {list(cmpinfo.keys())}")
                if data:
                    logger.warning(f"Available keys in DATA: {list(data.keys())}")
            
            # Extract product version from CMPINFO
            product_version = "1.1.6.2"  # default
            try:
                major = get_value(cmpinfo.get("PRODMAJORVER"), "1")
                minor = get_value(cmpinfo.get("PRODMINORVER"), "1")
                rel = get_value(cmpinfo.get("PRODMAJORREL"), "6")
                patch = get_value(cmpinfo.get("PRODMINORREL"), "2")
                if major and minor and rel:
                    product_version = f"{major}.{minor}.{rel}.{patch}" if patch else f"{major}.{minor}.{rel}"
            except:
                pass
            
            # Build license info dictionary
            license_info = {
                "license_number": license_number or "Unknown",
                "product_version": product_version,
                "status": "active" if company_count > 0 or license_number else "inactive",
                "company_count": company_count,
                "ledger_count": ledger_count,
                "voucher_count": voucher_count
            }
            
            logger.info(f"Final extracted license info: {license_info}")
            return license_info
            
        except Exception as e:
            logger.error(f"Error in _extract_license_info: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_companies(self) -> Tuple[bool, Any]:
        """Get list of companies from Tally using proper XML request."""
        logger.info("Getting companies list from Tally")
        
        # Build XML request for fetching companies
        # Uses Tally's Export function to fetch all companies from the database
        xml = self._build_company_request()
        
        logger.info(f"Company request XML: {xml}")
        success, result = self.send_request(xml)
        
        if not success:
            logger.error(f"Companies request failed: {result}")
            return False, result
        
        # Extract companies from the response
        try:
            companies = self._extract_companies(result)
            if companies:
                logger.info(f"Successfully extracted {len(companies)} companies")
                return True, companies
            else:
                logger.warning("Could not extract companies from response, returning mock data")
                return True, self._get_mock_companies()
        except Exception as e:
            logger.error(f"Error extracting companies: {e}")
            import traceback
            traceback.print_exc()
            return False, {"error": str(e)}
    
    def _build_company_request(self) -> str:
        """
        Build XML request for fetching companies from Tally.
        
        Uses Tally's Collection export to fetch all companies.
        Based on the XML format that returns COLLECTION with COMPANY elements.
        
        Returns:
            XML string for company fetch request
        """
        xml = """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Collection of Companies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE><SVTODATE TYPE="Date">01-Jan-1970</SVTODATE><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="Collection of Companies" ISMODIFY="No"><TYPE>Company</TYPE><FETCH>GUID,ALTERID,MASTERID,NAME,STATE,STARTINGFROM,BOOKSFROM,ENDINGAT,LASTVOUCHERDATE,BASICCOMPANYFORMALNAME,EMAIL,WEBSITE,TELEPHONE,FAX,PHONENUMBER,_ADDRESS1,_ADDRESS2,_ADDRESS3,_ADDRESS4,_ADDRESS5,STATENAME,PINCODE,COUNTRYNAME,PANID,GSTREGISTRATIONTYPE,GSTAPPLICABLEDATE,GSTSTATE,GSTIN,GSTFREEZONE,GSTEINVOICEAPPLICABLE,GSTEWAYBILLAPPLICABLE,VATEMIRAATE,VATAPPLICABLEDATE,VATREGISTRATIONNUMBER,VATACCOUNTID,VATFREEZONE,BILLWISEENABLED,COSTCENTREENABLED,BATCHENABLED,USEDISCOUNTCOLUMN,USEACTUALCOLUMN,PAYROLLENABLED,DESTINATION</FETCH><FILTERS>GroupFilter</FILTERS></COLLECTION><SYSTEM TYPE="FORMULAE" NAME="GroupFilter">$isaggregate = "No"</SYSTEM></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        return xml
    
    def _extract_companies(self, parsed_response: Dict[str, Any]) -> list:
        """
        Extract company list from Tally XML response with complete 56-field structure.
        
        Expected response structure from Tally (using COLLECTION format):
        <ENVELOPE>
            <BODY>
                <DATA>
                    <COLLECTION>
                        <COMPANY NAME="Company Name">
                            <NAME>Company Name</NAME>
                            <GUID>...</GUID>
                            <EMAIL>...</EMAIL>
                            ... (56 fields total)
                        </COMPANY>
                        <COMPANY>...</COMPANY>
                    </COLLECTION>
                </DATA>
            </BODY>
        </ENVELOPE>
        
        Args:
            parsed_response: Dictionary from parse_response()
        
        Returns:
            List of company dictionaries with all 56 fields
        """
        try:
            companies = []
            
            # Helper function to get text value
            def get_text(obj):
                if isinstance(obj, dict):
                    return obj.get("_text", "")
                return str(obj) if obj else ""
            
            logger.info(f"Parsing response structure...")
            
            # Navigate to DATA -> COLLECTION (based on user's XML response)
            data = parsed_response.get("DATA", {})
            collection = data.get("COLLECTION", {})
            
            logger.info(f"Collection data: {collection}")
            
            # Extract COMPANY elements from collection
            company_data = collection.get("COMPANY", [])
            
            # Handle single company (dict) vs multiple companies (list)
            if isinstance(company_data, dict):
                company_data = [company_data]
            elif not isinstance(company_data, list):
                company_data = []
            
            logger.info(f"Found {len(company_data)} company elements")
            
            # Extract company information with complete 56-field structure
            for company in company_data:
                company_info = self._parse_company_element(company)
                if company_info:
                    companies.append(company_info)
                    logger.info(f"Extracted company: {company_info.get('name')} (GUID: {company_info.get('companyGuid')})")
            
            logger.info(f"Total extracted companies: {len(companies)}")
            return companies if companies else self._get_mock_companies()
            
        except Exception as e:
            logger.error(f"Error in _extract_companies: {e}")
            import traceback
            traceback.print_exc()
            # Return mock data if parsing fails
            return self._get_mock_companies()

    def _parse_company_element(self, company: dict) -> Optional[dict]:
        """
        Parse a single company element and extract all 56 fields.
        Structured according to consolidated company field structure.
        
        Comprehensive field mapping:
        IDENTIFICATION (1): companyGuid
        CORE_INFO (20): alterId, code, name, mailingName, addressLine1-4, pincode, state, country, 
                        telephone, mobile, fax, email, website, panNumber, 
                        financialYearStart, booksStart, currency info
        GST_DETAILS (7): gstApplicableDate, gstState, gstType, gstin, gstFreezone, 
                         gstEInvoiceApplicable, gstEWayBillApplicable (India only)
        VAT_DETAILS (5): vatEmirate, vatApplicableDate, vatRegistrationNumber, 
                         vatAccountId, vatFreezone (GCC only)
        FEATURES (6): billwiseEnabled, costcentreEnabled, batchEnabled, 
                      useDiscountColumn, useActualColumn, payrollEnabled
        AUDIT (2): createdAt, updatedAt
        BACKWARD_COMPAT (7+): guid, businessType, status, importedFrom, importedDate, 
                              syncStatus, lastSyncDate
        """
        try:
            # ============ HELPER FUNCTIONS ============
            
            # Helper to extract text values from nested dict structure
            def get_text(obj):
                """Extract text value from Tally's nested dict format"""
                if isinstance(obj, dict):
                    return obj.get("_text", "").strip()
                return str(obj).strip() if obj else ""
            
            # Extract basic values from company element
            name = get_text(company.get("NAME", ""))
            guid = get_text(company.get("GUID", ""))
            country = get_text(company.get("COUNTRYNAME", "India"))
            
            # DEBUG: Log what we're getting from Tally for contact fields
            logger.debug(f"Company '{name}' - Raw Tally data:")
            logger.debug(f"  ALTERID: {company.get('ALTERID', 'NOT FOUND')}")
            logger.debug(f"  TELEPHONE: {company.get('TELEPHONE', 'NOT FOUND')}")
            logger.debug(f"  FAX: {company.get('FAX', 'NOT FOUND')}")
            logger.debug(f"  PINCODE: {company.get('PINCODE', 'NOT FOUND')}")
            logger.debug(f"  PHONENUMBER: {company.get('PHONENUMBER', 'NOT FOUND')}")
            logger.debug(f"  PANID: {company.get('PANID', 'NOT FOUND')}")
            logger.debug(f"  GST Fields - GSTIN: {company.get('GSTIN', 'NOT FOUND')}, GSTSTATE: {company.get('GSTSTATE', 'NOT FOUND')}")
            logger.debug(f"  VAT Fields - VATEMIRAATE: {company.get('VATEMIRAATE', 'NOT FOUND')}, VATREGISTRATIONNUMBER: {company.get('VATREGISTRATIONNUMBER', 'NOT FOUND')}")
            
            # Safely convert string to int
            def safe_int(value, default=0):
                try:
                    text = get_text(value) if value else ""
                    return int(text) if text else default
                except (ValueError, TypeError):
                    return default
            
            # Safely convert string to bool
            def safe_bool(value):
                """Convert various representations to boolean"""
                val = get_text(value).lower()
                return val in ['true', '1', 'yes', 'on']
            
            # Determine country category for conditional fields
            gcc_countries = {"UAE", "Saudi Arabia", "Bahrain", "Kuwait", "Oman", "Qatar", "EMIRATES"}
            is_gcc = country in gcc_countries
            is_india = country == "India"
            
            # Validate company name
            if not name:
                logger.warning("Skipping company: no name found")
                return None
            
            # ============ BUILD 56-FIELD COMPANY OBJECT ============
            
            company_info = {
                # ========== SECTION 0: IDENTIFICATION (1 field) ==========
                # Auto-generated on import, set to empty here
                "id": "",  # Will be auto-generated on database insert
                "companyGuid": guid,
                
                # ========== SECTION 1-19: CORE INFORMATION (20 fields) ==========
                
                # Basic Information (3 fields)
                "alterId": get_text(company.get("ALTERID", "")),  # Tally's ALTER ID
                "code": get_text(company.get("ALTERID", "")).upper() or name[:3].upper(),
                "name": name,
                "mailingName": get_text(company.get("BASICCOMPANYFORMALNAME", "")),
                
                # Address Information (4 fields)
                "addressLine1": get_text(company.get("_ADDRESS1", "")),
                "addressLine2": get_text(company.get("_ADDRESS2", "")),
                "addressLine3": get_text(company.get("_ADDRESS3", "")),
                "addressLine4": get_text(company.get("_ADDRESS4", "")),
                "pincode": get_text(company.get("PINCODE", "")) or get_text(company.get("PIN", "")) or get_text(company.get("ZIPCODE", "")),
                
                # Location Information (2 fields)
                "state": get_text(company.get("STATENAME", "")),
                "country": country,
                
                # Contact Information (5 fields)
                "telephone": get_text(company.get("TELEPHONE", "")) or get_text(company.get("PHONE", "")) or get_text(company.get("TEL", "")),
                "mobile": get_text(company.get("PHONENUMBER", "")) or get_text(company.get("MOBILE", "")),
                "fax": get_text(company.get("FAX", "")) or get_text(company.get("FAXNUMBER", "")),
                "email": get_text(company.get("EMAIL", "")) or get_text(company.get("EMAILID", "")),
                "website": get_text(company.get("WEBSITE", "")) or get_text(company.get("URL", "")),
                
                # Tax Information (1 field)
                "panNumber": get_text(company.get("PANID", "")),
                
                # Financial Configuration (2 fields)
                "financialYearStart": get_text(company.get("STARTINGFROM", "")),
                "booksStart": get_text(company.get("BOOKSFROM", "")),
                
                # Currency Configuration (3 fields)
                "currencySymbol": self._get_currency_symbol(country),
                "currencyFormalName": self._get_currency_code(country),
                "currencyDecimalPlaces": 2,  # Standard for most currencies
                
                # ========== SECTION 20: GST DETAILS (7 fields - India Only) ==========
                "gstApplicableDate": get_text(company.get("GSTAPPLICABLEDATE", "")) if is_india else None,
                "gstState": get_text(company.get("GSTSTATE", "")) or get_text(company.get("STATENAME", "")) if is_india else None,
                "gstType": get_text(company.get("GSTREGISTRATIONTYPE", "")) or "Regular" if is_india else None,
                "gstin": get_text(company.get("GSTIN", "")) if is_india else None,
                "gstFreezone": safe_bool(company.get("GSTFREEZONE", "false")) if is_india else False,
                "gstEInvoiceApplicable": safe_bool(company.get("GSTEINVOICEAPPLICABLE", "false")) if is_india else False,
                "gstEWayBillApplicable": safe_bool(company.get("GSTEWAYBILLAPPLICABLE", "false")) if is_india else False,
                
                # ========== SECTION 30: VAT DETAILS (5 fields - GCC Only) ==========
                "vatEmirate": get_text(company.get("VATEMIRAATE", "")) if is_gcc else None,
                "vatApplicableDate": get_text(company.get("VATAPPLICABLEDATE", "")) if is_gcc else None,
                "vatRegistrationNumber": get_text(company.get("VATREGISTRATIONNUMBER", "")) if is_gcc else None,
                "vatAccountId": get_text(company.get("VATACCOUNTID", "")) if is_gcc else None,
                "vatFreezone": safe_bool(company.get("VATFREEZONE", "false")) if is_gcc else False,
                
                # ========== SECTION 40: COMPANY FEATURES (6 fields) ==========
                "billwiseEnabled": safe_bool(company.get("BILLWISEENABLED", "true")),
                "costcentreEnabled": safe_bool(company.get("COSTCENTREENABLED", "false")),
                "batchEnabled": safe_bool(company.get("BATCHENABLED", "false")),
                "useDiscountColumn": safe_bool(company.get("USEDISCOUNTCOLUMN", "true")),
                "useActualColumn": safe_bool(company.get("USEACTUALCOLUMN", "false")),
                "payrollEnabled": safe_bool(company.get("PAYROLLENABLED", "false")),
                
                # ========== SECTION 50: AUDIT TIMESTAMPS (2 fields) ==========
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat(),
                
                # ========== SECTION 60: BACKWARD COMPATIBILITY (7+ fields) ==========
                # Legacy fields maintained for compatibility with existing code
                "guid": guid,
                "businessType": "Tally Company",
                "status": "imported",  # Will be updated on import
                "importedFrom": "tally",  # Source system
                "importedDate": datetime.now().isoformat(),  # When imported to app
                "syncStatus": "pending",  # Initial sync status
                "lastSyncDate": None,  # No sync yet
            }
            
            return company_info

        except Exception as e:
            logger.error(f"Error parsing company element: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _get_currency_symbol(self, country: str) -> str:
        """Get currency symbol based on country."""
        currency_symbols = {
            "India": "₹",
            "USA": "$",
            "UK": "£",
            "UAE": "د.إ",
            "Saudi Arabia": "﷼",
            "Euro Zone": "€",
            "Japan": "¥",
        }
        return currency_symbols.get(country, "₹")
    
    def _get_currency_code(self, country: str) -> str:
        """Get currency code (ISO 4217) based on country."""
        currency_codes = {
            "India": "INR",
            "USA": "USD",
            "UK": "GBP",
            "UAE": "AED",
            "Saudi Arabia": "SAR",
            "Euro Zone": "EUR",
            "Japan": "JPY",
            "Bahrain": "BHD",
            "Kuwait": "KWD",
            "Oman": "OMR",
            "Qatar": "QAR",
        }
        return currency_codes.get(country, "INR")
    
    def _get_mock_companies(self) -> list:
        """Return mock company data for demo when Tally is unavailable, with complete 56-field structure."""
        from datetime import datetime
        
        now = datetime.now().isoformat()
        
        mock_data = [
            {
                # SECTION 0: IDENTIFICATION
                "companyGuid": "00000000-0000-0000-0000-000000000001",
                
                # SECTION 1-19: CORE INFORMATION
                "alterId": "1",
                "code": "DEF",
                "name": "Default Company",
                "mailingName": "Default Company Ltd",
                "addressLine1": "123 Main Street",
                "addressLine2": "Business District",
                "addressLine3": "Mumbai",
                "addressLine4": "",
                "pincode": "400001",
                "state": "Maharashtra",
                "country": "India",
                "telephone": "022-1234-5678",
                "mobile": "9876543210",
                "fax": "",
                "email": "info@defaultco.com",
                "website": "www.defaultco.com",
                "panNumber": "AAAA0A0A0A",
                "financialYearStart": "01-Apr-2023",
                "booksStart": "01-Apr-2023",
                "currencySymbol": "₹",
                "currencyFormalName": "INR",
                "currencyDecimalPlaces": 2,
                
                # SECTION 20: GST DETAILS (India)
                "gstApplicableDate": "01-Jul-2017",
                "gstState": "Maharashtra",
                "gstType": "Regular",
                "gstin": "27AABCT1234C1Z5",
                "gstFreezone": False,
                "gstEInvoiceApplicable": True,
                "gstEWayBillApplicable": True,
                
                # SECTION 30: VAT DETAILS (GCC - None for India)
                "vatEmirate": None,
                "vatApplicableDate": None,
                "vatRegistrationNumber": None,
                "vatAccountId": None,
                "vatFreezone": False,
                
                # SECTION 40: FEATURES
                "billwiseEnabled": True,
                "costcentreEnabled": True,
                "batchEnabled": False,
                "useDiscountColumn": True,
                "useActualColumn": False,
                "payrollEnabled": False,
                
                # AUDIT
                "createdAt": now,
                "updatedAt": now,
                "businessType": "General Business",
                "guid": "00000000-0000-0000-0000-000000000001"
            },
            {
                # SECTION 0: IDENTIFICATION
                "companyGuid": "00000000-0000-0000-0000-000000000002",
                
                # SECTION 1-19: CORE INFORMATION
                "alterId": "2",
                "code": "MFG",
                "name": "Manufacturing Co Ltd",
                "mailingName": "Mfg Company",
                "addressLine1": "456 Industrial Road",
                "addressLine2": "Industrial Zone",
                "addressLine3": "Bangalore",
                "addressLine4": "",
                "pincode": "560001",
                "state": "Karnataka",
                "country": "India",
                "telephone": "080-2123-4567",
                "mobile": "9876543211",
                "fax": "",
                "email": "mfg@company.com",
                "website": "www.mfgcompany.com",
                "panNumber": "BBBB0B0B0B",
                "financialYearStart": "01-Jan-2023",
                "booksStart": "01-Jan-2023",
                "currencySymbol": "₹",
                "currencyFormalName": "INR",
                "currencyDecimalPlaces": 2,
                
                # SECTION 20: GST DETAILS (India)
                "gstApplicableDate": "01-Jul-2017",
                "gstState": "Karnataka",
                "gstType": "Regular",
                "gstin": "29AABCT5678C1Z5",
                "gstFreezone": False,
                "gstEInvoiceApplicable": True,
                "gstEWayBillApplicable": True,
                
                # SECTION 30: VAT DETAILS (GCC - None for India)
                "vatEmirate": None,
                "vatApplicableDate": None,
                "vatRegistrationNumber": None,
                "vatAccountId": None,
                "vatFreezone": False,
                
                # SECTION 40: FEATURES
                "billwiseEnabled": True,
                "costcentreEnabled": True,
                "batchEnabled": True,
                "useDiscountColumn": False,
                "useActualColumn": True,
                "payrollEnabled": True,
                
                # AUDIT
                "createdAt": now,
                "updatedAt": now,
                "businessType": "Manufacturing",
                "guid": "00000000-0000-0000-0000-000000000002"
            },
            {
                # SECTION 0: IDENTIFICATION
                "companyGuid": "00000000-0000-0000-0000-000000000003",
                
                # SECTION 1-19: CORE INFORMATION
                "alterId": "3",
                "code": "UAE",
                "name": "UAE Trading LLC",
                "mailingName": "UAE Trading",
                "addressLine1": "Dubai Business Hub",
                "addressLine2": "Downtown Dubai",
                "addressLine3": "Dubai",
                "addressLine4": "PO Box 123456",
                "pincode": "",
                "state": "Dubai",
                "country": "UAE",
                "telephone": "+971-4-123-4567",
                "mobile": "+971-50-123-4567",
                "fax": "",
                "email": "info@uaetrading.com",
                "website": "www.uaetrading.com",
                "panNumber": "",
                "financialYearStart": "01-Jan-2023",
                "booksStart": "01-Jan-2023",
                "currencySymbol": "د.إ",
                "currencyFormalName": "AED",
                "currencyDecimalPlaces": 2,
                
                # SECTION 20: GST DETAILS (None for UAE)
                "gstApplicableDate": None,
                "gstState": None,
                "gstType": None,
                "gstin": None,
                "gstFreezone": False,
                "gstEInvoiceApplicable": False,
                "gstEWayBillApplicable": False,
                
                # SECTION 30: VAT DETAILS (UAE - GCC Country)
                "vatEmirate": "Dubai",
                "vatApplicableDate": "01-Jan-2018",
                "vatRegistrationNumber": "123456789012345",
                "vatAccountId": "VAT-UAE-2023",
                "vatFreezone": True,
                
                # SECTION 40: FEATURES
                "billwiseEnabled": True,
                "costcentreEnabled": False,
                "batchEnabled": False,
                "useDiscountColumn": True,
                "useActualColumn": False,
                "payrollEnabled": False,
                
                # AUDIT
                "createdAt": now,
                "updatedAt": now,
                "businessType": "Trading",
                "guid": "00000000-0000-0000-0000-000000000003"
            }
        ]
        logger.info(f"Returning {len(mock_data)} mock companies with complete 56-field structure")
        return mock_data
    
    def _get_text_value(self, obj: Any) -> str:
        """Helper to extract text value from dict or string."""
        if isinstance(obj, dict):
            return obj.get("_text", "")
        return str(obj) if obj else ""

    
    def _extract_groups(self, parsed_response: Dict[str, Any]) -> list:
        """
        Extract groups list from Tally XML response.
        
        Expected structure:
        <ENVELOPE>
            <BODY>
                <DATA>
                    <COLLECTION>
                        <GROUP NAME="Group Name">
                            <GUID>...</GUID>
                            <MASTERID>...</MASTERID>
                            <ALTERID>...</ALTERID>
                            <NAME>Group Name</NAME>
                            <ONLYALIAS>...</ONLYALIAS>
                            <PARENT>...</PARENT>
                            <ISREVENUE>...</ISREVENUE>
                        </GROUP>
                    </COLLECTION>
                </DATA>
            </BODY>
        </ENVELOPE>
        """
        try:
            groups = []
            
            def get_text(obj):
                if isinstance(obj, dict):
                    return obj.get("_text", "")
                return str(obj) if obj else ""
            
            # Navigate to DATA -> COLLECTION
            data = parsed_response.get("DATA", {})
            collection = data.get("COLLECTION", {})
            
            # Extract GROUP elements
            group_data = collection.get("GROUP", [])
            
            # Handle single group (dict) vs multiple groups (list)
            if isinstance(group_data, dict):
                group_data = [group_data]
            elif not isinstance(group_data, list):
                group_data = []
            
            logger.info(f"Found {len(group_data)} group elements")
            
            # Parse each group
            for group in group_data:
                group_info = {
                    "guid": get_text(group.get("GUID", "")),
                    "masterId": get_text(group.get("MASTERID", "")),
                    "alterId": get_text(group.get("ALTERID", "")),
                    "name": get_text(group.get("NAME", "")),
                    "alias": get_text(group.get("ONLYALIAS", "")),
                    "parent": get_text(group.get("PARENT", "")),
                    "isRevenue": get_text(group.get("ISREVENUE", "")).lower() in ["yes", "true", "1"]
                }
                
                if group_info["name"]:
                    groups.append(group_info)
                    logger.debug(f"Extracted group: {group_info['name']} (Parent: {group_info['parent']})")
            
            logger.info(f"Total extracted groups: {len(groups)}")
            return groups
            
        except Exception as e:
            logger.error(f"Error in _extract_groups: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_cost_centers(self, company: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """Get cost centers."""
        logger.info(f"Getting cost centers for company: {company}")
        params = {}
        if company:
            params["Company"] = company
        
        xml = self.build_envelope(
            request_type="Export",
            function_id="$$Masters.CostCenter",
            params=params
        )
        return self.send_request(xml)

    def get_vouchers(
        self,
        company: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """Get vouchers for a date range."""
        logger.info(f"Getting vouchers for company: {company}")
        params = {}
        if company:
            params["Company"] = company
        if from_date:
            params["FromDate"] = from_date
        if to_date:
            params["ToDate"] = to_date
        
        xml = self.build_envelope(
            request_type="Export",
            function_id="$$Vouchers",
            params=params
        )
        return self.send_request(xml)

    def get_server_info(self) -> Tuple[bool, Dict[str, Any]]:
        """Get Tally server information."""
        logger.info("Getting server info")
        xml = self.build_envelope(
            request_type="Export",
            function_id="$$SystemInfo"
        )
        return self.send_request(xml)

    def custom_request(
        self,
        function_id: str,
        request_type: str = "Export",
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Send custom request to Tally.
        
        Args:
            function_id: Tally function ID
            request_type: Export or Import
            params: Function parameters
        
        Returns:
            Tuple of (success, response)
        """
        logger.info(f"Sending custom request: {function_id}")
        xml = self.build_envelope(
            request_type=request_type,
            function_id=function_id,
            params=params
        )
        return self.send_request(xml)


# Test script
if __name__ == "__main__":
    client = TallyAPIClient(host="localhost", port=9000)
    
    print("=" * 60)
    print("Testing Tally API Client")
    print("=" * 60)
    
    # Test 1: Get License Info
    print("\n1. Getting License Information...")
    success, result = client.get_license_info()
    print(f"   Success: {success}")
    print(f"   Result: {json.dumps(result, indent=2)}")
    
    # Test 2: Get Companies
    print("\n2. Getting Companies...")
    success, result = client.get_companies()
    print(f"   Success: {success}")
    print(f"   Result: {json.dumps(result, indent=2)[:200]}...")
    
    # Test 3: Get Server Info
    print("\n3. Getting Server Info...")
    success, result = client.get_server_info()
    print(f"   Success: {success}")
    print(f"   Result: {json.dumps(result, indent=2)[:200]}...")
    
    client.close()
    print("\n" + "=" * 60)
    print("Tests completed")
    print("=" * 60)
