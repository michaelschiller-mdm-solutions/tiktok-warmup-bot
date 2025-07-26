-- Add first_automation_completed field to track if skip_onboarding.lua has been run
-- This ensures skip_onboarding.lua is executed only once per account on their first warmup phase

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS first_automation_completed BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_first_automation_completed 
ON accounts(first_automation_completed) 
WHERE first_automation_completed = FALSE;

-- Update existing accounts to have first_automation_completed = FALSE by default
-- This ensures all existing accounts will get skip_onboarding.lua on their next automation
UPDATE accounts 
SET first_automation_completed = FALSE 
WHERE first_automation_completed IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN accounts.first_automation_completed IS 
'Tracks whether skip_onboarding.lua has been executed for this account. Set to TRUE after first successful automation phase.';