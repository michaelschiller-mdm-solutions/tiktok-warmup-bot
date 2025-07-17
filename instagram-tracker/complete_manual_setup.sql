-- Complete Manual Setup for Ready Accounts
-- This script identifies accounts that should be moved to warmup and completes their setup

-- Step 1: Identify candidates for manual setup completion
SELECT 
    'Candidates for manual setup completion:' as info,
    COUNT(*) as count 
FROM accounts 
WHERE created_at::date != '2025-07-01'  -- Not imported today
  AND status != 'invalid'               -- Not invalid
  AND lifecycle_state = 'imported'      -- Currently in imported state
  AND email IS NOT NULL                 -- Has email
  AND password IS NOT NULL              -- Has password
  AND email_password IS NOT NULL;       -- Has email password

-- Step 2: Show the actual accounts
SELECT 
    id, 
    username, 
    email,
    CASE WHEN password IS NOT NULL THEN '[SET]' ELSE '[NULL]' END as password_status,
    CASE WHEN email_password IS NOT NULL THEN '[SET]' ELSE '[NULL]' END as email_password_status,
    container_number,
    model_id,
    created_at::date as import_date
FROM accounts 
WHERE created_at::date != '2025-07-01'  
  AND status != 'invalid'               
  AND lifecycle_state = 'imported'      
  AND email IS NOT NULL                 
  AND password IS NOT NULL              
  AND email_password IS NOT NULL
ORDER BY id
LIMIT 20;

-- Step 3: Complete manual setup for these accounts (limit to 17 as requested)
WITH ready_accounts AS (
    SELECT id
    FROM accounts 
    WHERE created_at::date != '2025-07-01'  
      AND status != 'invalid'               
      AND lifecycle_state = 'imported'      
      AND email IS NOT NULL                 
      AND password IS NOT NULL              
      AND email_password IS NOT NULL
    ORDER BY id
    LIMIT 17
)
UPDATE accounts 
SET 
    lifecycle_state = 'ready',
    state_changed_at = CURRENT_TIMESTAMP,
    state_changed_by = 'manual_setup_completion_script',
    state_notes = 'Manual setup completed - ready for warmup'
WHERE id IN (SELECT id FROM ready_accounts)
RETURNING id, username, lifecycle_state;

-- Step 4: Initialize warmup phases for these accounts
-- Note: This calls the database function to set up warmup phases
WITH ready_accounts AS (
    SELECT id
    FROM accounts 
    WHERE state_changed_by = 'manual_setup_completion_script'
      AND lifecycle_state = 'ready'
)
SELECT 
    id as account_id,
    username,
    initialize_warmup_phases_with_content(id) as phases_initialized
FROM accounts
WHERE id IN (SELECT id FROM ready_accounts);

-- Step 5: Verify the results
SELECT 
    'Final verification - accounts ready for warmup:' as info,
    COUNT(*) as count
FROM accounts 
WHERE lifecycle_state = 'ready'
  AND state_changed_by = 'manual_setup_completion_script';

SELECT 
    id,
    username,
    lifecycle_state,
    state_notes,
    (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = accounts.id) as warmup_phases_count
FROM accounts 
WHERE state_changed_by = 'manual_setup_completion_script'
ORDER BY id; 