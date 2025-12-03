#!/usr/bin/env python3
"""
Quick Sync Tester
Test the Python sync worker directly without Electron
"""

import subprocess
import sys
import os
import json
import time

def test_sync_worker():
    """Test sync_worker.py directly"""
    print("=" * 60)
    print("🧪 TALLY SYNC WORKER TESTER")
    print("=" * 60)
    
    # Check Python
    print("\n📋 Step 1: Checking Python...")
    try:
        result = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f"✅ Python: {result.stdout.strip()}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Check sync_worker.py exists
    print("\n📋 Step 2: Checking sync_worker.py...")
    worker_path = os.path.join(os.path.dirname(__file__), "sync_worker.py")
    if os.path.exists(worker_path):
        print(f"✅ Found: {worker_path}")
    else:
        print(f"❌ Not found: {worker_path}")
        return False
    
    # Run sync worker
    print("\n📋 Step 3: Running sync worker...")
    try:
        process = subprocess.Popen(
            [sys.executable, worker_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.path.dirname(__file__)
        )
        
        print("⏳ Waiting for output...")
        # Wait for a few updates
        for i in range(5):
            line = process.stdout.readline()
            if line:
                print(f"   Update {i+1}: {line.strip()}")
                try:
                    data = json.loads(line.strip())
                    print(f"   ✅ Valid JSON:")
                    print(f"      Internet: {data.get('internet', 'N/A')}")
                    print(f"      Tally: {data.get('tally', 'N/A')}")
                    print(f"      Host: {data.get('host', 'N/A')}:{data.get('port', 'N/A')}")
                except json.JSONDecodeError:
                    print(f"   ⚠️ Not JSON")
            else:
                time.sleep(0.5)
        
        # Terminate
        process.terminate()
        process.wait(timeout=5)
        print("\n✅ Sync worker test completed successfully!")
        return True
        
    except subprocess.TimeoutExpired:
        process.kill()
        print("❌ Timeout waiting for worker")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_sync_worker()
    sys.exit(0 if success else 1)
