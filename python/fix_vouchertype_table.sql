-- Fix VoucherType, Units, and Ledger tables - Add missing columns
-- Run this SQL in your PostgreSQL database

-- ===== VOUCHERTYPE TABLE =====
ALTER TABLE vouchertype 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename column if it exists (check first)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchertype' AND column_name = 'numberingmethod') THEN
        ALTER TABLE vouchertype RENAME COLUMN numberingmethod TO numbering_method;
    END IF;
END $$;

-- ===== UNITS TABLE =====
ALTER TABLE units
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename columns in units table to match Java entity expectations
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'originalname') THEN
        ALTER TABLE units RENAME COLUMN originalname TO original_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'reservedname') THEN
        ALTER TABLE units RENAME COLUMN reservedname TO reserved_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'issimpleunit') THEN
        ALTER TABLE units RENAME COLUMN issimpleunit TO is_simple_unit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'unitname') THEN
        ALTER TABLE units RENAME COLUMN unitname TO unit_name;
    END IF;
END $$;

-- ===== LEDGERS TABLE =====
ALTER TABLE ledgers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify changes
SELECT 'Units columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'units' ORDER BY ordinal_position;

SELECT 'VoucherType columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'vouchertype' ORDER BY ordinal_position;

-- Update existing VoucherType rows
UPDATE vouchertype 
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), 
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
    is_active = COALESCE(is_active, TRUE);

-- Fix Ledgers table
ALTER TABLE ledgers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing Ledger rows
UPDATE ledgers 
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), 
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);

-- Verify VoucherType columns
SELECT 'VoucherType Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'vouchertype' 
ORDER BY ordinal_position;

-- Verify Ledger columns
SELECT 'Ledger Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ledgers' 
ORDER BY ordinal_position;
-- ===== COST_CATEGORIES TABLE =====
-- Add missing columns that backend expects
ALTER TABLE cost_categories
ADD COLUMN IF NOT EXISTS allocate_revenue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allocate_non_revenue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ===== COSTCENTRE TABLE =====
-- Add missing columns that backend expects
ALTER TABLE costcentre
ADD COLUMN IF NOT EXISTS parent VARCHAR(255),
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Verify CostCategory columns
SELECT 'CostCategory Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cost_categories' 
ORDER BY ordinal_position;

-- Verify CostCenter columns
SELECT 'CostCenter Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'costcentre' 
ORDER BY ordinal_position;

-- ===== CURRENCY TABLE =====
-- Add missing columns that backend expects
ALTER TABLE currency
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ===== TAXUNIT TABLE =====
-- Add missing columns that backend expects
ALTER TABLE taxunit
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Verify Currency columns
SELECT 'Currency Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'currency' 
ORDER BY ordinal_position;

-- Verify TaxUnit columns
SELECT 'TaxUnit Columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'taxunit' 
ORDER BY ordinal_position;
