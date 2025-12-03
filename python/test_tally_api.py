#!/usr/bin/env python3
"""
Test script for Tally API Client
Tests various Tally functions
"""

import json
import sys
import os
from tally_api import TallyAPIClient

def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_result(success, data):
    """Print formatted result."""
    print(f"✅ Success: {success}")
    if isinstance(data, dict):
        print(json.dumps(data, indent=2)[:500])
    else:
        print(str(data)[:500])

def main():
    """Run tests."""
    # Initialize client
    host = "localhost"
    port = 9000
    
    print_header(f"Tally API Client Test - {host}:{port}")
    
    try:
        client = TallyAPIClient(host=host, port=port, timeout=5)
        print("✅ Client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return 1

    tests = [
        ("License Info", lambda: client.get_license_info()),
        ("Companies", lambda: client.get_companies()),
        ("Server Info", lambda: client.get_server_info()),
        ("Ledgers", lambda: client.get_ledgers()),
        ("Items", lambda: client.get_items()),
        ("Groups", lambda: client.get_groups()),
        ("Cost Centers", lambda: client.get_cost_centers()),
    ]

    results = []
    for test_name, test_func in tests:
        print_header(f"Test: {test_name}")
        try:
            success, data = test_func()
            print_result(success, data)
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Error: {e}")
            results.append((test_name, False))

    # Summary
    print_header("Test Summary")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    for test_name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")

    client.close()
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
