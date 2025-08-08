# 🔍 Relationship Matching Troubleshooting Guide

## Issue: App Not Finding Relationships Between Target Accounts and Premium Data

### Quick Diagnosis Steps

#### Step 1: Verify Data Loading
1. Open Chrome Developer Tools (F12)
2. Go to Console tab
3. Load both CSV files in the extension
4. Look for these log messages:

**Target Accounts Loading:**
```
📋 Parsed target account: "Xlyeds", ID: 38826864, Link: https://www.markt.de/xlyeds/...
📋 Parsed target account: "DavidH31", ID: 13251843, Link: https://www.markt.de/davidh31/...
```

**Premium Data Loading:**
```
👥 Parsed premium relationship: "Xlyeds" follows "Beheo" (premium: true)
👥 Parsed premium relationship: "DavidH31" follows "Lady Sassy99" (premium: true)
✅ Loaded X followed relationships for Y target accounts
👥 Premium data map contents: ["Xlyeds", "DavidH31", "Looper32", ...]
```

#### Step 2: Test Message Processing
1. Set a message template with `{premium_account1}`
2. Try to process a message (or start campaign)
3. Look for these log messages:

**Successful Matching:**
```
🔍 Looking up premium data for target: "DavidH31"
🔍 Available targets in map: ["Xlyeds", "DavidH31", "Looper32", ...]
👥 Found 10 premium and 0 regular followed accounts for DavidH31
👥 Replaced {premium_account1} with: Lady Sassy99 (premium)
```

**Failed Matching:**
```
🔍 Looking up premium data for target: "SomeAccount"
🔍 Available targets in map: ["Xlyeds", "DavidH31", "Looper32", ...]
👥 No followed accounts found for "SomeAccount", using fallback text
```

### Common Issues and Solutions

#### Issue 1: CSV Files Not Loading Properly

**Symptoms:**
- No console logs when loading CSV files
- Error messages about file format
- Extension UI shows "No premium data loaded"

**Solutions:**
1. **Check File Format:**
   - Target accounts CSV: `name,ID,link`
   - Premium data CSV: `target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link`

2. **Check File Encoding:**
   - Save CSV files as UTF-8
   - Avoid special characters in file names

3. **Check File Size:**
   - Large files might take time to load
   - Check browser console for memory errors

#### Issue 2: Account Names Don't Match Exactly

**Symptoms:**
- Premium data loads successfully
- Target accounts load successfully
- But no relationships found during message processing

**Solutions:**
1. **Use Debug Tool:**
   - Open `debug-csv-matching.html` in browser
   - Upload both CSV files
   - Click "Analyze Matching" to see exact mismatches

2. **Check for Common Mismatches:**
   - Extra spaces: `"DavidH31 "` vs `"DavidH31"`
   - Case differences: `"davidh31"` vs `"DavidH31"`
   - Special characters: `"DavidH31"` vs `"DavidH31"`

3. **Manual Verification:**
   ```javascript
   // In browser console after loading data:
   console.log('Target accounts:', targetAccounts.map(a => a.name));
   console.log('Premium targets:', Array.from(followedAccountsMap.keys()));
   ```

#### Issue 3: Data Structure Problems

**Symptoms:**
- CSV loads but map is empty
- Console shows parsing errors
- Unexpected field values

**Solutions:**
1. **Check CSV Structure:**
   ```csv
   # Correct target_accounts.csv
   name,ID,link
   Xlyeds,38826864,https://www.markt.de/xlyeds/userId,38826864/profile.htm
   
   # Correct premium_followed_by.csv
   target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link
   Xlyeds,38826864,Beheo,31787572,true,https://static.markt.de/bundles/test.svg,"https://www.markt.de/beheo/userId,31787572/profile.htm"
   ```

2. **Check for Quoted Fields:**
   - URLs with commas should be quoted: `"https://www.markt.de/test/userId,123/profile.htm"`
   - Account names with spaces should be quoted: `"Lady Sassy99"`

3. **Verify Boolean Values:**
   - Premium field should be exactly `true` or `false` (lowercase)
   - Not `True`, `TRUE`, `1`, `0`, etc.

#### Issue 4: Browser Storage Issues

**Symptoms:**
- Data loads but disappears after page refresh
- Inconsistent behavior
- Extension seems to "forget" data

**Solutions:**
1. **Clear Browser Storage:**
   ```javascript
   // In browser console:
   localStorage.removeItem('dm_bot_premiumFollowedData');
   localStorage.removeItem('dm_bot_followedAccountsMap');
   localStorage.removeItem('dm_bot_campaign');
   ```

2. **Check Storage Limits:**
   - Large CSV files might exceed localStorage limits
   - Try with smaller test files first

3. **Verify Extension Permissions:**
   - Make sure extension has access to markt.de
   - Check chrome://extensions/ for any errors

### Testing Procedure

#### Step 1: Create Test Files

**test-targets.csv:**
```csv
name,ID,link
Xlyeds,38826864,https://www.markt.de/xlyeds/userId,38826864/profile.htm
DavidH31,13251843,https://www.markt.de/davidh31/userId,13251843/profile.htm
TestAccount,99999999,https://www.markt.de/testaccount/userId,99999999/profile.htm
```

**test-premium.csv:**
```csv
target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link
Xlyeds,38826864,TestFollowed1,11111111,true,https://test.com/img1.jpg,"https://www.markt.de/testfollowed1/userId,11111111/profile.htm"
DavidH31,13251843,TestFollowed2,22222222,true,https://test.com/img2.jpg,"https://www.markt.de/testfollowed2/userId,22222222/profile.htm"
DavidH31,13251843,TestFollowed3,33333333,false,https://test.com/img3.jpg,"https://www.markt.de/testfollowed3/userId,33333333/profile.htm"
```

#### Step 2: Test Loading
1. Load test-targets.csv → Should show "✅ Loaded 3 target accounts"
2. Load test-premium.csv → Should show "✅ Loaded premium data: 3 relationships for 2 accounts"
3. Check console for parsing logs

#### Step 3: Test Message Processing
1. Set message template: `"Hey, I saw you follow {premium_account1}!"`
2. Check console logs when processing messages
3. Expected results:
   - Xlyeds → "Hey, I saw you follow TestFollowed1!"
   - DavidH31 → "Hey, I saw you follow TestFollowed2!" (premium first)
   - TestAccount → "Hey, I saw you follow einer Freundin von mir!" (fallback)

### Debug Tools

#### 1. Browser Console Commands
```javascript
// Check loaded data
console.log('Campaign:', this.campaign);
console.log('Premium data:', this.premiumFollowedData);
console.log('Followed accounts map:', this.followedAccountsMap);

// Test message processing
this.processMessageTemplate('DavidH31', 'Test message with {premium_account1}');
```

#### 2. Debug HTML Tool
- Open `debug-csv-matching.html`
- Upload your actual CSV files
- Analyze matching results
- Identify exact mismatches

#### 3. Extension Console Logs
Enable verbose logging by adding this to console:
```javascript
// Enable debug mode
localStorage.setItem('dm_bot_debug', 'true');
```

### Expected Console Output (Working Correctly)

```
🚀 SIMPLE ROBUST DM AUTOMATION LOADED - ENHANCED VERSION
📋 Loading target accounts CSV file...
📋 Parsed target account: "Xlyeds", ID: 38826864, Link: https://www.markt.de/xlyeds/...
📋 Parsed target account: "DavidH31", ID: 13251843, Link: https://www.markt.de/davidh31/...
✅ Loaded 2 target accounts successfully!

👥 Loading premium followed data CSV file...
👥 Parsed premium relationship: "Xlyeds" follows "Beheo" (premium: true)
👥 Parsed premium relationship: "DavidH31" follows "Lady Sassy99" (premium: true)
✅ Loaded 10 followed relationships for 2 target accounts
👥 Premium data map contents: ["Xlyeds", "DavidH31"]

🔍 Looking up premium data for target: "DavidH31"
🔍 Available targets in map: ["Xlyeds", "DavidH31"]
👥 Found 8 premium and 0 regular followed accounts for DavidH31
👥 Replaced {premium_account1} with: Lady Sassy99 (premium)
💬 Original message: Hey ich habe gesehen, dass du {premium_account1} auch folgst...
💬 Processed message: Hey ich habe gesehen, dass du Lady Sassy99 auch folgst...
```

If you don't see these logs, the issue is in the data loading or parsing phase.