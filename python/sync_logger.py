"""
Talliffy Sync Logger
====================
Provides structured logging for incremental sync and reconciliation operations.
Writes to two log files (appends if they already exist):
  - logs/incremental_sync_report.log
  - logs/reconciliation_report.log

Each log entry includes: timestamp, master name, synced count, updated count, unchanged count.

Usage:
    from sync_logger import SyncLogger
    
    sync_log = SyncLogger()
    
    # Log an incremental sync result
    sync_log.log_incremental(
        company_name="My Company",
        entity_type="Ledger",
        synced=25,
        updated=10,
        unchanged=150,
        total_tally=185,
        total_db=160,
        alter_id=4520
    )
    
    # Log a reconciliation result
    sync_log.log_reconciliation(
        company_name="My Company",
        entity_type="Ledger",
        tally_count=185,
        db_count=185,
        missing=0,
        updated=0,
        synced=0,
        status="success"
    )
"""

import os
import sys
import json
from datetime import datetime


# ── Log directory & file paths ──────────────────────────────────────────────────
if getattr(sys, 'frozen', False):
    LOG_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Tallify', 'logs')
else:
    LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

SYNC_LOG_FILE = os.path.join(LOG_DIR, 'sync_report.log')
INCREMENTAL_LOG_FILE = SYNC_LOG_FILE
RECONCILIATION_LOG_FILE = SYNC_LOG_FILE


class SyncLogger:
    """
    Structured logger for sync operations.
    Appends to existing log files — never overwrites.
    """

    def __init__(self, incremental_log=None, reconciliation_log=None):
        self.incremental_log = incremental_log or INCREMENTAL_LOG_FILE
        self.reconciliation_log = reconciliation_log or RECONCILIATION_LOG_FILE

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _timestamp():
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    @staticmethod
    def _write(filepath, text):
        """Append text to a log file using a rotating file handler."""
        import logging
        from logging.handlers import RotatingFileHandler
        
        # Create a logger specific to this file to handle rotation
        logger_name = f'sync_logger_{os.path.basename(filepath)}'
        file_logger = logging.getLogger(logger_name)
        
        # Only add the handler once
        if not file_logger.handlers:
            file_logger.setLevel(logging.INFO)
            # 10 MB per file, keep 5 backups
            handler = RotatingFileHandler(filepath, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
            # Custom formatter that just passes the text through without prepending timestamps 
            # (since the text already has it)
            handler.setFormatter(logging.Formatter('%(message)s'))
            file_logger.addHandler(handler)
            file_logger.propagate = False
            
        file_logger.info(text.rstrip('\n'))

    # ── Incremental Sync Log ─────────────────────────────────────────────────

    def log_incremental(
        self,
        company_name: str,
        entity_type: str,
        synced: int = 0,
        updated: int = 0,
        unchanged: int = 0,
        total_tally: int = 0,
        total_db: int = 0,
        alter_id: int = 0,
        status: str = 'success',
        error: str = None,
        extra: dict = None,
    ):
        """
        Log a single incremental-sync operation result.

        Parameters
        ----------
        company_name : str   – Tally company name
        entity_type  : str   – Master name (Ledger, Group, StockItem …)
        synced       : int   – Number of records synced (new inserts)
        updated      : int   – Number of records updated
        unchanged    : int   – Number of records unchanged
        total_tally  : int   – Total records in Tally
        total_db     : int   – Total records in database
        alter_id     : int   – Last AlterID after sync
        status       : str   – 'success' or 'failed'
        error        : str   – Error message (when failed)
        extra        : dict  – Any additional key-value pairs to log
        """
        ts = self._timestamp()
        icon = '✅' if status == 'success' else '❌'

        lines = [
            f"\n{'─' * 90}\n",
            f"  {icon} INCREMENTAL SYNC  |  {ts}\n",
            f"{'─' * 90}\n",
            f"  Company      : {company_name}\n",
            f"  Master       : {entity_type}\n",
            f"  Status       : {status.upper()}\n",
            f"  Last AlterID : {alter_id}\n",
            f"\n",
            f"  ┌──────────────────────────────────────────┐\n",
            f"  │  Synced (New)    :  {str(synced).rjust(8)}            │\n",
            f"  │  Updated         :  {str(updated).rjust(8)}            │\n",
            f"  │  Unchanged       :  {str(unchanged).rjust(8)}            │\n",
            f"  │  ──────────────────────────────────────── │\n",
            f"  │  Total Tally     :  {str(total_tally).rjust(8)}            │\n",
            f"  │  Total DB        :  {str(total_db).rjust(8)}            │\n",
            f"  └──────────────────────────────────────────┘\n",
        ]

        if error:
            lines.append(f"\n  ⚠ Error: {error}\n")

        if extra:
            lines.append(f"\n  Additional Info:\n")
            for k, v in extra.items():
                lines.append(f"    {k}: {v}\n")

        lines.append(f"{'─' * 90}\n")

        self._write(self.incremental_log, ''.join(lines))

    def log_incremental_summary(
        self,
        company_name: str,
        entity_results: list,
        total_synced: int = 0,
        duration_seconds: float = 0,
    ):
        """
        Log a summary after syncing all masters for a company.

        entity_results: list of dicts with keys:
            entity, synced, updated, unchanged, status
        """
        ts = self._timestamp()
        lines = [
            f"\n{'═' * 90}\n",
            f"  📋 INCREMENTAL SYNC SUMMARY  |  {ts}\n",
            f"  Company: {company_name}\n",
            f"{'═' * 90}\n",
            f"\n",
            f"  {'Master':<20} {'Synced':>8} {'Updated':>8} {'Unchanged':>10} {'Status':>10}\n",
            f"  {'─' * 20} {'─' * 8} {'─' * 8} {'─' * 10} {'─' * 10}\n",
        ]

        for r in entity_results:
            entity = r.get('entity', '?')
            s = r.get('synced', r.get('count', 0))
            u = r.get('updated', 0)
            uc = r.get('unchanged', 0)
            st = r.get('status', 'success')
            lines.append(f"  {entity:<20} {s:>8} {u:>8} {uc:>10} {st:>10}\n")

        lines.append(f"  {'─' * 20} {'─' * 8} {'─' * 8} {'─' * 10} {'─' * 10}\n")
        lines.append(f"  {'TOTAL':<20} {total_synced:>8}\n")

        if duration_seconds > 0:
            mins, secs = divmod(int(duration_seconds), 60)
            lines.append(f"\n  ⏱ Duration: {mins}m {secs}s\n")

        lines.append(f"{'═' * 90}\n")

        self._write(self.incremental_log, ''.join(lines))

    # ── Reconciliation Log ───────────────────────────────────────────────────

    def log_reconciliation(
        self,
        company_name: str,
        entity_type: str,
        tally_count: int = 0,
        db_count: int = 0,
        missing: int = 0,
        updated: int = 0,
        synced: int = 0,
        unchanged: int = 0,
        status: str = 'success',
        error: str = None,
        missing_details: list = None,
        update_details: list = None,
        extra: dict = None,
    ):
        """
        Log a single reconciliation operation result.

        Parameters
        ----------
        company_name : str   – Tally company name
        entity_type  : str   – Master name (Ledger, Group …)
        tally_count  : int   – Total records in Tally
        db_count     : int   – Total records in database
        missing      : int   – Records in Tally but not in DB
        updated      : int   – Records that needed update (AlterID mismatch)
        synced       : int   – Records actually synced/fixed
        unchanged    : int   – Records that matched perfectly
        status       : str   – 'success' or 'failed'
        error        : str   – Error message (when failed)
        missing_details  : list – First N missing records [{name, masterID, alterID}]
        update_details   : list – First N update records [{name, tallyAlterID, dbAlterID}]
        extra        : dict  – Any additional key-value pairs
        """
        # Compute unchanged if not provided
        if unchanged == 0 and tally_count > 0:
            unchanged = tally_count - missing - updated

        ts = self._timestamp()
        icon = '✅' if status == 'success' else '❌'
        match_status = '✅ All records in sync!' if (missing == 0 and updated == 0) else '⚠ Differences found'

        lines = [
            f"\n{'─' * 90}\n",
            f"  {icon} RECONCILIATION  |  {ts}\n",
            f"{'─' * 90}\n",
            f"  Company      : {company_name}\n",
            f"  Master       : {entity_type}\n",
            f"  Status       : {status.upper()}\n",
            f"  Result       : {match_status}\n",
            f"\n",
            f"  ┌──────────────────────────────────────────┐\n",
            f"  │  Tally Records   :  {str(tally_count).rjust(8)}            │\n",
            f"  │  DB Records      :  {str(db_count).rjust(8)}            │\n",
            f"  │  ──────────────────────────────────────── │\n",
            f"  │  Missing in DB   :  {str(missing).rjust(8)}            │\n",
            f"  │  Needs Update    :  {str(updated).rjust(8)}            │\n",
            f"  │  Unchanged       :  {str(unchanged).rjust(8)}            │\n",
            f"  │  Synced / Fixed  :  {str(synced).rjust(8)}            │\n",
            f"  └──────────────────────────────────────────┘\n",
        ]

        if error:
            lines.append(f"\n  ⚠ Error: {error}\n")

        if missing_details:
            lines.append(f"\n  📝 Missing in DB (first {len(missing_details)}):\n")
            for rec in missing_details:
                name = rec.get('name', '?')
                mid = rec.get('masterID', '?')
                aid = rec.get('alterID', '?')
                lines.append(f"     • {name}  (MasterID: {mid}, AlterID: {aid})\n")

        if update_details:
            lines.append(f"\n  🔄 Needs Update (first {len(update_details)}):\n")
            for rec in update_details:
                name = rec.get('name', '?')
                t_aid = rec.get('tallyAlterID', '?')
                d_aid = rec.get('dbAlterID', '?')
                lines.append(f"     • {name}  (Tally: {t_aid} → DB: {d_aid})\n")

        if extra:
            lines.append(f"\n  Additional Info:\n")
            for k, v in extra.items():
                lines.append(f"    {k}: {v}\n")

        lines.append(f"{'─' * 90}\n")

        self._write(self.reconciliation_log, ''.join(lines))

    def log_reconciliation_summary(
        self,
        company_name: str,
        entity_results: list,
        duration_seconds: float = 0,
    ):
        """
        Log a summary after reconciling all masters for a company.

        entity_results: list of dicts with keys:
            entity, tally_count, db_count, missing, updated, unchanged, synced, status
        """
        ts = self._timestamp()
        lines = [
            f"\n{'═' * 90}\n",
            f"  📋 RECONCILIATION SUMMARY  |  {ts}\n",
            f"  Company: {company_name}\n",
            f"{'═' * 90}\n",
            f"\n",
            f"  {'Master':<20} {'Tally':>7} {'DB':>7} {'Missing':>8} {'Updated':>8} {'Unchanged':>10} {'Synced':>7}\n",
            f"  {'─' * 20} {'─' * 7} {'─' * 7} {'─' * 8} {'─' * 8} {'─' * 10} {'─' * 7}\n",
        ]

        for r in entity_results:
            entity = r.get('entity', r.get('entityType', '?'))
            tc = r.get('tally_count', r.get('tallyCount', 0))
            dc = r.get('db_count', r.get('dbCount', 0))
            m = r.get('missing', 0)
            u = r.get('updated', 0)
            uc = r.get('unchanged', tc - m - u if tc > 0 else 0)
            s = r.get('synced', 0)
            lines.append(f"  {entity:<20} {tc:>7} {dc:>7} {m:>8} {u:>8} {uc:>10} {s:>7}\n")

        lines.append(f"  {'─' * 20} {'─' * 7} {'─' * 7} {'─' * 8} {'─' * 8} {'─' * 10} {'─' * 7}\n")

        if duration_seconds > 0:
            mins, secs = divmod(int(duration_seconds), 60)
            lines.append(f"\n  ⏱ Duration: {mins}m {secs}s\n")

        lines.append(f"{'═' * 90}\n")

        self._write(self.reconciliation_log, ''.join(lines))


# ── Singleton instance (import-ready) ───────────────────────────────────────────
_default_logger = None


def get_sync_logger():
    """Return a shared SyncLogger instance."""
    global _default_logger
    if _default_logger is None:
        _default_logger = SyncLogger()
    return _default_logger


# ── Quick test ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    logger = SyncLogger()

    # Simulate incremental sync entries
    masters = [
        ('Group', 12, 2, 45),
        ('Ledger', 35, 8, 220),
        ('StockItem', 5, 0, 180),
        ('StockGroup', 0, 0, 15),
        ('Currency', 1, 0, 3),
        ('Unit', 0, 0, 10),
        ('CostCenter', 3, 1, 22),
        ('VoucherType', 0, 0, 18),
        ('Godown', 2, 0, 8),
    ]

    entity_results = []
    total = 0
    for master, synced, updated, unchanged in masters:
        total_tally = synced + updated + unchanged
        logger.log_incremental(
            company_name='Demo Pvt Ltd',
            entity_type=master,
            synced=synced,
            updated=updated,
            unchanged=unchanged,
            total_tally=total_tally,
            total_db=updated + unchanged,
            alter_id=1000 + synced,
        )
        total += synced
        entity_results.append({
            'entity': master,
            'synced': synced,
            'updated': updated,
            'unchanged': unchanged,
            'status': 'success'
        })

    logger.log_incremental_summary(
        company_name='Demo Pvt Ltd',
        entity_results=entity_results,
        total_synced=total,
        duration_seconds=42,
    )

    # Simulate reconciliation entries
    recon_results = []
    for master, synced, updated, unchanged in masters:
        total_tally = synced + updated + unchanged
        missing = synced  # treat synced as "were missing" for demo
        logger.log_reconciliation(
            company_name='Demo Pvt Ltd',
            entity_type=master,
            tally_count=total_tally,
            db_count=updated + unchanged,
            missing=missing,
            updated=updated,
            synced=missing + updated,
            unchanged=unchanged,
        )
        recon_results.append({
            'entity': master,
            'tally_count': total_tally,
            'db_count': updated + unchanged,
            'missing': missing,
            'updated': updated,
            'unchanged': unchanged,
            'synced': missing + updated,
        })

    logger.log_reconciliation_summary(
        company_name='Demo Pvt Ltd',
        entity_results=recon_results,
        duration_seconds=38,
    )

    print(f"Test logs written to:")
    print(f"   {INCREMENTAL_LOG_FILE}")
    print(f"   {RECONCILIATION_LOG_FILE}")
