import argparse
import sys
import json
import logging
from typing import Dict, Any

def get_common_args():
    """Defines and parses common command-line arguments for sync scripts."""
    parser = argparse.ArgumentParser(description="TallySync Python Tool")
    
    # Tally Connection
    parser.add_argument("--tally-host", default="localhost", help="Tally server host")
    parser.add_argument("--tally-port", type=int, help="Tally server port")
    
    # Backend / Context
    parser.add_argument("--company-id", type=int, help="Backend Company ID")
    parser.add_argument("--user-id", type=int, help="Backend User ID")
    parser.add_argument("--auth-token", help="JWT Auth Token")
    parser.add_argument("--device-token", help="Device Token")
    parser.add_argument("--backend-url", help="Backend API URL")
    parser.add_argument("--company-name", help="Tally Company Name")
    
    # Execution
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    # Support for positional arguments (backward compatibility with legacy Electron calls)
    parser.add_argument('pos_args', nargs='*', help='Legacy positional arguments')
    
    args = parser.parse_args()
    
    # Defaults
    if args.tally_port is None:
        args.tally_port = 9000
    if args.backend_url is None:
        args.backend_url = "http://localhost:8080"
    
    # If positional arguments are provided, map them to named arguments if they are missing
    if args.pos_args:
        # Expected legacy order: company_id, user_id, auth_token, device_token, tally_port, backend_url
        if len(args.pos_args) >= 1 and args.company_id is None:
            try: args.company_id = int(args.pos_args[0])
            except ValueError: pass
        if len(args.pos_args) >= 2 and args.user_id is None:
            try: args.user_id = int(args.pos_args[1])
            except ValueError: pass
        if len(args.pos_args) >= 3 and args.auth_token is None:
            args.auth_token = args.pos_args[2]
        if len(args.pos_args) >= 4 and args.device_token is None:
            args.device_token = args.pos_args[3]
        if len(args.pos_args) >= 5 and (args.tally_port == 9000 or args.tally_port is None):
            try: args.tally_port = int(args.pos_args[4])
            except ValueError: pass
        if len(args.pos_args) >= 6 and (args.backend_url == 'http://localhost:8080' or args.backend_url is None):
            args.backend_url = args.pos_args[5]
            
    return args

def setup_logging(debug=False):
    """Configures logging for Tally sync scripts."""
    level = logging.DEBUG if debug else logging.WARNING
    logging.basicConfig(
        level=level,
        format='%(levelname)s:%(name)s:%(message)s',
        stream=sys.stderr
    )

def output_result(success: bool, message: str, data: Any = None, **kwargs):
    """Standardizes output format for frontend consumption."""
    from datetime import datetime
    result = {
        "success": success,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    if data is not None:
        result["data"] = data
    
    result.update(kwargs)
    
    # Ensure JSON is on a single line and easily identifiable
    print(json.dumps(result))
    sys.stdout.flush()
    sys.exit(0 if success else 1)

def setup_windows_encoding():
    """Configures UTF-8 encoding for Windows console."""
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
