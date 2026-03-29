#!/usr/bin/env python3

import argparse
import json
import logging
import os
import sys

from logging.handlers import RotatingFileHandler

from reconciliation import ReconciliationManager


# Setup logging: shared sync log + dedicated voucher reconciliation log
if getattr(sys, 'frozen', False):
    _base_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Tallify')
else:
    _base_dir = os.path.dirname(os.path.abspath(__file__))

log_dir = os.path.join(_base_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)
sync_log_file = os.path.join(log_dir, 'sync_worker.log')
voucher_recon_log_file = os.path.join(log_dir, 'voucher_reconciliation.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(sync_log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding='utf-8'),
        RotatingFileHandler(voucher_recon_log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding='utf-8'),
        logging.StreamHandler(sys.stderr),
    ],
)
logger = logging.getLogger(__name__)


def run(args):
    manager = ReconciliationManager(args.backend_url, args.auth_token, args.device_token)
    logger.info('🧾 Voucher reconciliation script started')
    logger.info(f'🧾 Voucher reconciliation log file: {voucher_recon_log_file}')

    # Load voucher cache from sync cache file if provided
    voucher_cache = None
    voucher_just_synced = False
    cache_file = getattr(args, 'sync_cache_file', None)
    if cache_file and os.path.isfile(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                sync_cache = json.load(f)
            voucher_cache = sync_cache.get('Voucher', None)
            synced_entities = sync_cache.get('_syncedEntities', [])
            voucher_just_synced = 'Voucher' in synced_entities
            if voucher_cache:
                logger.info(f'📦 Loaded voucher cache from {cache_file} ({len(voucher_cache)} records)')
            elif voucher_just_synced:
                logger.info(f'⚡ Voucher was just synced successfully — will skip Tally fetch')
        except Exception as cache_err:
            logger.warning(f'⚠️ Failed to load voucher cache: {cache_err}')

    result = manager.reconcile_vouchers(
        company_id=int(args.company_id),
        user_id=int(args.user_id),
        company_guid=args.company_guid or '',
        tally_host=args.host,
        tally_port=int(args.port),
        company_name=args.company_name,
        from_date=args.from_date,
        to_date=args.to_date,
        tally_cache=voucher_cache,
        skip_tally=voucher_just_synced and voucher_cache is None,
    )

    logger.info('🧾 Voucher reconciliation script completed')
    print(json.dumps(result))


def main():
    parser = argparse.ArgumentParser(description='Voucher reconciliation runner')
    parser.add_argument('--company-id', required=True)
    parser.add_argument('--user-id', required=True)
    parser.add_argument('--backend-url', required=True)
    parser.add_argument('--auth-token', required=True)
    parser.add_argument('--device-token', required=True)
    parser.add_argument('--host', default='localhost')
    parser.add_argument('--port', type=int, default=9000)
    parser.add_argument('--company-name', default='')
    parser.add_argument('--company-guid', default='')
    parser.add_argument('--from-date')
    parser.add_argument('--to-date')
    parser.add_argument('--sync-cache-file', help='Path to sync cache JSON file')

    args = parser.parse_args()

    try:
        run(args)
    except Exception as exc:
        logger.error(f'Voucher reconciliation fatal error: {exc}', exc_info=True)
        print(json.dumps({'success': False, 'message': str(exc), 'entityType': 'Voucher'}))
        sys.exit(1)


if __name__ == '__main__':
    main()
