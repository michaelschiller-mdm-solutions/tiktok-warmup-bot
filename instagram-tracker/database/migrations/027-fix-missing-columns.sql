-- Migration 027: Fix Missing Columns for Bot Activity and Account Statistics
-- Purpose: Add missing columns that are expected by the bot activity monitor and account statistics
-- Date: 2025-06-19

-- Add missing columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS assigned_iphone_id INTEGER REFERENCES iphones(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false;

-- Add missing columns to iphones table for bot activity monitoring
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS assigned_bot_id VARCHAR(255) UNIQUE;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS connection_test_success BOOLEAN DEFAULT false;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_iphone_id ON accounts(assigned_iphone_id);
CREATE INDEX IF NOT EXISTS idx_accounts_requires_human_review ON accounts(requires_human_review);
CREATE INDEX IF NOT EXISTS idx_iphones_assigned_bot_id ON iphones(assigned_bot_id);
CREATE INDEX IF NOT EXISTS idx_iphones_last_health_check ON iphones(last_health_check);

-- Update existing records to have sensible defaults
UPDATE accounts SET requires_human_review = false WHERE requires_human_review IS NULL;
UPDATE iphones SET connection_test_success = false WHERE connection_test_success IS NULL; 