"""
TallySyncApp - Python Sync Worker
Background service for syncing Tally data
"""

import logging
import sys
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import Tally API client
from tally_api import TallyAPIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Logger:
    """Simple logger wrapper for consistency."""
    
    def __init__(self, name):
        self.logger = logging.getLogger(name)
    
    def info(self, msg):
        self.logger.info(msg)
    
    def warning(self, msg):
        self.logger.warning(msg)
    
    def error(self, msg):
        self.logger.error(msg)
    
    def debug(self, msg):
        self.logger.debug(msg)


class SyncEngine:
    """Manages synchronization operations in a separate thread."""

    def __init__(self):
        """Initialize the sync engine."""
        self.is_running = False
        self.sync_callback = None
        self.interval = 30
        logger = Logger(__name__)
        logger.info("SyncEngine initialized")

    def start_sync(self, sync_callback, interval=30):
        """Start the synchronization loop."""
        if self.is_running:
            logger = Logger(__name__)
            logger.warning("Sync already running")
            return False

        self.is_running = True
        self.sync_callback = sync_callback
        self.interval = interval
        
        logger = Logger(__name__)
        logger.info(f"Sync started with interval {interval}s")
        return True

    def stop_sync(self):
        """Stop the synchronization loop."""
        if not self.is_running:
            logger = Logger(__name__)
            logger.warning("Sync not running")
            return False

        self.is_running = False
        logger = Logger(__name__)
        logger.info("Sync stopped")
        return True

    def is_syncing(self):
        """Check if synchronization is currently running."""
        return self.is_running


class TallyChecker:
    """Checks Tally server connectivity status."""

    TIMEOUT = 5

    @staticmethod
    def check_tally(host="localhost", port=9000):
        """Check if Tally server is running and accessible."""
        try:
            import requests
            url = f"http://{host}:{port}"
            response = requests.get(url, timeout=TallyChecker.TIMEOUT)

            if response.status_code < 500:
                logger = Logger(__name__)
                logger.info(f"Tally check: available at {url}")
                return True, f"Connected to {host}:{port}"
            else:
                logger = Logger(__name__)
                logger.warning(f"Tally check: server error at {url}")
                return False, f"Server error at {host}:{port}"

        except Exception as e:
            logger = Logger(__name__)
            logger.error(f"Tally check failed: {e}")
            return False, f"Error: {str(e)}"

    @staticmethod
    def check_tally_port(host="localhost", port=9000):
        """Check if port is open using socket."""
        import socket

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(TallyChecker.TIMEOUT)

        try:
            result = sock.connect_ex((host, port))
            is_open = result == 0
            return is_open
        except Exception as e:
            logger = Logger(__name__)
            logger.error(f"Port check failed: {e}")
            return False
        finally:
            sock.close()


class NetChecker:
    """Checks internet connectivity status."""

    PING_HOST = "8.8.8.8"
    PING_TIMEOUT = 3

    @staticmethod
    def check_internet():
        """Check if internet is available."""
        try:
            import socket
            socket.create_connection(("8.8.8.8", 53), timeout=NetChecker.PING_TIMEOUT)
            logger = Logger(__name__)
            logger.info("Internet check: available")
            return True
        except:
            logger = Logger(__name__)
            logger.warning("Internet check: unavailable")
            return False


class ConfigManager:
    """Manages application configuration."""

    DEFAULT_CONFIG = {
        "host": "localhost",
        "port": 9000,
        "autosync": False,
        "interval": 30,
        "theme": "light",
        "debug": False
    }

    def __init__(self, config_file="config.json"):
        """Initialize config manager."""
        self.config_file = config_file
        self.config = self.load_config()
        logger = Logger(__name__)
        logger.info(f"ConfigManager initialized with {config_file}")

    def load_config(self):
        """Load configuration from config.json."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    logger = Logger(__name__)
                    logger.info("Configuration loaded successfully")
                    return config
            else:
                logger = Logger(__name__)
                logger.warning(f"Config file not found: {self.config_file}")
                return self.DEFAULT_CONFIG.copy()
        except Exception as e:
            logger = Logger(__name__)
            logger.error(f"Failed to load config: {e}")
            return self.DEFAULT_CONFIG.copy()

    def save_config(self):
        """Save configuration to config.json."""
        try:
            with open(self.config_file, "w") as f:
                json.dump(self.config, f, indent=2)
                logger = Logger(__name__)
                logger.info("Configuration saved successfully")
                return True
        except Exception as e:
            logger = Logger(__name__)
            logger.error(f"Failed to save config: {e}")
            return False

    def get(self, key, default=None):
        """Get configuration value."""
        return self.config.get(key, default)

    def set(self, key, value):
        """Set configuration value."""
        self.config[key] = value
        logger = Logger(__name__)
        logger.debug(f"Config set: {key} = {value}")

    def get_all(self):
        """Get entire configuration."""
        return self.config.copy()


class SyncWorker:
    """Main sync worker process."""

    def __init__(self):
        """Initialize worker."""
        self.config = ConfigManager()
        self.sync_engine = SyncEngine()
        self.logger = Logger(__name__)
        self.tally_client = None

    def initialize_tally_client(self):
        """Initialize Tally API client."""
        try:
            host = self.config.get("host", "localhost")
            port = self.config.get("port", 9000)
            self.tally_client = TallyAPIClient(host=host, port=port, timeout=10)
            self.logger.info(f"Tally client initialized for {host}:{port}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize Tally client: {e}")
            return False

    def fetch_license_info(self) -> Dict[str, Any]:
        """Fetch license information from Tally."""
        try:
            if not self.tally_client:
                return {"error": "Tally client not initialized"}
            
            success, result = self.tally_client.get_license_info()
            if success:
                self.logger.info("License info fetched successfully")
                return {"success": True, "data": result}
            else:
                self.logger.warning(f"License info fetch failed: {result}")
                return {"success": False, "error": result.get("error", "Unknown error")}
        except Exception as e:
            self.logger.error(f"Error fetching license info: {e}")
            return {"success": False, "error": str(e)}

    def fetch_companies(self) -> Dict[str, Any]:
        """Fetch companies from Tally."""
        try:
            if not self.tally_client:
                return {"error": "Tally client not initialized"}
            
            success, result = self.tally_client.get_companies()
            if success:
                self.logger.info("Companies fetched successfully")
                return {"success": True, "data": result}
            else:
                self.logger.warning(f"Companies fetch failed: {result}")
                return {"success": False, "error": result.get("error", "Unknown error")}
        except Exception as e:
            self.logger.error(f"Error fetching companies: {e}")
            return {"success": False, "error": str(e)}

    def fetch_ledgers(self, company: Optional[str] = None) -> Dict[str, Any]:
        """Fetch ledgers from Tally."""
        try:
            if not self.tally_client:
                return {"error": "Tally client not initialized"}
            
            success, result = self.tally_client.get_ledgers(company=company)
            if success:
                self.logger.info(f"Ledgers fetched successfully for {company}")
                return {"success": True, "data": result}
            else:
                self.logger.warning(f"Ledgers fetch failed: {result}")
                return {"success": False, "error": result.get("error", "Unknown error")}
        except Exception as e:
            self.logger.error(f"Error fetching ledgers: {e}")
            return {"success": False, "error": str(e)}

    def fetch_items(self, company: Optional[str] = None) -> Dict[str, Any]:
        """Fetch items from Tally."""
        try:
            if not self.tally_client:
                return {"error": "Tally client not initialized"}
            
            success, result = self.tally_client.get_items(company=company)
            if success:
                self.logger.info(f"Items fetched successfully for {company}")
                return {"success": True, "data": result}
            else:
                self.logger.warning(f"Items fetch failed: {result}")
                return {"success": False, "error": result.get("error", "Unknown error")}
        except Exception as e:
            self.logger.error(f"Error fetching items: {e}")
            return {"success": False, "error": str(e)}

    def perform_sync(self) -> Dict[str, Any]:
        """Perform full synchronization with Tally."""
        self.logger.info("Performing full sync operation")
        
        # Initialize Tally client if not already done
        if not self.tally_client:
            if not self.initialize_tally_client():
                return {
                    "timestamp": datetime.now().isoformat(),
                    "status": "error",
                    "message": "Failed to initialize Tally client"
                }
        
        # Check internet
        internet_ok = NetChecker.check_internet()
        self.logger.info(f"Internet status: {'OK' if internet_ok else 'DOWN'}")

        # Check Tally server
        host = self.config.get("host", "localhost")
        port = self.config.get("port", 9000)
        tally_ok, msg = TallyChecker.check_tally(host, port)
        self.logger.info(f"Tally status: {msg}")

        # Fetch data if Tally is available
        tally_data = {}
        if tally_ok:
            # Fetch license info
            license_info = self.fetch_license_info()
            tally_data["license"] = license_info
            
            # Fetch companies
            companies = self.fetch_companies()
            tally_data["companies"] = companies

        return {
            "timestamp": datetime.now().isoformat(),
            "internet": internet_ok,
            "tally": tally_ok,
            "host": host,
            "port": port,
            "data": tally_data
        }

    def run(self):
        """Run the worker."""
        self.logger.info("Sync worker started")
        
        try:
            # Perform initial sync
            result = self.perform_sync()
            print(json.dumps(result))
            sys.stdout.flush()
            
        except Exception as e:
            self.logger.error(f"Worker error: {e}")
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()


if __name__ == "__main__":
    worker = SyncWorker()
    worker.run()
