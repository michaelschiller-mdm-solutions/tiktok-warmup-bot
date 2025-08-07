-- Migration: Add 'transferred' status to accounts table
-- Date: 2025-01-27

-- Drop the existing CHECK constraint
ALTER TABLE accounts DROP CONSTRAINT accounts_status_check;

-- Add the new CHECK constraint that includes 'transferred'
ALTER TABLE accounts ADD CONSTRAINT accounts_status_check 
CHECK (status IN ('active', 'banned', 'suspended', 'inactive', 'transferred'));

-- Add a comment to document the change
COMMENT ON COLUMN accounts.status IS 'Account status: active, banned, suspended, inactive, or transferred'; 