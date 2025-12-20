import json
import sys
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class TaxUnitFetcher:
    """Fetcher for Tally Tax Units."""
    
    def __init__(self, host='localhost', port=9000):
        self.client = TallyAPIClient(host=host, port=port)
        
    def fetch(self):
        success, result = self.client.get_taxunits()
        return result

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    fetcher = TaxUnitFetcher(host=args.tally_host, port=args.tally_port)
    units = fetcher.fetch()
    
    if isinstance(units, list):
        output_result(True, f"Successfully fetched {len(units)} tax units", data=units)
    else:
        output_result(False, f"Failed to fetch tax units: {units.get('error', 'Unknown error')}")

if __name__ == '__main__':
    main()
