# Immediate Fix for Hanging Automation

## Problem
The automation system was hanging at "📱 Sending content to iPhone for post_no_caption..." because:

1. **Nuclear cleaner was the default** - Every image upload triggered a respring
2. **AutomationBridge was hanging** - The wake_up.lua execution was taking too long or failing
3. **System was stuck** - No progress for several minutes

## Immediate Solution Applied

### 1. Changed Default Cleaner to Simple
- **Before**: `useNuclearCleaner = true` (default)
- **After**: `useNuclearCleaner = false` (default)
- **Result**: No more resprings on every image upload

### 2. Improved Respring Handling (for when nuclear cleaner IS used)
- Added timeout protection with `Promise.race()`
- Reduced wake-up timeout from 30s to 15s
- Reduced retries from 3 to 2
- Reduced final wait from 5s to 3s
- **Total respring handling time**: ~23s instead of ~50s

### 3. Updated Command Line Interface
- **Before**: `--simple` flag for simple cleaner (nuclear was default)
- **After**: `--nuclear` flag for nuclear cleaner (simple is default)

## Files Changed

1. **`send-to-iphone.js`**
   - Changed default: `useNuclearCleaner = false`
   - Updated CLI parsing to use `--nuclear` flag
   - Added timeout protection for wake_up.lua

2. **`warmupContentAssignment.ts`**
   - Changed default: `use_nuclear_cleaner = false`
   - Added timeout protection for wake_up.lua

3. **`warmupContentAssignment.js`** (compiled)
   - Updated to match TypeScript changes

## Expected Behavior Now

### Normal Operation (Simple Cleaner - Default)
```
📱 Sending content to iPhone for post_no_caption...
🧹 Cleaning iPhone gallery before sending image...
🧹 Simple Photo Gallery Cleanup
[... simple cleanup runs quickly, no respring ...]
✅ Simple cleanup completed successfully!
[... continues with automation immediately ...]
```

### Nuclear Cleaner Operation (When Explicitly Requested)
```
📱 Sending content to iPhone for post_no_caption...
🧹 Cleaning iPhone gallery before sending image...
💥 Using nuclear cleaner (will cause iPhone respring)...
[... nuclear cleanup runs ...]
⏳ Waiting 15 seconds for iPhone respring to complete...
📱 Executing wake_up.lua to wake up iPhone after respring...
✅ iPhone wake-up completed successfully
⏳ Waiting additional 3 seconds for iPhone to be fully ready...
[... continues with automation ...]
```

## How to Use Nuclear Cleaner When Needed

### Via Script
```bash
node src/scripts/send-to-iphone.js 123 bio --nuclear
```

### Via API
```javascript
{
  "use_nuclear_cleaner": true
}
```

## Testing

Run the status check to see current state:
```bash
node check-current-status.js
```

The automation should now proceed normally without hanging, using the simple cleaner by default which doesn't cause resprings.

## When to Use Nuclear Cleaner

- **Use Simple Cleaner (default)**: For regular automation, faster processing
- **Use Nuclear Cleaner**: When photos are stuck and simple cleaner isn't sufficient
- **Respring handling**: Only kicks in when nuclear cleaner is explicitly used