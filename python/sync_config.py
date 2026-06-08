"""Single source of truth for sync entity ordering and backend endpoints.

Previously SYNC_ORDER and the entity->endpoint map were duplicated across
incremental_sync.py (sync_and_reconcile, sync_incremental_fast, main) and
sync_worker.py, which drifted over time. Import from here instead.
"""

# Master entities in Tally dependency order (parents before children).
SYNC_ORDER = [
    'Group', 'Currency', 'Unit', 'StockGroup', 'StockCategory',
    'CostCategory', 'CostCenter', 'Godown', 'VoucherType', 'TaxUnit',
    'Ledger', 'StockItem',
]

# Entity type -> backend REST collection endpoint.
ENTITY_ENDPOINTS = {
    'Group': '/groups',
    'Currency': '/currencies',
    'Unit': '/units',
    'StockGroup': '/stock-groups',
    'StockCategory': '/stock-categories',
    'CostCategory': '/cost-categories',
    'CostCenter': '/cost-centers',
    'Godown': '/godowns',
    'VoucherType': '/voucher-types',
    'TaxUnit': '/tax-units',
    'Ledger': '/ledgers',
    'StockItem': '/stock-items',
}


def endpoint_for(entity_type: str) -> str:
    """Backend endpoint for an entity type, defaulting to /ledgers."""
    return ENTITY_ENDPOINTS.get(entity_type, '/ledgers')
