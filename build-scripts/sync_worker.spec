# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for sync_worker.py
# This file configures how sync_worker.py is bundled into a standalone executable

import sys
import os

block_cipher = None

a = Analysis(
    ['sync_worker.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['requests', 'socket', 'json', 'logging', 'time', 'subprocess'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='sync_worker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
