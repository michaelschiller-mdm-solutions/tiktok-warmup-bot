# Warmup Structure Fix

## Problem
The WarmupQueueService was trying to use a non-existent `warmup_phases` table and incorrect account columns (`warmup_status`, `warmup_in_progress`) that don't exist in the actual database schema.

## Root Cause
The original system uses a different database structure:
- **Actual structure**: Uses `account_warmup_phases` table to track individual phase progress
- **Incorrect assumption**: Code was looking for `warmup_phases` table and warmup columns on accounts table

## Actual Database Structure

### `account_warmup_phases` table
- Tracks individual warmup phases for each account
- Each account has multiple rows (one per phase)
- Status tracked per phase: `pending`, `in_progress`, `completed`, `failed`
- Contains: `account_id`, `phase`, `status`, `phase_order`, etc.

### `accounts` table
- Does NOT have `warmup_status` or `warmup_in_progress` columns
- Has `cooldown_until` for timing constraints
- Has `container_number` for iPhone container assignment

## Fix Applied

### 1. Updated `cleanupOrphanedProcesses()`
- **Before**: `UPDATE accounts SET warmup_status = 'ready', warmup_in_progress = false`
- **After**: `UPDATE account_warmup_phases SET status = 'pending'`

### 2. Updated `detectAndResetStuckProcesses()`
- **Before**: Checked `accounts.warmup_in_progress`
- **After**: Checks `account_warmup_phases.status = 'in_progress'`

### 3. Updated `isAnyAccountInProgress()`
- **Before**: `SELECT COUNT(*) FROM accounts WHERE warmup_in_progress = true`
- **After**: `SELECT COUNT(*) FROM account_warmup_phases WHERE status = 'in_progress'`

### 4. Updated `getValidatedReadyAccounts()`
- **Before**: Complex JOIN with non-existent `warmup_phases` table
- **After**: Simple JOIN with `account_warmup_phases` where `status = 'pending'`

### 5. Updated `processAccountPhase()`
- **Before**: `UPDATE accounts SET warmup_in_progress = true`
- **After**: `UPDATE account_warmup_phases SET status = 'in_progress'`

## Result
✅ **Warmup queue now works correctly**
✅ **Found 5 accounts ready for warmup**
✅ **Started processing phases properly**
✅ **Uses correct database structure**

## Test Results
```
🎯 Found 5 accounts ready for warmup
🔥 Processing adrizam140404 - Phase: post_caption
🤖 Executing post_caption for adrizam140404 on container 89
📱 Sending content to iPhone for post_caption...
```

The system is now working as originally designed, using the actual database structure instead of the incorrect assumptions in the code.