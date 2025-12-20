@echo off
REM Windows batch script to test fetch_vouchertypes.py
cd /d %~dp0\..
python -m unittest tests\test_fetch_vouchertypes.py
