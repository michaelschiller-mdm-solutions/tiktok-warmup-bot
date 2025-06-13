-- Migration 003: Comprehensive Account Extensions
-- Adds proxy management, cost tracking, and analytics enhancements
-- Version: 2.0
-- Created: 2025-01-27

-- Enable encryption extension for secure credential storage
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add comprehensive fields to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS campus VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS niche VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS mother_account_id INTEGER REFERENCES accounts(id);

-- Proxy management fields (secure storage)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_host VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_port INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_username VARCHAR(255);
-- Store encrypted proxy password
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_password_encrypted TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_provider VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_status VARCHAR(50) DEFAULT 'unknown' CHECK (proxy_status IN ('active', 'inactive', 'error', 'unknown'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_location VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_last_checked TIMESTAMP WITH TIME ZONE;

-- Integration fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS adspower_profile_id VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cupid_profile_id VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cupid_system_prompt TEXT;

-- Performance tracking fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS follow_back_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_follows INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_conversions INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_activity_check TIMESTAMP WITH TIME ZONE;

-- Cost allocation field
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS monthly_cost DECIMAL(10,2) DEFAULT 0.00;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_status ON accounts(proxy_status);
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_provider ON accounts(proxy_provider);
CREATE INDEX IF NOT EXISTS idx_accounts_content_type ON accounts(content_type);
CREATE INDEX IF NOT EXISTS idx_accounts_niche ON accounts(niche);
CREATE INDEX IF NOT EXISTS idx_accounts_mother_account ON accounts(mother_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_adspower_profile ON accounts(adspower_profile_id);
CREATE INDEX IF NOT EXISTS idx_accounts_cupid_profile ON accounts(cupid_profile_id);
CREATE INDEX IF NOT EXISTS idx_accounts_follow_back_rate ON accounts(follow_back_rate);
CREATE INDEX IF NOT EXISTS idx_accounts_conversion_rate ON accounts(conversion_rate);

-- Helper function to encrypt proxy passwords
CREATE OR REPLACE FUNCTION encrypt_proxy_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql;

-- Helper function to verify proxy passwords  
CREATE OR REPLACE FUNCTION verify_proxy_password(password TEXT, encrypted TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN encrypted = crypt(password, encrypted);
END;
$$ LANGUAGE plpgsql; 