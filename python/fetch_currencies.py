import json
import sys
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class CurrencyFetcher:
    """Fetcher for Tally Currencies."""
    
    def __init__(self, host='localhost', port=9000):
        self.client = TallyAPIClient(host=host, port=port)
        
    def fetch(self):
        success, result = self.client.get_currencies()
        return result

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    fetcher = CurrencyFetcher(host=args.tally_host, port=args.tally_port)
    currencies = fetcher.fetch()
    
    if isinstance(currencies, list):
        output_result(True, f"Successfully fetched {len(currencies)} currencies", data=currencies)
    else:
        output_result(False, f"Failed to fetch currencies: {currencies.get('error', 'Unknown error')}")

if __name__ == '__main__':
    main()
