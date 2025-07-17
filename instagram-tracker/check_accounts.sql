-- Check and update accounts for warmup
-- Find accounts NOT imported today and NOT marked as invalid

-- First, let's see what we have
SELECT 'Accounts imported today:' as info, COUNT(*) as count FROM accounts WHERE created_at::date = '2025-07-01';

SELECT 'Accounts NOT imported today:' as info, COUNT(*) as count FROM accounts WHERE created_at::date != '2025-07-01';

SELECT 'Accounts with status invalid:' as info, COUNT(*) as count FROM accounts WHERE status = 'invalid';

-- Show accounts that should be moved to warmup (NOT imported today, NOT invalid)
SELECT 
    'Accounts to move to warmup:' as info,
    COUNT(*) as count 
FROM accounts 
WHERE created_at::date != '2025-07-01' 
AND status != 'invalid'
AND lifecycle_state != 'warmup';

-- Show the actual accounts that will be updated
SELECT 
    id, 
    username, 
    lifecycle_state, 
    status, 
    created_at::date as created_date
FROM accounts 
WHERE created_at::date != '2025-07-01' 
AND status != 'invalid'
ORDER BY id;

-- Update accounts to warmup state
UPDATE accounts 
SET 
    lifecycle_state = 'warmup',
    state_changed_at = CURRENT_TIMESTAMP,
    state_changed_by = 'system_batch_update',
    state_notes = 'Moved to warmup - not imported today and not invalid'
WHERE created_at::date != '2025-07-01' 
AND status != 'invalid'
AND lifecycle_state != 'warmup';

-- Show final count after update
SELECT 'Accounts now in warmup state:' as info, COUNT(*) as count FROM accounts WHERE lifecycle_state = 'warmup'; 