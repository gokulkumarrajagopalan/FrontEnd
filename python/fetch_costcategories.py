import json
import sys
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class CostCategoryFetcher:
    """Fetcher for Tally Cost Categories."""
    
    def __init__(self, host='localhost', port=9000):
        self.client = TallyAPIClient(host=host, port=port)
        
    def fetch(self):
        success, result = self.client.get_costcategories()
        return result

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    fetcher = CostCategoryFetcher(host=args.tally_host, port=args.tally_port)
    categories = fetcher.fetch()
    
    if isinstance(categories, list):
        output_result(True, f"Successfully fetched {len(categories)} cost categories", data=categories)
    else:
        output_result(False, f"Failed to fetch cost categories: {categories.get('error', 'Unknown error')}")

if __name__ == '__main__':
    main()
