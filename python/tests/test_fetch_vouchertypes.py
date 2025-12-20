import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fetch_vouchertypes import fetch_vouchertypes_from_tally, parse_vouchertype_response

class TestFetchVoucherTypes(unittest.TestCase):
    def test_fetch_and_parse(self):
        xml_response = fetch_vouchertypes_from_tally('http://localhost:9000')
        self.assertIn('<ENVELOPE>', xml_response)
        vouchertypes = parse_vouchertype_response(xml_response)
        self.assertIsInstance(vouchertypes, list)
        # At least one voucher type should be present if Tally is running
        self.assertGreater(len(vouchertypes), 0)
        # Check for expected keys in the first voucher type
        keys = {'NAME', 'GUID', 'PARENT', 'MAILINGNAME', 'ISACTIVE', 'ALTERID', 'MASTERID', 'VOUCHERNUMBERSERIES'}
        self.assertTrue(keys.issubset(set(vouchertypes[0].keys())))

if __name__ == '__main__':
    unittest.main()
