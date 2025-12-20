import requests
import json
import sys
from datetime import datetime
from typing import List, Dict, Optional
from tally_api import TallyAPIClient
from tally_utils import get_common_args, output_result, setup_windows_encoding, setup_logging

class CostCategorySyncer:
    """Syncer for Tally Cost Categories to Backend."""
    
    def __init__(self, host="localhost", port=9000, backend_url="http://localhost:8080"):
        self.client = TallyAPIClient(host=host, port=port)
        self.backend_url = backend_url
    
    def sync(self, company_id: int, user_id: int, auth_token: str, device_token: str):
        """Fetches cost categories from Tally and syncs them to the backend."""
        # Step 1: Fetch from Tally
        success, categories = self.client.get_costcategories()
        if not success:
            output_result(False, f"Failed to fetch cost categories from Tally: {categories.get('error')}")
        
        # Step 2: Prepare for backend
        for cat in categories:
            cat['cmpId'] = company_id
            cat['userId'] = user_id
            cat['syncStatus'] = 'SYNCED'
            cat['lastSyncDate'] = datetime.now().isoformat()
        
        # Step 3: Send to backend
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {auth_token}',
                'X-Device-Token': device_token
            }
            response = requests.post(
                f"{self.backend_url}/cost-categories/sync",
                json=categories,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return True, result
                return False, result.get('message', 'Backend rejected sync')
            return False, f"HTTP Error {response.status_code}: {response.text}"
            
        except Exception as e:
            return False, str(e)

def main():
    setup_windows_encoding()
    args = get_common_args()
    setup_logging(args.debug)
    
    if args.company_id is None or args.user_id is None or not args.auth_token or not args.device_token:
        output_result(False, "Missing required arguments")
    
    syncer = CostCategorySyncer(host=args.tally_host, port=args.tally_port, backend_url=args.backend_url)
    success, result = syncer.sync(args.company_id, args.user_id, args.auth_token, args.device_token)
    
    if success:
        output_result(True, f"Successfully synced cost categories for company {args.company_id}", data=result)
    else:
        output_result(False, f"Sync failed: {result}")

if __name__ == '__main__':
    main()
