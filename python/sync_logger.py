"""
Talliffy Sync Logger - Global logger instance with Windows-safe file rotation.
Also patches the `requests` library to support retries and structured error logging.
"""
import os
import sys
import logging
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
import requests
from requests.exceptions import RequestException

# Setup log directory
if getattr(sys, "frozen", False):
    LOG_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "Tallify", "logs")
else:
    LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
SYNC_LOG_FILE = os.path.join(LOG_DIR, "sync_worker.log")

class WindowsSafeRotatingFileHandler(RotatingFileHandler):
    """Windows-safe rotating file handler that handles file lock errors gracefully."""
    def doRollover(self):
        try:
            super().doRollover()
        except (OSError, PermissionError) as e:
            if "used by another process" not in str(e):
                raise

class StructuredLogger(logging.Logger):
    """Logger class equipped with structured methods for Talliffy Sync tracking."""
    
    def log_incremental(self, company_name, entity_type, synced, updated, unchanged, total_tally, total_db, alter_id, status):
        self.info(
            f"📊 [INCREMENTAL SYNC] Company: '{company_name}' | Entity: {entity_type} | "
            f"Synced: {synced} | Updated: {updated} | Unchanged: {unchanged} | "
            f"Total Tally: {total_tally} | Total DB: {total_db} | Max AlterID: {alter_id} | Status: {status}"
        )

    def log_reconciliation(self, company_name, entity_type, tally_count=0, db_count=0, missing=0, updated=0, synced=0, unchanged=0, status='success', error=None):
        err_msg = f" | Error: {error}" if error else ""
        self.info(
            f"🔍 [RECONCILIATION] Company: '{company_name}' | Entity: {entity_type} | "
            f"Tally Count: {tally_count} | DB Count: {db_count} | Missing: {missing} | "
            f"Updated: {updated} | Synced: {synced} | Unchanged: {unchanged} | Status: {status}{err_msg}"
        )

    def log_voucher_reconcile_start(self, company_name, from_date, to_date):
        self.info(f"🔍 [VOUCHER RECONCILIATION START] Company: '{company_name}' | Date Range: {from_date} to {to_date}")

    def log_voucher_reconcile_fetch(self, chunk_from, chunk_to, count, error=None):
        if error:
            self.error(f"⚠️ [VOUCHER RECONCILIATION FETCH FAILED] Period: {chunk_from} to {chunk_to} | Error: {error}")
        else:
            self.info(f"📥 [VOUCHER RECONCILIATION FETCH] Period: {chunk_from} to {chunk_to} | Fetched: {count} records")

    def log_voucher_reconcile_compare(self, company_name, tally_count, db_count, missing, needs_update, extra_in_db):
        self.info(
            f"📊 [VOUCHER RECONCILIATION COMPARE] Company: '{company_name}' | "
            f"Tally Vouchers: {tally_count} | DB Vouchers: {db_count} | "
            f"Missing in DB: {missing} | Stale in DB: {needs_update} | Extra in DB: {extra_in_db}"
        )

    def log_voucher_reconcile_complete(self, company_name, tally_count, db_count, missing, updated, synced, duration_seconds):
        self.info(
            f"✅ [VOUCHER RECONCILIATION COMPLETE] Company: '{company_name}' | "
            f"Tally: {tally_count} | DB: {db_count} | Synced: {synced} | "
            f"Remaining Missing: {missing} | Remaining Stale: {updated} | Duration: {duration_seconds:.2f}s"
        )

    def log_voucher_reconcile_resync_start(self, total_to_sync, chunk_count):
        self.info(f"🔄 [VOUCHER RECONCILIATION RESYNC START] Total to Sync: {total_to_sync} | Month Chunks: {chunk_count}")

    def log_voucher_reconcile_resync_chunk(self, chunk_num, total_chunks, from_date, to_date, found, synced, remaining):
        self.info(
            f"📅 [VOUCHER RECONCILIATION RESYNC CHUNK] Chunk {chunk_num}/{total_chunks} | "
            f"Period: {from_date} to {to_date} | Found: {found} | Synced: {synced} | Remaining to Sync: {remaining}"
        )

    def log_voucher_sync_single(self, company_name, from_date, to_date, count, elapsed_ms, last_alter_id=None, error=None):
        if error:
            self.error(f"❌ [VOUCHER SYNC FAILED] Company: '{company_name}' | Period: {from_date} to {to_date} | Error: {error}")
        else:
            self.info(
                f"✅ [VOUCHER SYNC SINGLE] Company: '{company_name}' | Period: {from_date} to {to_date} | "
                f"Synced: {count} | Last AlterID: {last_alter_id} | Duration: {elapsed_ms}ms"
            )

    def log_voucher_sync_start(self, company_name, from_date, to_date, sync_type, chunk_count):
        self.info(f"🚀 [VOUCHER SYNC START] Company: '{company_name}' | Period: {from_date} to {to_date} | Type: {sync_type} | Chunks: {chunk_count}")

    def log_voucher_sync_chunk(self, chunk_num, total_chunks, from_date, to_date, count, elapsed_ms, chunk_type, error=None):
        if error:
            self.error(f"❌ [VOUCHER SYNC CHUNK FAILED] Chunk {chunk_num}/{total_chunks} ({chunk_type}) | Period: {from_date} to {to_date} | Error: {error}")
        else:
            self.info(
                f"📅 [VOUCHER SYNC CHUNK] Chunk {chunk_num}/{total_chunks} ({chunk_type}) | Period: {from_date} to {to_date} | "
                f"Synced: {count} | Duration: {elapsed_ms}ms"
            )

    def log_voucher_sync_complete(self, company_name, total_vouchers, total_chunks, errors, duration_ms):
        self.info(
            f"🎉 [VOUCHER SYNC COMPLETE] Company: '{company_name}' | Total Synced: {total_vouchers} | "
            f"Chunks: {total_chunks} | Errors: {errors} | Duration: {duration_ms}ms"
        )

# Register custom logger class so future logging.getLogger calls produce it
logging.setLoggerClass(StructuredLogger)

def _bind_structured_logging_methods(logger_instance):
    """Defensive binding: Dynamically attach structured logging methods to make absolutely sure they exist."""
    methods = [
        "log_incremental",
        "log_reconciliation",
        "log_voucher_reconcile_start",
        "log_voucher_reconcile_fetch",
        "log_voucher_reconcile_compare",
        "log_voucher_reconcile_complete",
        "log_voucher_reconcile_resync_start",
        "log_voucher_reconcile_resync_chunk",
        "log_voucher_sync_single",
        "log_voucher_sync_start",
        "log_voucher_sync_chunk",
        "log_voucher_sync_complete"
    ]
    for method_name in methods:
        if not hasattr(logger_instance, method_name):
            # Bind the StructuredLogger method dynamically to the instance
            bound_method = getattr(StructuredLogger, method_name).__get__(logger_instance, logger_instance.__class__)
            setattr(logger_instance, method_name, bound_method)

# Global singleton logger
_global_logger = None

def get_sync_logger():
    """Get or create the global sync logger."""
    global _global_logger
    if _global_logger is None:
        _global_logger = logging.getLogger("sync_logger_global")
        if not _global_logger.handlers:
            _global_logger.setLevel(logging.INFO)
            handler = WindowsSafeRotatingFileHandler(SYNC_LOG_FILE, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
            handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
            _global_logger.addHandler(handler)
            _global_logger.propagate = False
            
    # Always apply defensive binding to ensure compatibility in case of pre-existing loggers
    _bind_structured_logging_methods(_global_logger)
    return _global_logger

class SyncLogger:
    """Legacy compatibility wrapper for structured logging."""
    def __init__(self, incremental_log=None, reconciliation_log=None):
        self.incremental_log = incremental_log or SYNC_LOG_FILE
        self.reconciliation_log = reconciliation_log or SYNC_LOG_FILE

# ─── Requests Monkey-Patching for Retries & Logging ─────────────────

_original_request = requests.Session.request

def patched_request(self, method, url, **kwargs):
    """
    Patched requests.Session.request that intercepts all outgoing HTTP requests,
    implementing robust error logging and transparent retries with backoff.
    """
    logger = get_sync_logger()
    
    # 1. Determine if Tally request or Remote Backend request
    is_tally = "localhost" in url or "127.0.0.1" in url or "9000" in url
    
    # 2. Set retry parameters (different backoffs: Tally is local so backoff faster; Backend is remote)
    max_retries = 3
    retry_status_codes = {429, 500, 502, 503, 504}
    
    initial_delay = 0.5 if is_tally else 1.0
    backoff_factor = 2
    
    dest_label = "Tally" if is_tally else "Backend API"
    attempt = 0
    
    while True:
        attempt += 1
        try:
            logger.info(f"📤 [{dest_label}] HTTP {method} {url} (Attempt {attempt}/{max_retries + 1})")
            
            # Execute original request
            response = _original_request(self, method, url, **kwargs)
            
            # Check for transient HTTP error status codes (only if we have retries left)
            if response.status_code in retry_status_codes and attempt <= max_retries:
                delay = initial_delay * (backoff_factor ** (attempt - 1))
                logger.warning(
                    f"⚠️ [{dest_label}] Received transient HTTP {response.status_code} from {url} "
                    f"(Attempt {attempt}/{max_retries + 1}). Retrying in {delay}s..."
                )
                time.sleep(delay)
                continue
                
            return response
            
        except RequestException as e:
            if attempt > max_retries:
                logger.error(
                    f"❌ [{dest_label}] Permanent failure: HTTP {method} {url} "
                    f"failed after {attempt} attempts. Error: {e}"
                )
                raise
                
            delay = initial_delay * (backoff_factor ** (attempt - 1))
            logger.warning(
                f"⚠️ [{dest_label}] Request failed (Attempt {attempt}/{max_retries + 1}): {method} {url}. "
                f"Error: {e}. Retrying in {delay}s..."
            )
            time.sleep(delay)

# Inject the patch
requests.Session.request = patched_request
