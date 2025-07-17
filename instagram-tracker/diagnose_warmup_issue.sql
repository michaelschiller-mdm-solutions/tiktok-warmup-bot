-- DIAGNOSTIC SCRIPT: Why no accounts show as "ready for assignment"
-- This script checks all possible issues

-- 1. Check current account states
SELECT 
    '=== CURRENT ACCOUNT STATES ===' as section,
    lifecycle_state, 
    status,
    COUNT(*) as count
FROM accounts 
GROUP BY lifecycle_state, status 
ORDER BY lifecycle_state, status;

-- 2. Check accounts not imported today
SELECT 
    '=== ACCOUNTS NOT IMPORTED TODAY ===' as section,
    lifecycle_state,
    status, 
    COUNT(*) as count
FROM accounts 
WHERE created_at::date != '2025-07-01'
GROUP BY lifecycle_state, status 
ORDER BY lifecycle_state, status;

-- 3. Check if any accounts are actually in 'ready' state
SELECT 
    '=== ACCOUNTS IN READY STATE ===' as section,
    COUNT(*) as ready_accounts
FROM accounts 
WHERE lifecycle_state = 'ready';

-- 4. Check if warmup phase function exists
SELECT 
    '=== DATABASE FUNCTIONS CHECK ===' as section,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_name LIKE '%warmup%' 
  AND routine_schema = 'public';

-- 5. Check if content bundles and assignments exist
SELECT 
    '=== CONTENT SYSTEM CHECK ===' as section,
    'Content Bundles' as item,
    COUNT(*) as count
FROM content_bundles;

SELECT 
    '=== CONTENT SYSTEM CHECK ===' as section,
    'Model Bundle Assignments' as item,
    COUNT(*) as count
FROM model_bundle_assignments;

-- 6. Simple fix: Move 17 accounts to ready state
-- First, identify candidates
WITH candidates AS (
    SELECT id, username
    FROM accounts 
    WHERE created_at::date != '2025-07-01'
      AND status = 'active'
      AND lifecycle_state = 'imported'
    ORDER BY id
    LIMIT 17
)
SELECT 
    '=== CANDIDATES FOR WARMUP ===' as section,
    COUNT(*) as candidate_count
FROM candidates;

-- 7. Actually move them to ready state
WITH ready_accounts AS (
    SELECT id
    FROM accounts 
    WHERE created_at::date != '2025-07-01'
      AND status = 'active'
      AND lifecycle_state = 'imported'
    ORDER BY id
    LIMIT 17
)
UPDATE accounts 
SET 
    lifecycle_state = 'ready',
    state_changed_at = CURRENT_TIMESTAMP,
    state_changed_by = 'diagnostic_fix',
    state_notes = 'Moved to ready for warmup pipeline'
WHERE id IN (SELECT id FROM ready_accounts);

-- 8. Final verification
SELECT 
    '=== FINAL STATE AFTER FIX ===' as section,
    lifecycle_state,
    COUNT(*) as count
FROM accounts 
GROUP BY lifecycle_state 
ORDER BY lifecycle_state; 