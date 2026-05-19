"""
Talliffy Sync Logger - Global logger instance with Windows-safe file rotation.
"""
import os
import sys
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

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
    return _global_logger

class SyncLogger:
    """Legacy compatibility wrapper for structured logging."""
    def __init__(self, incremental_log=None, reconciliation_log=None):
        self.incremental_log = incremental_log or SYNC_LOG_FILE
        self.reconciliation_log = reconciliation_log or SYNC_LOG_FILE
