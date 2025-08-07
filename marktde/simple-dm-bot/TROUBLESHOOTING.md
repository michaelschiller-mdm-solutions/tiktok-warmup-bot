# 🔧 **TROUBLESHOOTING GUIDE - Simple Markt.de DM Bot**

## 🚨 **EMERGENCY: Infinite Reload Loop**

If your browser is stuck in an infinite reload loop:

### **IMMEDIATE SOLUTION:**
1. **Press `Ctrl+Shift+I`** (or `F12`) to open Chrome DevTools
2. Go to **Application** tab
3. Click **Local Storage** in the left sidebar
4. Select the **markt.de** domain
5. **Delete ALL entries** that start with `dm_bot_`
6. **Close DevTools** and **reload the page**
7. The infinite loop will stop immediately

### **Alternative Method:**
1. Go to `chrome://extensions/`
2. Find "Simple Markt.de DM Bot"
3. Click **"Remove"** to uninstall
4. **Reload** the markt.de page
5. **Reinstall** the extension when ready

---

## 🔍 **Common Issues & Solutions**

### **1. Bot Won't Start**
**Symptoms:** START button is disabled or nothing happens when clicked

**Solutions:**
- ✅ Make sure you've uploaded and loaded a CSV file first
- ✅ Check that CSV contains valid markt.de URLs
- ✅ Ensure you're logged into markt.de
- ✅ Try clicking "Clear State" and reload the page

### **2. Bot Gets Stuck on One Account**
**Symptoms:** Debug info shows "Navigating..." for too long

**Solutions:**
- ✅ Click **STOP** button
- ✅ Click **Skip Current** to move to next account
- ✅ Use **Process Current** to manually try current account
- ✅ Check if the profile URL is valid by visiting it manually

### **3. CSV Upload Fails**
**Symptoms:** "No valid markt.de accounts found" error

**Solutions:**
- ✅ Check CSV format matches exactly:
  ```csv
  name,ID,link
  TestUser,12345,"https://www.markt.de/testuser/userId,12345/profile.htm"
  ```
- ✅ Ensure URLs contain "markt.de" and "userId,"
- ✅ Remove any extra spaces or characters
- ✅ Save CSV file with UTF-8 encoding

### **4. DM Button Not Found**
**Symptoms:** "DM button not found" error in console

**Solutions:**
- ✅ Make sure you're on a valid user profile page
- ✅ Check if the user allows messages (some profiles disable DMs)
- ✅ Try manually clicking the "Nachricht" button to test
- ✅ Use **Skip Current** if profile doesn't support DMs

### **5. Message Not Sending**
**Symptoms:** Bot finds DM button but message doesn't send

**Solutions:**
- ✅ Check your message template isn't too long
- ✅ Ensure you're not rate-limited by markt.de
- ✅ Try increasing delay between accounts
- ✅ Check if your account has messaging restrictions

### **6. Mobile UI Issues**
**Symptoms:** UI is cut off or buttons don't work on mobile

**Solutions:**
- ✅ The UI is now fully responsive and scrollable
- ✅ Try rotating your device to landscape mode
- ✅ Zoom out if UI appears too large
- ✅ Use touch gestures to scroll within the UI

---

## 🔧 **Debug Information**

### **Understanding Debug Info:**
- **Current URL:** Shows where the bot currently is
- **State:** Shows what the bot is doing:
  - `Ready` - Bot is idle, waiting for commands
  - `Running` - Bot is actively processing accounts
  - `Navigating...` - Bot is moving to next account
  - `Paused` - Campaign exists but bot is stopped

### **Console Logs:**
Open DevTools (`F12`) → Console tab to see detailed logs:
- `🚀` - Bot initialization messages
- `📋` - CSV loading and parsing
- `🔗` - Navigation attempts
- `✅` - Successful actions
- `❌` - Errors and failures

---

## 🛠️ **Manual Recovery Steps**

### **If Bot is Completely Stuck:**
1. Click **STOP** button
2. Click **Clear State** button
3. Confirm the clear operation
4. Reload the page
5. Upload CSV again
6. Start fresh campaign

### **If Extension Stops Working:**
1. Go to `chrome://extensions/`
2. Find "Simple Markt.de DM Bot"
3. Toggle it **OFF** then **ON**
4. Or click **"Reload"** button
5. Refresh the markt.de page

### **If UI Disappears:**
1. Reload the page
2. Check if extension is still enabled
3. Look for the purple UI in top-right corner
4. Try different markt.de pages

---

## 📊 **Performance Tips**

### **Optimize Success Rate:**
- ✅ Use exact URLs copied from markt.de profiles
- ✅ Test a few accounts manually first
- ✅ Ensure your markt.de account is in good standing
- ✅ Don't send too many messages too quickly

### **Adjust Settings:**
- ✅ Increase delay for better reliability (10-15 seconds)
- ✅ Keep message template under 500 characters
- ✅ Process accounts during off-peak hours

### **Monitor Progress:**
- ✅ Watch the debug info for issues
- ✅ Check console logs for detailed errors
- ✅ Use manual controls when needed

---

## 🆘 **Still Having Issues?**

### **Before Reporting Problems:**
1. ✅ Try all solutions in this guide
2. ✅ Clear browser cache and cookies
3. ✅ Test with a small CSV file (2-3 accounts)
4. ✅ Check if markt.de website is working normally

### **Information to Provide:**
- Chrome version and operating system
- Exact error messages from console
- CSV file format (first few lines)
- Steps that led to the problem
- Screenshots of the issue

### **Quick Reset Procedure:**
1. **Stop everything:** Click STOP button
2. **Clear state:** Click Clear State button
3. **Reset extension:** Reload extension in chrome://extensions/
4. **Fresh start:** Reload markt.de page and try again

---

## ✅ **Prevention Tips**

### **Avoid Common Problems:**
- ✅ Always use exact URLs from markt.de
- ✅ Don't modify or construct URLs manually
- ✅ Keep CSV files simple and clean
- ✅ Test with small batches first
- ✅ Monitor the bot while it's running

### **Best Practices:**
- ✅ Save your CSV file as backup
- ✅ Start with conservative delay settings
- ✅ Use manual controls when needed
- ✅ Don't leave bot running unattended for hours

The fixed version is much more robust and should handle most issues automatically, but these troubleshooting steps will help with any remaining edge cases!
