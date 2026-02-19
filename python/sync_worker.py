#!/usr/bin/env python3

import json
import sys
import time
import threading
import logging
from datetime import datetime
import os

# Setup logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'sync_worker.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8', mode='a'),  # 'a' appends to keep history
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


import argparse
from tally_api import TallyAPIClient
from incremental_sync import IncrementalSyncManager
from reconciliation import ReconciliationManager

class SyncWorker:
    """Manages periodic sync operations"""
    
    def __init__(self):
        self.running = False
        self.sync_thread = None
        self.tally_port = 9000
        self.sync_interval = 1  # minutes
        self.last_sync_time = None
        
    def read_settings_from_stdin(self):
        """Read settings from Electron main process via stdin"""
        try:
            settings_json = sys.stdin.readline().strip()
            if settings_json:
                settings = json.loads(settings_json)
                self.tally_port = settings.get('tallyPort', 9000)
                self.sync_interval = settings.get('syncInterval', 1)
                logger.info(f"Settings loaded: Port={self.tally_port}, Interval={self.sync_interval} minutes")
                return True
        except Exception as e:
            logger.error(f"Error reading settings: {e}")
        return False
    
    def send_status(self, status_type, data=None):
        """Send status update to Electron main process"""
        try:
            message = {
                'type': status_type,
                'timestamp': datetime.now().isoformat(),
                'data': data or {}
            }
            print(json.dumps(message), flush=True)
        except (OSError, IOError) as e:
            # If stdout is broken/closed, we can't communicate with Electron.
            # Most likely Invalid Argument (22) or Broken Pipe (32).
            # We must stop the worker to prevent infinite error loops.
            logger.error(f"Stdout pipe broken/closed ({e}), stopping worker...")
            self.running = False
        except Exception as e:
            # Catch generalized OSError [Errno 22] or similar pipe errors
            error_str = str(e)
            if "Invalid argument" in error_str or "[Errno 22]" in error_str:
                logger.error(f"Stdout pipe invalid (likely closed): {e}")
                self.running = False
            else:
                logger.error(f"Error sending status: {e}")
    
    def run_sync(self):
        """Execute sync operation"""
        try:
            logger.info(f"Starting sync operation at {datetime.now()}")
            self.send_status('sync_started', {
                'tally_port': self.tally_port,
                'timestamp': datetime.now().isoformat()
            })
            
            time.sleep(2)
            
            self.last_sync_time = datetime.now()
            logger.info(f"Sync completed at {self.last_sync_time}")
            
            self.send_status('sync_completed', {
                'last_sync_time': self.last_sync_time.isoformat(),
                'next_sync_time': (datetime.now().timestamp() + self.sync_interval * 60)
            })
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            self.send_status('sync_error', {'error': str(e)})
    
    def sync_loop(self):
        """Main sync loop that runs at specified intervals"""
        logger.info(f"Sync loop started with interval: {self.sync_interval} minutes")
        
        while self.running:
            try:
                if self.last_sync_time is None:
                    self.run_sync()
                else:
                    elapsed_seconds = (datetime.now() - self.last_sync_time).total_seconds()
                    interval_seconds = self.sync_interval * 60
                    
                    if elapsed_seconds >= interval_seconds:
                        self.run_sync()
                
                time.sleep(10)
                
            except Exception as e:
                logger.error(f"Error in sync loop: {e}")
                time.sleep(10)
    
    def start(self):
        """Start the sync worker"""
        if self.running:
            logger.warning("Sync worker already running")
            return
        
        logger.info("Starting sync worker...")
        self.running = True
        
        if not self.read_settings_from_stdin():
            logger.error("Failed to read settings")
            self.send_status('error', {'message': 'Failed to read settings'})
            return
        
        self.sync_thread = threading.Thread(target=self.sync_loop, daemon=True)
        self.sync_thread.start()
        
        self.send_status('worker_started', {
            'tally_port': self.tally_port,
            'sync_interval': self.sync_interval
        })
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
            self.stop()
    
    def stop(self):
        """Stop the sync worker"""
        logger.info("Stopping sync worker...")
        self.running = False
        
        if self.sync_thread:
            self.sync_thread.join(timeout=5)
        
        self.send_status('worker_stopped', {
            'last_sync_time': self.last_sync_time.isoformat() if self.last_sync_time else None
        })


def fetch_license(port):
    try:
        client = TallyAPIClient(host='localhost', port=port, timeout=10)
        success, result = client.get_license_info()
        print(json.dumps({
            'success': success,
            'data': result if success else None,
            'error': None if success else str(result)
        }))
    except OSError:
        pass # Parent closed pipe
    except Exception as e:
        try:
            print(json.dumps({
                'success': False,
                'data': None,
                'error': str(e)
            }))
        except OSError:
            pass

def fetch_companies(port):
    try:
        client = TallyAPIClient(host='localhost', port=port, timeout=10)
        success, result = client.get_companies()
        print(json.dumps({
            'success': success,
            'data': result if success else None,
            'error': None if success else str(result)
        }))
    except OSError:
        pass # Parent closed pipe
    except Exception as e:
        try:
            print(json.dumps({
                'success': False,
                'data': None,
                'error': str(e)
            }))
        except OSError:
            pass

def run_incremental_sync(args):
    try:
        manager = IncrementalSyncManager(args.backend_url, args.auth_token, args.device_token, batch_size=args.batch_size)
        
        # If max_alter_id is not provided (0), usage depends on logic inside sync_incremental
        # It will fetch from backend if 0/None
        
        result = manager.sync_incremental(
            company_id=int(args.company_id),
            user_id=args.user_id,
            tally_port=args.port,
            entity_type=args.entity_type,
            # endpoint map logic is inside manager or we can pass default
            # simplified: let manager handle defaults based on entity_type
            last_alter_id=args.max_alter_id if args.max_alter_id > 0 else None,
            company_name=args.company_name
        )
        
        # Update company sync status after incremental sync
        manager.update_company_sync_status(
            int(args.company_id),
            'synced' if result.get('success') else 'failed',
            result.get('success', False)
        )
        
        print(json.dumps(result))
    except Exception as e:
        logger.error(f"Incremental sync error: {e}")
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))

def run_reconciliation(args):
    try:
        manager = ReconciliationManager(args.backend_url, args.auth_token, args.device_token, batch_size=args.batch_size)
        
        # Create sync manager for updating company status
        sync_manager = IncrementalSyncManager(args.backend_url, args.auth_token, args.device_token, batch_size=args.batch_size)
        
        if args.entity_type.lower() == 'all':
            # Reconcile all entities
            ALL_ENTITIES = [
                'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory',
                'CostCategory', 'CostCenter', 'Godown', 'VoucherType',
                'TaxUnit', 'Ledger', 'StockItem'
            ]
            results = []
            for entity in ALL_ENTITIES:
                res = manager.reconcile_entity(
                    company_id=int(args.company_id),
                    user_id=args.user_id,
                    entity_type=entity,
                    tally_port=args.port,
                    company_name=args.company_name
                )
                results.append(res)
            
            total_missing = sum(r.get('missing', 0) for r in results if r.get('success'))
            total_updated = sum(r.get('updated', 0) for r in results if r.get('success'))
            total_synced = sum(r.get('synced', 0) for r in results if r.get('success'))
            
            # Update company sync status after reconciliation
            all_success = all(r.get('success', False) for r in results)
            sync_manager.update_company_sync_status(
                int(args.company_id),
                'synced' if all_success else 'failed',
                all_success
            )
            
            print(json.dumps({
                'success': True,
                'totalMissing': total_missing,
                'totalUpdated': total_updated,
                'totalSynced': total_synced,
                'details': results
            }))
        else:
            result = manager.reconcile_entity(
                company_id=int(args.company_id),
                user_id=args.user_id,
                entity_type=args.entity_type,
                tally_port=args.port,
                company_name=args.company_name
            )
            
            # Update company sync status after reconciliation
            sync_manager.update_company_sync_status(
                int(args.company_id),
                'synced' if result.get('success') else 'failed',
                result.get('success', False)
            )
            
            print(json.dumps(result))
            
    except Exception as e:
        logger.error(f"Reconciliation error: {e}")
        print(json.dumps({'success': False, 'error': str(e)}))

def run_bills_outstanding_sync(args):
    """Fetch bills outstanding from Tally's built-in reports and push to backend.
    
    This is the missing link: Tally dashboard shows SUM of individual pending bills,
    NOT net ledger closing balance. Without this sync, the backend falls back to
    voucher-based computation which gives wrong Receivables/Payables totals.
    """
    try:
        import xml.etree.ElementTree as ET
        
        tally_url = f"http://localhost:{args.port}"
        backend_url = args.backend_url.rstrip('/')
        company_id = int(args.company_id)
        company_name = args.company_name or ''
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {args.auth_token}' if args.auth_token else '',
            'X-Device-Token': args.device_token or ''
        }
        
        def clean_xml(text):
            """Remove invalid XML characters."""
            import re
            return re.sub(r'[^\x09\x0A\x0D\x20-\x7E\x80-\xFF\u0100-\uFFFF]', '', text)

        def fetch_bills_from_tally(report_name):
            """Fetch bill-wise outstanding using Tally's built-in report export."""
            xml_req = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA>
<REQUESTDESC>
    <REPORTNAME>{report_name}</REPORTNAME>
    <STATICVARIABLES>
        <SVCOMPANY>{company_name}</SVCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA></BODY></ENVELOPE>"""
            
            try:
                resp = requests.post(tally_url, data=xml_req.encode('utf-8'),
                                     headers={'Content-Type': 'application/xml'},
                                     timeout=30)
                if resp.status_code != 200:
                    logger.error(f"Tally returned {resp.status_code} for {report_name}")
                    return []
                
                text = clean_xml(resp.text)
                root = ET.fromstring(text)
                elements = list(root)
                bills = []
                i = 0
                while i < len(elements):
                    el = elements[i]
                    if el.tag == 'BILLFIXED':
                        bill_date = (el.findtext('BILLDATE') or '').strip()
                        bill_ref = (el.findtext('BILLREF') or '').strip()
                        bill_party = (el.findtext('BILLPARTY') or '').strip()
                        bill_party = ' '.join(bill_party.split())  # normalize whitespace
                        
                        bill_cl = 0.0
                        bill_due = ''
                        bill_overdue = 0
                        credit_period = ''
                        
                        j = i + 1
                        while j < len(elements) and elements[j].tag != 'BILLFIXED':
                            tag = elements[j].tag
                            txt = (elements[j].text or '').strip()
                            if tag == 'BILLCL':
                                try:
                                    bill_cl = float(txt.replace(',', ''))
                                except (ValueError, TypeError):
                                    bill_cl = 0.0
                            elif tag == 'BILLDUE':
                                bill_due = txt
                            elif tag == 'BILLOVERDUE':
                                # Overdue can be like "30 days" or just "30"
                                try:
                                    bill_overdue = int(''.join(c for c in txt if c.isdigit() or c == '-')) if txt else 0
                                except ValueError:
                                    bill_overdue = 0
                            elif tag == 'BILLCREDITPERIOD':
                                credit_period = txt
                            j += 1
                        
                        pending = abs(bill_cl)
                        if pending > 0.001:
                            bills.append({
                                'partyName': bill_party,
                                'billRef': bill_ref,
                                'billDate': bill_date if bill_date else None,
                                'pendingAmount': round(pending, 2),
                                'drCr': 'Dr' if bill_cl < 0 else 'Cr',
                                'dueDate': bill_due if bill_due else None,
                                'overdueDays': bill_overdue,
                                'creditPeriod': credit_period
                            })
                        i = j
                    else:
                        i += 1
                
                return bills
            except requests.exceptions.ConnectionError:
                logger.error(f"Cannot connect to Tally at {tally_url}")
                return []
            except Exception as e:
                logger.error(f"Error fetching {report_name}: {e}")
                return []

        def push_to_backend(report_type, bills):
            """Push bill data to backend's /bills-outstanding/sync endpoint."""
            payload = {
                'cmpId': company_id,
                'reportType': report_type,
                'bills': bills
            }
            try:
                resp = requests.post(
                    f"{backend_url}/bills-outstanding/sync",
                    json=payload,
                    headers=headers,
                    timeout=30
                )
                if resp.status_code == 200:
                    result = resp.json()
                    return True, result.get('count', len(bills))
                else:
                    logger.error(f"Backend returned {resp.status_code}: {resp.text[:200]}")
                    return False, 0
            except Exception as e:
                logger.error(f"Error pushing {report_type} to backend: {e}")
                return False, 0

        # Fetch and sync both report types
        results = {}
        
        for report_name, report_type in [('Bills Receivable', 'receivable'), ('Bills Payable', 'payable')]:
            logger.info(f"Fetching {report_name} from Tally...")
            bills = fetch_bills_from_tally(report_name)
            logger.info(f"  -> {len(bills)} bills fetched")
            
            if bills:
                total = sum(b['pendingAmount'] for b in bills)
                logger.info(f"  -> Total {report_type}: {total:,.2f}")
                
                success, count = push_to_backend(report_type, bills)
                results[report_type] = {
                    'success': success,
                    'billCount': len(bills),
                    'savedCount': count,
                    'total': round(total, 2)
                }
            else:
                # No bills = clear existing data by sending empty list
                push_to_backend(report_type, [])
                results[report_type] = {
                    'success': True,
                    'billCount': 0,
                    'savedCount': 0,
                    'total': 0
                }
        
        all_success = all(r['success'] for r in results.values())
        print(json.dumps({
            'success': all_success,
            'message': 'Bills outstanding synced from Tally' if all_success else 'Partial failure',
            'receivable': results.get('receivable', {}),
            'payable': results.get('payable', {}),
        }))
        
    except Exception as e:
        logger.error(f"Bills outstanding sync error: {e}")
        print(json.dumps({'success': False, 'message': str(e)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tallify Sync Worker')
    parser.add_argument('--mode', choices=['daemon', 'fetch-license', 'fetch-companies', 'incremental-sync', 'reconcile', 'sync-bills-outstanding'], default='daemon', help='Operation mode')
    parser.add_argument('--port', type=int, default=9000, help='Tally port number')
    
    # Arguments for sync/reconciliation
    parser.add_argument('--company-id', help='Company ID')
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--backend-url', help='Backend URL')
    parser.add_argument('--auth-token', help='Auth Token')
    parser.add_argument('--device-token', help='Device Token')
    parser.add_argument('--entity-type', default='Ledger', help='Entity Type')
    parser.add_argument('--max-alter-id', type=int, default=0, help='Max Alter ID')
    parser.add_argument('--company-name', help='Company Name')
    parser.add_argument('--batch-size', type=int, default=500, help='Batch size for sync operations')

    args = parser.parse_args()
    
    if args.mode == 'fetch-license':
        fetch_license(args.port)
    elif args.mode == 'fetch-companies':
        fetch_companies(args.port)
    elif args.mode == 'incremental-sync':
        run_incremental_sync(args)
    elif args.mode == 'reconcile':
        run_reconciliation(args)
    elif args.mode == 'sync-bills-outstanding':
        run_bills_outstanding_sync(args)
    else:
        # Default daemon mode
        worker = SyncWorker()
        worker.start()
