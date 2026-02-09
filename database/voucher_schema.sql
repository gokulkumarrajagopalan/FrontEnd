-- ============================================================================
-- VOUCHER SCHEMA - PostgreSQL
-- Talliffy - Tally to Cloud Sync
-- ============================================================================
-- Tables:
--   1. vouchers              - Main voucher header
--   2. voucher_ledger_entries - All Ledger Entries (Dr/Cr lines)
--   3. voucher_bill_allocations - Bill-wise allocations per ledger entry
--   4. voucher_cost_category_allocations - Cost category allocations per ledger
--   5. voucher_cost_centre_allocations  - Cost centre allocations per category
--   6. voucher_inventory_entries - All Inventory Entries (stock items)
--   7. voucher_batch_allocations - Batch allocations per inventory entry
-- ============================================================================

-- ============================================================
-- 1. VOUCHERS (Header)
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id                          SERIAL PRIMARY KEY,
    cmp_id                      INTEGER NOT NULL,
    user_id                     INTEGER NOT NULL,

    -- Tally Identity
    guid                        VARCHAR(64) NOT NULL,
    master_id                   BIGINT DEFAULT 0,
    alter_id                    BIGINT DEFAULT 0,
    voucher_key                 BIGINT DEFAULT 0,
    voucher_retain_key          BIGINT DEFAULT 0,
    remote_id                   VARCHAR(255),
    remote_alt_guid             VARCHAR(255),

    -- Voucher Info
    voucher_number              VARCHAR(100),
    voucher_type                VARCHAR(100) NOT NULL,
    voucher_date                DATE NOT NULL,
    effective_date              DATE,
    voucher_number_series       VARCHAR(100),
    persisted_view              VARCHAR(100),

    -- Party Info
    party_ledger_name           VARCHAR(255),
    party_name                  VARCHAR(255),
    amount                      DECIMAL(18,2) DEFAULT 0,

    -- Reference
    reference                   VARCHAR(500),
    narration                   TEXT,

    -- GST Info
    party_gstin                 VARCHAR(20),
    company_gstin               VARCHAR(20),
    company_gst_registration_type VARCHAR(50),
    company_gst_state           VARCHAR(100),
    gst_registration            VARCHAR(100),
    place_of_supply             VARCHAR(100),
    vch_gst_class               VARCHAR(100),

    -- E-Invoice
    irn                         VARCHAR(100),
    irn_ack_no                  VARCHAR(50),
    irn_ack_date                DATE,
    irn_qr_code                 TEXT,

    -- Status Flags
    is_optional                 BOOLEAN DEFAULT FALSE,
    is_deleted                  BOOLEAN DEFAULT FALSE,
    is_cancelled                BOOLEAN DEFAULT FALSE,
    is_void                     BOOLEAN DEFAULT FALSE,
    is_on_hold                  BOOLEAN DEFAULT FALSE,
    is_invoice                  BOOLEAN DEFAULT FALSE,
    is_post_dated               BOOLEAN DEFAULT FALSE,
    has_cash_flow               BOOLEAN DEFAULT FALSE,
    has_discounts               BOOLEAN DEFAULT FALSE,
    is_deemed_positive          BOOLEAN DEFAULT FALSE,
    is_reverse_charge_applicable BOOLEAN DEFAULT FALSE,

    -- Sync Metadata
    sync_status                 VARCHAR(20) DEFAULT 'synced',
    is_active                   BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT uq_vouchers_guid UNIQUE (cmp_id, guid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_cmp_id ON vouchers(cmp_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_alter_id ON vouchers(cmp_id, alter_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(cmp_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(cmp_id, voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(cmp_id, party_ledger_name);
CREATE INDEX IF NOT EXISTS idx_vouchers_guid ON vouchers(guid);
CREATE INDEX IF NOT EXISTS idx_vouchers_number ON vouchers(cmp_id, voucher_number);


-- ============================================================
-- 2. VOUCHER LEDGER ENTRIES (AllLedgerEntries)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_ledger_entries (
    id                          SERIAL PRIMARY KEY,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Tally Identity (from parent voucher for quick querying)
    voucher_guid                VARCHAR(64) NOT NULL,
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),

    -- Ledger Info
    ledger_name                 VARCHAR(255) NOT NULL,
    ledger_guid                 VARCHAR(64),
    amount                      DECIMAL(18,2) DEFAULT 0,
    dr_cr                       VARCHAR(2),   -- 'DR' or 'CR'

    -- Flags
    is_deemed_positive          BOOLEAN DEFAULT FALSE,
    is_party_ledger             BOOLEAN DEFAULT FALSE,
    ledger_from_item            BOOLEAN DEFAULT FALSE,

    -- GST
    gst_class                   VARCHAR(100),
    appropriate_for             VARCHAR(255),

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_led_entry UNIQUE (voucher_id, ledger_name, amount)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vle_voucher_id ON voucher_ledger_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vle_cmp_id ON voucher_ledger_entries(cmp_id);
CREATE INDEX IF NOT EXISTS idx_vle_ledger_name ON voucher_ledger_entries(cmp_id, ledger_name);
CREATE INDEX IF NOT EXISTS idx_vle_voucher_guid ON voucher_ledger_entries(voucher_guid);


-- ============================================================
-- 3. VOUCHER BILL ALLOCATIONS (BillAllocations)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_bill_allocations (
    id                          SERIAL PRIMARY KEY,
    ledger_entry_id             INTEGER NOT NULL REFERENCES voucher_ledger_entries(id) ON DELETE CASCADE,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Denormalized for quick queries
    voucher_guid                VARCHAR(64),
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),
    ledger_name                 VARCHAR(255),

    -- Bill Info
    bill_type                   VARCHAR(50),       -- 'New Ref', 'Agst Ref', 'Advance', 'On Account'
    bill_name                   VARCHAR(255),       -- NAME from Tally
    bill_ref                    VARCHAR(255),       -- BILLNUMBER
    bill_date                   DATE,
    bill_due_date               DATE,
    bill_credit_period          VARCHAR(50),
    bill_amount                 DECIMAL(18,2) DEFAULT 0,
    tds_deductee_is_special_rate BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vba_ledger_entry_id ON voucher_bill_allocations(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_vba_voucher_id ON voucher_bill_allocations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vba_cmp_id ON voucher_bill_allocations(cmp_id);
CREATE INDEX IF NOT EXISTS idx_vba_bill_name ON voucher_bill_allocations(cmp_id, ledger_name, bill_name);
CREATE INDEX IF NOT EXISTS idx_vba_bill_type ON voucher_bill_allocations(cmp_id, bill_type);


-- ============================================================
-- 4. VOUCHER COST CATEGORY ALLOCATIONS (CategoryAllocations)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_cost_category_allocations (
    id                          SERIAL PRIMARY KEY,
    ledger_entry_id             INTEGER NOT NULL REFERENCES voucher_ledger_entries(id) ON DELETE CASCADE,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Denormalized
    voucher_guid                VARCHAR(64),
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),

    -- Cost Category
    category_name               VARCHAR(255),
    amount                      DECIMAL(18,2) DEFAULT 0,
    is_deemed_positive          BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vcca_ledger_entry ON voucher_cost_category_allocations(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_vcca_voucher_id ON voucher_cost_category_allocations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vcca_cmp_id ON voucher_cost_category_allocations(cmp_id);


-- ============================================================
-- 5. VOUCHER COST CENTRE ALLOCATIONS (CostCentreAllocations)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_cost_centre_allocations (
    id                          SERIAL PRIMARY KEY,
    cost_category_id            INTEGER NOT NULL REFERENCES voucher_cost_category_allocations(id) ON DELETE CASCADE,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Denormalized
    voucher_guid                VARCHAR(64),
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),

    -- Cost Centre
    cost_centre_name            VARCHAR(255),
    amount                      DECIMAL(18,2) DEFAULT 0,

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vccna_cost_cat ON voucher_cost_centre_allocations(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_vccna_voucher_id ON voucher_cost_centre_allocations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vccna_cmp_id ON voucher_cost_centre_allocations(cmp_id);


-- ============================================================
-- 6. VOUCHER INVENTORY ENTRIES (AllInventoryEntries)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_inventory_entries (
    id                          SERIAL PRIMARY KEY,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Denormalized
    voucher_guid                VARCHAR(64),
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),

    -- Stock Item
    stock_item_name             VARCHAR(255) NOT NULL,
    stock_item_guid             VARCHAR(64),

    -- Quantities
    billed_qty                  DECIMAL(18,4) DEFAULT 0,
    actual_qty                  DECIMAL(18,4) DEFAULT 0,
    rate                        DECIMAL(18,4) DEFAULT 0,
    amount                      DECIMAL(18,2) DEFAULT 0,
    discount                    DECIMAL(18,2) DEFAULT 0,

    -- Units
    uom                         VARCHAR(50),
    alternate_uom               VARCHAR(50),
    rate_uom                    VARCHAR(50),

    -- Movement
    is_deemed_positive          BOOLEAN DEFAULT FALSE,
    is_outward                  BOOLEAN DEFAULT FALSE,
    godown_name                 VARCHAR(255),
    tracking_number             VARCHAR(255),

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vie_voucher_id ON voucher_inventory_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vie_cmp_id ON voucher_inventory_entries(cmp_id);
CREATE INDEX IF NOT EXISTS idx_vie_stock_item ON voucher_inventory_entries(cmp_id, stock_item_name);
CREATE INDEX IF NOT EXISTS idx_vie_voucher_guid ON voucher_inventory_entries(voucher_guid);


-- ============================================================
-- 7. VOUCHER BATCH ALLOCATIONS (BatchAllocations)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_batch_allocations (
    id                          SERIAL PRIMARY KEY,
    inventory_entry_id          INTEGER NOT NULL REFERENCES voucher_inventory_entries(id) ON DELETE CASCADE,
    voucher_id                  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    cmp_id                      INTEGER NOT NULL,

    -- Denormalized
    voucher_guid                VARCHAR(64),
    voucher_number              VARCHAR(100),
    voucher_date                DATE,
    voucher_type                VARCHAR(100),
    stock_item_name             VARCHAR(255),

    -- Batch Info
    batch_name                  VARCHAR(255),
    godown_name                 VARCHAR(255),
    destination_godown          VARCHAR(255),

    -- Quantities
    batch_qty                   DECIMAL(18,4) DEFAULT 0,
    batch_rate                  DECIMAL(18,4) DEFAULT 0,
    batch_amount                DECIMAL(18,2) DEFAULT 0,
    batch_uom                   VARCHAR(50),

    -- Dates
    mfg_date                    DATE,
    expiry_date                 DATE,

    -- Movement
    is_deemed_positive          BOOLEAN DEFAULT FALSE,
    is_outward                  BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vba2_inventory_entry ON voucher_batch_allocations(inventory_entry_id);
CREATE INDEX IF NOT EXISTS idx_vba2_voucher_id ON voucher_batch_allocations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vba2_cmp_id ON voucher_batch_allocations(cmp_id);
CREATE INDEX IF NOT EXISTS idx_vba2_batch_name ON voucher_batch_allocations(cmp_id, batch_name);


-- ============================================================
-- TRIGGER: Auto-update updated_at on vouchers
-- ============================================================
CREATE OR REPLACE FUNCTION update_voucher_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_voucher_updated ON vouchers;
CREATE TRIGGER trg_voucher_updated
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_timestamp();


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- View: Voucher summary with totals
CREATE OR REPLACE VIEW v_voucher_summary AS
SELECT 
    v.cmp_id,
    v.voucher_type,
    v.voucher_date,
    v.voucher_number,
    v.party_ledger_name,
    v.amount,
    v.narration,
    v.is_cancelled,
    v.is_deleted,
    COUNT(DISTINCT vle.id) AS ledger_entry_count,
    COUNT(DISTINCT vie.id) AS inventory_entry_count,
    COUNT(DISTINCT vba.id) AS bill_count
FROM vouchers v
LEFT JOIN voucher_ledger_entries vle ON vle.voucher_id = v.id
LEFT JOIN voucher_inventory_entries vie ON vie.voucher_id = v.id
LEFT JOIN voucher_bill_allocations vba ON vba.voucher_id = v.id
WHERE v.is_active = TRUE
GROUP BY v.id, v.cmp_id, v.voucher_type, v.voucher_date, v.voucher_number,
         v.party_ledger_name, v.amount, v.narration, v.is_cancelled, v.is_deleted;


-- View: Outstanding bills (Receivables/Payables)
CREATE OR REPLACE VIEW v_outstanding_bills AS
SELECT 
    ba.cmp_id,
    ba.ledger_name,
    ba.bill_name,
    ba.bill_type,
    ba.bill_date,
    ba.bill_due_date,
    ba.voucher_type,
    ba.voucher_number,
    ba.voucher_date,
    ba.bill_amount,
    CASE 
        WHEN ba.bill_due_date IS NOT NULL AND ba.bill_due_date < CURRENT_DATE 
        THEN CURRENT_DATE - ba.bill_due_date 
        ELSE 0 
    END AS overdue_days
FROM voucher_bill_allocations ba
JOIN vouchers v ON v.id = ba.voucher_id
WHERE v.is_active = TRUE 
  AND v.is_cancelled = FALSE 
  AND v.is_deleted = FALSE;


-- View: Stock movement from vouchers
CREATE OR REPLACE VIEW v_stock_movement AS
SELECT 
    vie.cmp_id,
    vie.stock_item_name,
    vie.voucher_date,
    vie.voucher_type,
    vie.voucher_number,
    vie.is_outward,
    vie.actual_qty,
    vie.billed_qty,
    vie.rate,
    vie.amount,
    vie.godown_name,
    vie.uom
FROM voucher_inventory_entries vie
JOIN vouchers v ON v.id = vie.voucher_id
WHERE v.is_active = TRUE
  AND v.is_cancelled = FALSE
  AND v.is_deleted = FALSE;
