import json
import sys
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class CostCentreFetcher:
    """Fetcher for Tally Cost Centres."""
    
    def __init__(self, host='localhost', port=9000):
        self.client = TallyAPIClient(host=host, port=port)
        
    def fetch(self):
        success, result = self.client.get_costcentres()
        return result

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    fetcher = CostCentreFetcher(host=args.tally_host, port=args.tally_port)
    centres = fetcher.fetch()
    
    if isinstance(centres, list):
        output_result(True, f"Successfully fetched {len(centres)} cost centres", data=centres)
    else:
        output_result(False, f"Failed to fetch cost centres: {centres.get('error', 'Unknown error')}")

if __name__ == '__main__':
    main()
