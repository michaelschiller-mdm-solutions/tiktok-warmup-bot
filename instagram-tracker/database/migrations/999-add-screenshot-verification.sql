-- Migration: Add Screenshot Verification for Account Setup
-- Purpose: Add fields to store verification screenshots and manual verification status

-- Add verification fields to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS verification_screenshot_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_screenshot_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending_verification',
ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add check constraint for verification_status
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_verification_status_check;

ALTER TABLE accounts 
ADD CONSTRAINT accounts_verification_status_check 
CHECK (verification_status IN (
    'pending_verification',    -- Needs screenshot review
    'manual_completion_required', -- Needs human to complete on device
    'verified_valid',         -- Approved as working
    'verified_invalid',       -- Rejected as shadow-banned/invalid
    'not_required'           -- No verification needed
));

-- Create index for verification queries
CREATE INDEX IF NOT EXISTS idx_accounts_verification_status ON accounts(verification_status);
CREATE INDEX IF NOT EXISTS idx_accounts_verification_required ON accounts(verification_required) WHERE verification_required = true;

-- Add comment for documentation
COMMENT ON COLUMN accounts.verification_screenshot_path IS 'Path to screenshot taken after automation for manual verification';
COMMENT ON COLUMN accounts.verification_status IS 'Manual verification status: pending_verification, verified_valid, verified_invalid, not_required';
COMMENT ON COLUMN accounts.verification_required IS 'Whether this account requires manual verification via screenshot';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Added screenshot verification fields to accounts table';
    RAISE NOTICE 'Verification statuses: pending_verification, verified_valid, verified_invalid, not_required';
END $$; 