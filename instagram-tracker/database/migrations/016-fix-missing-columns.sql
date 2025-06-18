-- Migration 016: Fix Missing Columns for Backend Compatibility
-- Adds all columns expected by backend routes but missing from database
-- Version: 1.1 - Updated to remove password_encrypted (deprecated in migration 019)
-- Created: 2025-06-14
-- Updated: 2025-06-15

-- NOTE: password_encrypted column removed in migration 019 - no longer needed
-- Only add proxy_password_encrypted column (still needed for proxy authentication)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_password_encrypted TEXT;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_password_encrypted ON accounts(proxy_password_encrypted);

-- NOTE: Removed password_encrypted updates as this field is deprecated

-- Update existing records to encrypt plain text proxy passwords
-- Only if proxy_password exists (may not be in all setups)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'proxy_password') THEN
        UPDATE accounts 
        SET proxy_password_encrypted = encrypt_password(proxy_password)
        WHERE proxy_password IS NOT NULL AND proxy_password_encrypted IS NULL;
    END IF;
END $$;

-- Helper function to encrypt passwords (reuse existing or create new)
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql;

-- Helper function to decrypt passwords
CREATE OR REPLACE FUNCTION decrypt_password(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
    -- For bcrypt, we can't decrypt, so return a placeholder
    -- In real apps, you'd handle this differently based on encryption method
    RETURN '[ENCRYPTED]';
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically encrypt passwords on insert/update
CREATE OR REPLACE FUNCTION encrypt_passwords_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- NOTE: password_encrypted handling removed in migration 019
    -- Only handle proxy password encryption now
    
    -- Encrypt proxy password if provided and not already encrypted
    IF NEW.proxy_password IS NOT NULL AND NEW.proxy_password_encrypted IS NULL THEN
        NEW.proxy_password_encrypted := encrypt_password(NEW.proxy_password);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password encryption
DROP TRIGGER IF EXISTS trigger_encrypt_passwords ON accounts;
CREATE TRIGGER trigger_encrypt_passwords
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_passwords_trigger(); 