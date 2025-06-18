# 📱 XXTouch API Quick Reference

## 🚀 Essential Endpoints

### **Execute Script**
```javascript
// 1. Select script
POST /select_script_file
{ "filename": "lua/scripts/script_name.lua" }

// 2. Launch script  
POST /launch_script_file
""
```

### **Upload File**
```javascript
POST /write_file
{
    "filename": "lua/scripts/script_name.lua",
    "data": "base64_encoded_content"
}
```

### **Set Clipboard**
```javascript
POST /set_clipboard
{ "text": "Your text here" }
```

### **Upload Image**
```javascript
POST /image_to_album
{ "data": "base64_encoded_image" }
```

### **System Status**
```javascript
GET /status
// Returns system health info
```

---

## 🔧 Code Examples

### **Basic Script Execution**
```javascript
const axios = require('axios');
const API_BASE = 'http://192.168.178.65:46952';

async function runScript(scriptName) {
    // Select
    await axios.post(`${API_BASE}/select_script_file`, {
        filename: `lua/scripts/${scriptName}`
    });
    
    // Launch
    await axios.post(`${API_BASE}/launch_script_file`, '');
}

// Usage
await runScript('open_container1.lua');
```

### **Upload and Run**
```javascript
async function uploadAndRun(scriptContent, scriptName) {
    const base64Content = Buffer.from(scriptContent).toString('base64');
    
    // Upload
    await axios.post(`${API_BASE}/write_file`, {
        filename: `lua/scripts/${scriptName}`,
        data: base64Content
    });
    
    // Run
    await runScript(scriptName);
}
```

### **Set Text for Instagram**
```javascript
async function setInstagramBio(bioText) {
    // Set clipboard
    await axios.post(`${API_BASE}/set_clipboard`, {
        text: bioText
    });
    
    // Run bio change script
    await runScript('change_bio_to_clipboard.lua');
}

// Usage
await setInstagramBio('Living my best life 🌟');
```

### **Upload Profile Picture**
```javascript
async function setProfilePicture(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Upload to gallery
    await axios.post(`${API_BASE}/image_to_album`, {
        data: base64Image
    });
    
    // Run profile pic change script
    await runScript('change_pfp_to_newest_picture.lua');
}

// Usage
await setProfilePicture('./profile.jpg');
```

---

## ⚡ AutomationBridge Integration

```javascript
const AutomationBridge = require('./services/AutomationBridge');

const bridge = new AutomationBridge({
    iphoneIP: '192.168.178.65',
    iphonePort: 46952,
    maxContainers: 30
});

// Start warmup
const result = await bridge.startWarmup('account_123', {
    actions: [
        { type: 'change_bio', data: 'My new bio 🌟' },
        { type: 'change_profile_pic', mediaData: base64Image },
        { type: 'upload_story', mediaData: base64Story }
    ]
});
```

---

## 🚨 Error Handling

```javascript
async function safeAPICall(apiCall) {
    try {
        const response = await apiCall();
        return { success: true, data: response.data };
    } catch (error) {
        if (error.response?.status === 403) {
            return { success: false, error: 'Endpoint forbidden' };
        }
        if (error.code === 'ECONNREFUSED') {
            return { success: false, error: 'iPhone not reachable' };
        }
        return { success: false, error: error.message };
    }
}
```

---

## 📊 Response Format

**Success:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Error:**
```json
{
    "code": 1,
    "message": "文件不存在",
    "error": "File not found"
}
```

---

## 🔗 Common File Paths

- **Scripts:** `lua/scripts/filename.lua`
- **Photos:** Uploaded via `/image_to_album`
- **Temp files:** `tmp/filename`

---

## 📱 Container Scripts

```javascript
// Switch to specific container
await runScript('open_container1.lua');  // Container 1
await runScript('open_container15.lua'); // Container 15
await runScript('open_container30.lua'); // Container 30
```

---

## 🎯 Instagram Actions

```javascript
// Profile actions
await runScript('change_bio_to_clipboard.lua');
await runScript('change_username_to_clipboard.lua');
await runScript('change_name_to_clipboard.lua');
await runScript('change_pfp_to_newest_picture.lua');

// Content actions
await runScript('upload_story_newest_media_no_caption.lua');
await runScript('upload_post_newest_media_no_caption.lua');
```

This quick reference covers 90% of your automation needs! 🚀 