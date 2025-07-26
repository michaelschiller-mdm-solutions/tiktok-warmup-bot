# How to Start Warmup Automation

## 🎯 Current Status

✅ **System is Ready**: All components are working correctly  
✅ **5 accounts ready**: Bio phase automation ready to run  
✅ **iPhone connected**: Automation server accessible  
✅ **Scripts working**: Manual tests successful  
❌ **Backend not running**: This is why automation isn't processing accounts  

## 🚀 Start Automatic Processing

### Step 1: Start the Backend Server
```bash
cd instagram-tracker/backend
npm start
```

**Expected output:**
```
🔄 Running database migrations...
✅ Migrations completed successfully.
✅ Database connected successfully
🤖 Starting warmup automation queue...
✅ Warmup automation queue started
🚀 Server running on port 3001
🤖 Warmup automation: ACTIVE (polling every 30s)
```

### Step 2: Monitor Processing
Watch the console for these messages every 30 seconds:
```
🎯 Found X accounts ready for warmup
🔥 Processing [username] - Phase: [phase]
🤖 Executing [phase] for [username] on container [number]
📱 Sending content to iPhone for [phase]...
✅ Completed [phase] for [username]
```

## 📊 What Will Happen

### Automatic Processing Cycle
1. **Every 30 seconds**: Queue service checks for ready accounts
2. **Account selection**: Picks account with available phases
3. **Content delivery**: Sends images/text to iPhone
4. **Container selection**: Navigates to correct iPhone container
5. **Phase execution**: Runs appropriate Lua script
6. **Phase completion**: Updates database and applies cooldown
7. **Next phase**: Account becomes available for next phase after cooldown

### Current Ready Accounts
- **djawab9si**: Container 140, Bio phase
- **danielsefora88**: Container 138, Bio phase  
- **dimijaa727292**: Container 139, Bio phase
- **adrizam140404**: Container 89, Bio phase
- **dndnjdjdksksi**: Container 141, Bio phase

## 🔧 Manual Testing (Optional)

If you want to test individual components:

### Test Single Account
```bash
# Test content delivery
node src/scripts/send-to-iphone.js 199 bio

# Test automation
node ../bot/scripts/api/warmup_executor.js --account-id 199 --container-number 140 --phase bio --username djawab9si
```

### Test Queue Service Logic
```bash
node manual-queue-test.js
```

## 📱 iPhone Requirements

✅ **iPhone IP**: 192.168.178.65:46952 (confirmed accessible)  
✅ **XXTouch Server**: Running and responding  
✅ **Lua Scripts**: All required scripts present  
✅ **Container Apps**: Instagram containers configured  

## 🎯 Phase Automation Flow

### Bio Phase Example
1. **Content**: Text "From OKC with love ❤️🇺🇸" sent to clipboard
2. **Container**: Navigate to Container 140 (Page 11, Position 1)
3. **Script**: Execute `change_bio_to_clipboard.lua`
4. **Result**: Bio updated on Instagram account
5. **Cooldown**: 15-24 hours before next phase

### All Automated Phases
- `bio` → Change bio text
- `gender` → Set gender to female  
- `name` → Change display name
- `username` → Change username
- `first_highlight` → Upload first highlight group
- `new_highlight` → Upload additional highlights
- `post_caption` → Upload post with caption
- `post_no_caption` → Upload post without caption
- `story_caption` → Upload story with caption
- `story_no_caption` → Upload story without caption
- `set_to_private` → Set account to private

## 🔍 Troubleshooting

### No Processing Activity
1. Check backend is running: `curl http://localhost:3001/health`
2. Check console logs for queue service messages
3. Verify iPhone connectivity: Test scripts manually

### Script Failures
1. Check iPhone XXTouch server status
2. Verify container numbers are correct
3. Check Lua script execution logs

### Content Issues
1. Verify content is assigned to accounts
2. Check file paths exist and are accessible
3. Test content delivery manually

## 📈 Monitoring

### Database Queries
```sql
-- Check ready accounts
SELECT * FROM bot_ready_accounts WHERE ready_phases > 0;

-- Check recent activity  
SELECT * FROM account_warmup_phases WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Check phase status
SELECT phase, status, COUNT(*) FROM account_warmup_phases GROUP BY phase, status;
```

### Log Messages to Watch
- `🎯 Found X accounts ready for warmup` (every 30s)
- `🔥 Processing [username] - Phase: [phase]`
- `✅ Completed [phase] for [username]`
- `❌ Failed [phase] for [username]`

---

## 🎉 Ready to Start!

**Simply run `npm start` in the backend directory and the automation will begin processing accounts automatically!**

The system will:
- ✅ Process 5 ready accounts with bio phases
- ✅ Send content to iPhone automatically  
- ✅ Execute Instagram automation scripts
- ✅ Progress accounts through warmup phases
- ✅ Apply cooldowns between phases
- ✅ Continue 24/7 until all accounts complete warmup