#!/bin/bash
# Test fetch_vouchertypes.py against Tally at localhost:8080
cd "$(dirname "$0")/.."
python -m unittest tests/test_fetch_vouchertypes.py
