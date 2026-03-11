#!/usr/bin/env python3

import json
import sys
import time
import threading
import logging
import subprocess
from datetime import datetime
import os

# Setup logging - use %APPDATA%/Tallify for bundled exe (Program Files is read-only)
if getattr(sys, 'frozen', False):
    _base_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Tallify')
else:
    _base_dir = os.path.dirname(os.path.abspath(__file__))

log_dir = os.path.join(_base_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'sync_worker.log')

from logging.handlers import RotatingFileHandler

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'),
        logging.StreamHandler(sys.stderr)  # Use stderr so stdout stays clean for JSON IPC output
    ]
)
logger = logging.getLogger(__name__)


import argparse
from tally_api import TallyAPIClient
from incremental_sync import IncrementalSyncManager
from reconciliation import ReconciliationManager
from sync_master import SyncManager
from fetch_master_data import MasterDataFetcher
from sync_vouchers import VoucherSyncManager

class SyncWorker:
    """Manages periodic sync operations"""
    
    def __init__(self):
        self.running = False
        self.sync_thread = None
        self.tally_host = 'localhost'
        self.tally_port = 9000
        self.sync_interval = 1  # minutes
        self.last_sync_time = None
        
    def read_settings_from_stdin(self):
        """Read settings from Electron main process via stdin"""
        try:
            settings_json = sys.stdin.readline().strip()
            if settings_json:
                settings = json.loads(settings_json)
                self.tally_host = settings.get('tallyHost', 'localhost')
                self.tally_port = settings.get('tallyPort', 9000)
                self.sync_interval = settings.get('syncInterval', 1)
                logger.info(f"Settings loaded: Host={self.tally_host}, Port={self.tally_port}, Interval={self.sync_interval} minutes")
                return True
        except Exception as e:
            logger.error(f"Error reading settings: {e}")
        return False

    def check_connectivity(self):
        """Check internet and Tally server connectivity"""
        import socket
        import http.client
        
        internet = False
        tally = False
        
        # Check Internet (Google DNS)
        try:
            socket.gethostbyname("www.google.com")
            internet = True
        except (socket.gaierror, socket.timeout):
            internet = False
            
        # Check Tally
        try:
            conn = http.client.HTTPConnection(self.tally_host, self.tally_port, timeout=2)
            conn.request("HEAD", "/")
            conn.getresponse()
            tally = True
            conn.close()
        except Exception:
            tally = False
            
        return internet, tally
    
    def send_status(self, status_type, data=None):
        """Send status update to Electron main process"""
        try:
            internet, tally = self.check_connectivity()
            message = {
                'type': status_type,
                'timestamp': datetime.now().isoformat(),
                'internet': internet,
                'tally': tally,
                'host': self.tally_host,
                'port': self.tally_port,
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
        
        heartbeat_counter = 0
        while self.running:
            try:
                # Send heartbeat every 30 seconds (3 iterations of 10s sleep)
                if heartbeat_counter >= 3:
                    self.send_status('heartbeat')
                    heartbeat_counter = 0
                
                if self.last_sync_time is None:
                    self.run_sync()
                else:
                    elapsed_seconds = (datetime.now() - self.last_sync_time).total_seconds()
                    interval_seconds = self.sync_interval * 60
                    
                    if elapsed_seconds >= interval_seconds:
                        self.run_sync()
                
                time.sleep(10)
                heartbeat_counter += 1
                
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


def fetch_license(host, port):
    try:
        client = TallyAPIClient(host=host, port=port, timeout=10)
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

def fetch_companies(host, port):
    try:
        client = TallyAPIClient(host=host, port=port, timeout=10)
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
            tally_host=args.host,
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
        
        def run_voucher_reconciliation_script() -> dict:
            # When running as frozen EXE, always use in-process (no .py scripts available)
            if getattr(sys, 'frozen', False):
                logger.info('🧾 Running voucher reconciliation in-process (frozen EXE mode)')
                return manager.reconcile_vouchers(
                    company_id=int(args.company_id),
                    user_id=args.user_id,
                    company_guid=args.company_guid or '',
                    tally_host=args.host,
                    tally_port=args.port,
                    company_name=args.company_name,
                    from_date=args.from_date,
                    to_date=args.to_date
                )

            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voucher_reconciliation.py')
            if not os.path.exists(script_path):
                logger.warning('voucher_reconciliation.py not found, using in-process fallback')
                return manager.reconcile_vouchers(
                    company_id=int(args.company_id),
                    user_id=args.user_id,
                    company_guid=args.company_guid or '',
                    tally_host=args.host,
                    tally_port=args.port,
                    company_name=args.company_name,
                    from_date=args.from_date,
                    to_date=args.to_date
                )

            cmd = [
                sys.executable,
                script_path,
                '--company-id', str(args.company_id),
                '--user-id', str(args.user_id),
                '--backend-url', str(args.backend_url),
                '--auth-token', str(args.auth_token),
                '--device-token', str(args.device_token),
                '--host', str(args.host),
                '--port', str(args.port),
                '--company-name', str(args.company_name or ''),
                '--company-guid', str(args.company_guid or '')
            ]

            if args.from_date:
                cmd.extend(['--from-date', str(args.from_date)])
            if args.to_date:
                cmd.extend(['--to-date', str(args.to_date)])

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
            if proc.returncode != 0:
                logger.error(f'Voucher reconciliation script failed: {proc.stderr.strip()}')
                raise RuntimeError('Voucher reconciliation script failed')

            try:
                return json.loads(proc.stdout.strip() or '{}')
            except Exception:
                logger.error(f'Invalid JSON from voucher reconciliation script: {proc.stdout.strip()}')
                raise RuntimeError('Voucher reconciliation script returned invalid JSON')

        if args.entity_type.lower() == 'all':
            results = []

            # First reconcile all master entities
            ALL_MASTER_ENTITIES = [
                'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory',
                'CostCategory', 'CostCenter', 'Godown', 'VoucherType',
                'TaxUnit', 'Ledger', 'StockItem'
            ]
            for entity in ALL_MASTER_ENTITIES:
                res = manager.reconcile_entity(
                    company_id=int(args.company_id),
                    user_id=args.user_id,
                    entity_type=entity,
                    tally_host=args.host,
                    tally_port=args.port,
                    company_name=args.company_name
                )
                results.append(res)

            # Then run voucher reconciliation via dedicated script
            logger.info('🧾 Starting voucher reconciliation via voucher_reconciliation.py...')
            voucher_res = run_voucher_reconciliation_script()
            results.append(voucher_res)
            
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
        elif args.entity_type.lower() == 'voucher':
            # Reconcile vouchers only via dedicated script
            result = run_voucher_reconciliation_script()
            
            sync_manager.update_company_sync_status(
                int(args.company_id),
                'synced' if result.get('success') else 'failed',
                result.get('success', False)
            )
            
            print(json.dumps(result))
        else:
            result = manager.reconcile_entity(
                company_id=int(args.company_id),
                user_id=args.user_id,
                entity_type=args.entity_type,
                tally_host=args.host,
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
        import requests
        import xml.etree.ElementTree as ET
        
        tally_url = f"http://{args.host}:{args.port}"
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


def run_sync_master(args):
    """Run master data sync (sync_master.py logic)."""
    try:
        company_name = args.company_name
        cmp_id = int(args.company_id) if args.company_id else 1
        user_id = args.user_id or 1
        tally_host = args.host
        tally_port = args.port
        backend_url = args.backend_url or os.getenv("BACKEND_URL")
        auth_token = args.auth_token
        device_token = args.device_token

        if not company_name:
            print(json.dumps({'success': False, 'error': 'Company name is required'}))
            return

        manager = SyncManager(company_name, tally_host, tally_port, backend_url, auth_token, device_token)
        result = manager.sync_all(cmp_id, user_id, "INITIAL")
        print(json.dumps(result))
    except Exception as e:
        logger.error(f"Sync master error: {e}", exc_info=True)
        print(json.dumps({'success': False, 'error': str(e)}))


def run_fetch_master_data(args):
    """Run master data fetch (fetch_master_data.py logic)."""
    try:
        company_name = args.company_name
        tally_host = args.host
        tally_port = args.port
        is_first_sync = args.is_first_sync

        if not company_name:
            print(json.dumps({'success': False, 'data': {}, 'message': 'Company name is required'}))
            return

        fetcher = MasterDataFetcher(company_name, tally_host, tally_port)
        master_data = fetcher.fetch_all()

        result = {
            'success': True,
            'company': company_name,
            'data': master_data,
            'message': 'Master data fetched successfully'
        }
        print(json.dumps(result))
    except Exception as e:
        logger.error(f"Fetch master data error: {e}", exc_info=True)
        print(json.dumps({'success': False, 'data': {}, 'message': str(e)}))


def run_sync_vouchers(args):
    """Run voucher sync (sync_vouchers.py logic)."""
    try:
        company_id = int(args.company_id) if args.company_id else 1
        company_guid = args.company_guid or ''
        tally_host = args.host
        tally_port = args.port
        backend_url = args.backend_url or os.getenv('BACKEND_URL', '')
        auth_token = args.auth_token or ''
        device_token = args.device_token or ''
        
        # Compute sensible date defaults based on Indian financial year (Apr-Mar)
        now = datetime.now()
        if now.month >= 4:
            default_from = f"01-Apr-{now.year}"
            default_to = f"31-Mar-{now.year + 1}"
        else:
            default_from = f"01-Apr-{now.year - 1}"
            default_to = f"31-Mar-{now.year}"
        
        from_date = args.from_date or default_from
        to_date = args.to_date or default_to
        last_alter_id = args.last_voucher_alter_id
        company_name = args.company_name
        user_id = args.user_id or 1

        if not company_guid:
            print(json.dumps({'success': False, 'message': 'Company GUID required', 'count': 0}))
            return

        if not backend_url:
            print(json.dumps({'success': False, 'message': 'Backend URL required', 'count': 0}))
            return

        sync_manager = VoucherSyncManager(backend_url, auth_token, device_token)
        result = sync_manager.sync_vouchers(
            company_id=company_id,
            company_guid=company_guid,
            user_id=user_id,
            tally_host=tally_host,
            tally_port=tally_port,
            from_date=from_date,
            to_date=to_date,
            last_alter_id=last_alter_id,
            company_name=company_name
        )
        print(json.dumps(result))
    except Exception as e:
        logger.error(f"Voucher sync error: {e}", exc_info=True)
        print(json.dumps({'success': False, 'message': str(e), 'count': 0}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Tallify Sync Worker')
    parser.add_argument('--mode', choices=[
        'daemon', 'fetch-license', 'fetch-companies', 'incremental-sync',
        'reconcile', 'sync-bills-outstanding', 'sync-master',
        'fetch-master-data', 'sync-vouchers'
    ], default='daemon', help='Operation mode')
    parser.add_argument('--host', type=str, default='localhost', help='Tally server host/IP')
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
    
    # Additional arguments for new modes
    parser.add_argument('--company-guid', help='Company GUID (for voucher sync)')
    parser.add_argument('--from-date', help='From date (e.g., 01-Apr-2024)')
    parser.add_argument('--to-date', help='To date (e.g., 31-Mar-2025)')
    parser.add_argument('--last-voucher-alter-id', type=int, help='Last voucher alter ID')
    parser.add_argument('--is-first-sync', action='store_true', help='Is first sync (for fetch-master-data)')

    args = parser.parse_args()
    
    if args.mode == 'fetch-license':
        fetch_license(args.host, args.port)
    elif args.mode == 'fetch-companies':
        fetch_companies(args.host, args.port)
    elif args.mode == 'incremental-sync':
        run_incremental_sync(args)
    elif args.mode == 'reconcile':
        run_reconciliation(args)
    elif args.mode == 'sync-bills-outstanding':
        run_bills_outstanding_sync(args)
    elif args.mode == 'sync-master':
        run_sync_master(args)
    elif args.mode == 'fetch-master-data':
        run_fetch_master_data(args)
    elif args.mode == 'sync-vouchers':
        run_sync_vouchers(args)
    else:
        # Default daemon mode
        worker = SyncWorker()
        worker.start()
