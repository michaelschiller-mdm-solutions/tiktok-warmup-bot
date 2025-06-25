-- Migration: 035-add-order-tracking
-- Purpose: Add order number and import source tracking for accounts

-- Add order tracking columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS import_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_accounts_order_number ON accounts(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_import_source ON accounts(import_source) WHERE import_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_import_batch ON accounts(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN accounts.order_number IS 'Order/purchase reference number for account batch (e.g., order6882480)';
COMMENT ON COLUMN accounts.import_source IS 'Source of account import (e.g., csv_file, txt_file, manual_entry)';
COMMENT ON COLUMN accounts.import_batch_id IS 'Unique identifier for import batch session';
COMMENT ON COLUMN accounts.imported_at IS 'Timestamp when account was imported into system'; 