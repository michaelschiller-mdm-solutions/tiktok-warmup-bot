# Premium Account Feature - DM Bot

## Overview
The DM Bot now includes a powerful premium account feature that allows you to personalize messages by mentioning accounts that your target users are following. This creates more engaging and personalized DMs.

## How It Works

### 1. Data Structure
The feature uses the `premium_followed_by.csv` file which contains relationships between target accounts and the accounts they follow:

```csv
target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link
Xlyeds,38826864,Beheo,31787572,true,https://static.markt.de/bundles/...,https://www.markt.de/beheo/...
DavidH31,13251843,Lady Sassy99,26005535,true,https://imagecache.markt.de/...,https://www.markt.de/lady+sassy99/...
```

### 2. Message Placeholders
You can use these placeholders in your message template:
- `{premium_account1}` - First premium account the target follows
- `{premium_account2}` - Second premium account the target follows  
- `{premium_account3}` - Third premium account the target follows

### 3. Smart Replacement Logic
The system intelligently replaces placeholders using this priority:
1. **Premium accounts first** (`is_premium: true`)
2. **Regular accounts second** (`is_premium: false`)
3. **Fallback text** if no followed accounts are available

## Setup Instructions

### Step 1: Upload Premium Data
1. Click "👥 Upload Premium Followed Data CSV"
2. Select your `premium_followed_by.csv` file
3. Click "👥 Load Premium Data"
4. You'll see a status message showing how many relationships were loaded

### Step 2: Create Your Message Template
Use placeholders in your message template:

```
Hey ich habe gesehen, dass du {premium_account1} auch folgst 🫣 Falls du mich auch ganz süß findest und mich kennenlerenen willst schreib mir doch auf Telegrm @xxcherry12 oder auf instagrm @notAnnaFae
```

### Step 3: Upload Target Accounts
1. Upload your regular CSV file with target accounts
2. The system will automatically match targets with their followed accounts

### Step 4: Start Campaign
The bot will automatically personalize each message based on the target's followed accounts.

## Example Usage

### Input Message Template:
```
Hey ich habe gesehen, dass du {premium_account1} auch folgst 🫣 Falls du mich auch ganz süß findest...
```

### For target "DavidH31" who follows "Lady Sassy99":
```
Hey ich habe gesehen, dass du Lady Sassy99 auch folgst 🫣 Falls du mich auch ganz süß findest...
```

### For target with no followed accounts:
```
Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findest...
```

## Features

### ✅ Smart Account Selection
- Prioritizes premium accounts over regular accounts
- Randomizes selection to avoid repetition
- Prevents using the same account twice in one message

### ✅ Fallback Protection
- Uses fallback text "einer Freundin von mir" when no followed accounts are available
- Ensures messages are always sent even without premium data

### ✅ Data Persistence
- Premium data is saved in browser storage
- Survives page reloads and browser restarts
- No need to re-upload data every time

### ✅ Real-time Status
- Shows loading status and success/error messages
- Displays count of loaded relationships
- Console logging for debugging

## Troubleshooting

### No Premium Data Loaded
- Ensure your CSV file has the correct format
- Check that the file contains the required columns
- Look for console errors in browser developer tools

### Placeholders Not Replaced
- Verify the target account name matches exactly in both CSV files
- Check that followed accounts exist for the target
- Ensure premium data was loaded successfully

### Message Still Uses Fallback
- Target account may not have any followed accounts in the data
- All followed accounts may be marked as `NO_FOLLOWS`
- This is normal behavior and ensures messages are still sent

## Technical Details

### CSV Format Requirements
- **Target Accounts CSV**: `name,ID,link`
- **Premium Followed CSV**: `target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link`

### Storage
- Data is stored in browser's localStorage
- Key: `dm_bot_premiumFollowedData` and `dm_bot_followedAccountsMap`
- Automatically loaded on extension startup

### Performance
- Efficient Map-based lookup for O(1) account matching
- Minimal memory footprint
- No impact on DM sending speed

## Best Practices

1. **Keep Premium Data Updated**: Regularly update your premium followed data for best results
2. **Use Multiple Placeholders**: Use 2-3 placeholders for variety in longer messages
3. **Test First**: Send a few test messages to verify placeholder replacement works
4. **Monitor Results**: Check console logs to see which accounts are being used
5. **Backup Data**: Keep backup copies of your CSV files

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify CSV file formats match requirements
3. Ensure target account names match exactly between files
4. Try reloading the extension and re-uploading data