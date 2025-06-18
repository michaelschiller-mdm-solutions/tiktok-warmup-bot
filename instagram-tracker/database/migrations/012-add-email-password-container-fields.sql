-- Migration 012: Add container number field for warmup pipeline
-- NOTE: email_password_encrypted field removed in migration 019
-- Version: 1.1 - Updated to remove deprecated email password fields
-- Created: 2025-01-27
-- Updated: 2025-06-15

-- Add container number field for automatic assignment
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS container_number INTEGER;

-- Add index for container number for efficient lookups
CREATE INDEX IF NOT EXISTS idx_accounts_container_number ON accounts(container_number);

-- NOTE: Email password encryption functions removed in migration 019

-- Function to automatically assign container numbers
CREATE OR REPLACE FUNCTION assign_container_number()
RETURNS TRIGGER AS $$
DECLARE
    next_container INTEGER;
BEGIN
    -- Only assign if container_number is not already set
    IF NEW.container_number IS NULL THEN
        -- Find the next available container number (starting from 1)
        SELECT COALESCE(MAX(container_number), 0) + 1 
        INTO next_container 
        FROM accounts 
        WHERE model_id = NEW.model_id;
        
        NEW.container_number := next_container;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign container numbers on insert
DROP TRIGGER IF EXISTS trigger_assign_container_number ON accounts;
CREATE TRIGGER trigger_assign_container_number
    BEFORE INSERT ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION assign_container_number(); 