# Startup Cleanup Fix - Orphaned Process Resolution

## 🚨 **Problem Identified**

When the server restarts, the WarmupQueueService sometimes doesn't properly clean up accounts that were left in `in_progress` status from the previous server session. This causes the single-bot constraint to block all new processing:

```
🔒 Single bot constraint: 1 account(s) currently in progress
```

## 🔍 **Root Cause Analysis**

### **Original Cleanup Logic Issues:**
1. **Time-based cleanup only**: Only reset processes older than 10 minutes
2. **Insufficient on startup**: Server restart should reset ALL in_progress processes immediately
3. **Limited logging**: Hard to debug which accounts were stuck

### **Why This Happens:**
- Server crashes or restarts while automation is running
- Account remains in `in_progress` status in database
- New server starts but doesn't reset the orphaned process
- Single-bot constraint prevents any new processing

## ✅ **Fixes Implemented**

### **1. Improved `cleanupOrphanedProcesses()` Method**

**Before:**
```typescript
// Only reset processes older than 10 minutes
WHERE status = 'in_progress' 
AND updated_at < NOW() - INTERVAL '10 minutes'
```

**After:**
```typescript
// CRITICAL FIX: On server startup, reset ALL in_progress processes
// since they're definitely orphaned (no active server was running them)
UPDATE account_warmup_phases 
SET 
  status = 'available',
  started_at = NULL,
  bot_id = NULL,
  error_message = 'Reset on server startup - orphaned process',
  updated_at = NOW()
WHERE status = 'in_progress'
```

### **2. Enhanced Logging**

**Added detailed logging:**
```typescript
console.log(`🔄 Reset ${result.rowCount} orphaned processes from server restart`);

// Log which accounts were reset for debugging
resetAccounts.rows.forEach(account => {
  console.log(`   - Reset: ${account.username} (${account.phase})`);
});
```

### **3. Improved `detectAndResetStuckProcesses()` Method**

**Changes:**
- **Reduced timeout**: From 15 minutes to 10 minutes
- **Better condition**: Check `started_at` field instead of just `updated_at`
- **Enhanced logging**: Show which accounts were reset
- **Complete reset**: Clear `started_at`, `bot_id`, and add error message

## 🎯 **How It Works Now**

### **Server Startup Sequence:**
1. **WarmupQueueService starts**
2. **`cleanupOrphanedProcesses()` runs immediately**
3. **ALL `in_progress` processes reset to `available`**
4. **Detailed logging shows what was cleaned up**
5. **Queue becomes unblocked for new processing**

### **During Operation:**
1. **Every 30 seconds**: `detectAndResetStuckProcesses()` runs
2. **Processes running >10 minutes**: Automatically reset
3. **Detailed logging**: Shows which accounts were stuck

## 🧪 **Test Results**

### **Before Fix:**
```
Found 1 accounts in progress:
  - ihsjiei6: story_no_caption (14 minutes)
🔒 Single bot constraint: 1 account(s) currently in progress
```

### **After Fix:**
```
🔄 Reset 1 orphaned processes from server restart
   - Reset: ihsjiei6 (story_no_caption)
✅ SUCCESS: All orphaned processes cleaned up
🚀 Automation queue should now be unblocked
Ready for processing: 99 accounts
```

## 🚀 **Expected Behavior**

### **On Server Restart:**
```
🧹 Cleaning up orphaned processes...
🔄 Reset 1 orphaned processes from server restart
   - Reset: ihsjiei6 (story_no_caption)
✅ WarmupQueueService started
🎯 Found 5 accounts ready for warmup
🔥 Processing fhgiurhjtiu - Phase: post_caption
```

### **During Normal Operation:**
- **No stuck processes**: Automatic cleanup every 30 seconds
- **10-minute timeout**: Processes reset if running too long
- **Clear logging**: Easy to debug any issues

## 🔧 **Technical Details**

### **Database Changes:**
```sql
-- Startup cleanup (resets ALL in_progress)
UPDATE account_warmup_phases 
SET status = 'available', started_at = NULL, bot_id = NULL,
    error_message = 'Reset on server startup - orphaned process'
WHERE status = 'in_progress'

-- Runtime cleanup (resets stuck processes >10 minutes)
UPDATE account_warmup_phases 
SET status = 'available', started_at = NULL, bot_id = NULL,
    error_message = 'Reset due to stuck process (running >10 minutes)'
WHERE status = 'in_progress' 
AND (started_at IS NULL OR started_at < NOW() - INTERVAL '10 minutes')
```

### **Service Integration:**
- **Startup**: `cleanupOrphanedProcesses()` runs once during service initialization
- **Runtime**: `detectAndResetStuckProcesses()` runs every 30 seconds before queue processing
- **Process lock**: Existing process-level locking prevents race conditions

## 🎉 **Benefits**

1. **✅ Reliable startup**: Server always starts with clean state
2. **✅ No more blocking**: Orphaned processes never block the queue
3. **✅ Better debugging**: Clear logs show what was cleaned up
4. **✅ Automatic recovery**: Stuck processes reset automatically
5. **✅ Faster recovery**: 10-minute timeout instead of 15 minutes

## 💡 **Usage**

The fix is automatic - no manual intervention required. When you restart the server:

1. **All orphaned processes are cleaned up immediately**
2. **Detailed logs show what was reset**
3. **Automation continues normally**
4. **No more "Single bot constraint" blocking**

**Status**: ✅ **COMPLETE - Startup cleanup now works reliably**