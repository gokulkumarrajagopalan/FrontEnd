#!/usr/bin/env python3
"""
Sync Worker - Runs sync scripts at specified intervals
Reads settings from Electron app via stdin and manages periodic sync operations
"""

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

log_file = os.path.join(log_dir, f'sync_worker_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


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
        except Exception as e:
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


if __name__ == '__main__':
    worker = SyncWorker()
    worker.start()
