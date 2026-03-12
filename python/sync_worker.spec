# -*- mode: python ; coding: utf-8 -*-

import os

# Collect all local Python modules in the python/ directory
_src_dir = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['sync_worker.py'],
    pathex=[_src_dir],
    binaries=[],
    datas=[
        # Include all local Python modules so they are available at runtime
        (os.path.join(_src_dir, 'tally_api.py'), '.'),
        (os.path.join(_src_dir, 'incremental_sync.py'), '.'),
        (os.path.join(_src_dir, 'reconciliation.py'), '.'),
        (os.path.join(_src_dir, 'sync_master.py'), '.'),
        (os.path.join(_src_dir, 'fetch_master_data.py'), '.'),
        (os.path.join(_src_dir, 'sync_vouchers.py'), '.'),
        (os.path.join(_src_dir, 'sync_bills_outstanding.py'), '.'),
        (os.path.join(_src_dir, 'sync_logger.py'), '.'),
        (os.path.join(_src_dir, 'voucher_reconciliation.py'), '.'),
    ],
    hiddenimports=[
        # HTTP / networking
        'requests',
        'requests.adapters',
        'requests.auth',
        'requests.cookies',
        'requests.exceptions',
        'requests.models',
        'requests.sessions',
        'requests.structures',
        'urllib3',
        'urllib3.contrib',
        'urllib3.contrib.pyopenssl',
        'urllib3.util',
        'urllib3.util.retry',
        'charset_normalizer',
        'idna',
        'certifi',
        # Standard library (occasionally missed by PyInstaller)
        'xml.etree.ElementTree',
        'xml.etree',
        'logging.handlers',
        # Optional: pandas used in reconciliation.py (lazy import)
        'pandas',
        'pandas.core',
        'pandas.core.frame',
        'pandas.core.series',
        'numpy',
        'numpy.core',
        # Local modules (explicit, in case pathex isn't enough)
        'tally_api',
        'incremental_sync',
        'reconciliation',
        'sync_master',
        'fetch_master_data',
        'sync_vouchers',
        'sync_bills_outstanding',
        'sync_logger',
        'voucher_reconciliation',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude heavy packages not needed at runtime
        'tkinter',
        'matplotlib',
        'scipy',
        'PIL',
        'cv2',
        'PyQt5',
        'PyQt6',
        'wx',
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
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
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
