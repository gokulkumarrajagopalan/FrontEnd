import json
import sys
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class VoucherTypeFetcher:
    """Fetcher for Tally Voucher Types."""
    
    def __init__(self, host="localhost", port=9000):
        self.client = TallyAPIClient(host=host, port=port)
    
    def fetch(self):
        """Fetches and processes voucher types."""
        success, result = self.client.get_vouchertypes()
        if not success:
            output_result(False, f"Failed to fetch voucher types: {result.get('error')}")
        
        return result

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    fetcher = VoucherTypeFetcher(host=args.tally_host, port=args.tally_port)
    vouchertypes = fetcher.fetch()
    
    output_result(True, f"Successfully fetched {len(vouchertypes)} voucher types", data=vouchertypes)

if __name__ == '__main__':
    main()
