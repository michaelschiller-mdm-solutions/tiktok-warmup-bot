# 📱 XXTouch Elite API Reference

## 🚀 Overview

This document provides comprehensive documentation for all **XXTouch Elite API endpoints** used in the Instagram automation system. XXTouch Elite runs a web server on the iPhone that accepts HTTP requests for automation control.

**Base URL:** `http://[iPhone_IP]:46952`  
**Default iPhone IP:** `192.168.178.65`  
**Authentication:** None (local network access)  
**Content-Type:** `application/json`

---

## 🔧 Core Script Execution APIs

### **1. Select Script File**

Selects a Lua script file for execution.

**Endpoint:** `POST /select_script_file`

**Request Body:**
```json
{
    "filename": "lua/scripts/script_name.lua"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
const response = await axios.post('http://192.168.178.65:46952/select_script_file', {
    filename: 'lua/scripts/open_container1.lua'
});
```

**Error Codes:**
- `0` - Success
- `1` - File not found
- `2` - Invalid file format

---

### **2. Launch Script File**

Executes the currently selected script file.

**Endpoint:** `POST /launch_script_file`

**Request Body:** Empty string `""`

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
const response = await axios.post('http://192.168.178.65:46952/launch_script_file', '');
```

**Notes:**
- Must call `/select_script_file` first
- Script execution is asynchronous
- No way to get execution status via API

---

## 📁 File Management APIs

### **3. Write File**

Uploads a file to the iPhone filesystem using base64 encoding.

**Endpoint:** `POST /write_file`

**Request Body:**
```json
{
    "filename": "lua/scripts/script_name.lua",
    "data": "base64_encoded_content"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
const fileContent = fs.readFileSync('local_script.lua', 'utf8');
const base64Content = Buffer.from(fileContent).toString('base64');

const response = await axios.post('http://192.168.178.65:46952/write_file', {
    filename: 'lua/scripts/uploaded_script.lua',
    data: base64Content
});
```

**File Paths:**
- Scripts: `lua/scripts/filename.lua`
- Media: `var/mobile/Media/DCIM/100APPLE/filename.jpg`
- Temp files: `tmp/filename`

---

## 📋 Clipboard APIs

### **4. Set Clipboard (Pasteboard)**

Sets text content to the iPhone clipboard/pasteboard.

**Endpoint:** `POST /pasteboard`

**Request Body:**
```json
{
    "type": "public.plain-text",
    "data": "base64_encoded_text"
}
```

**Alternative Endpoint:** `POST /set_clipboard`

**Request Body:**
```json
{
    "text": "plain_text_content"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
// Method 1: Using pasteboard endpoint
const text = "My Instagram bio 🌟";
const base64Text = Buffer.from(text).toString('base64');

const response = await axios.post('http://192.168.178.65:46952/pasteboard', {
    type: 'public.plain-text',
    data: base64Text
});

// Method 2: Using set_clipboard endpoint (simpler)
const response = await axios.post('http://192.168.178.65:46952/set_clipboard', {
    text: "My Instagram bio 🌟"
});
```

---

## 🖼️ Media APIs

### **5. Image to Album**

Saves an image directly to the iPhone photo gallery.

**Endpoint:** `POST /image_to_album`

**Request Body:**
```json
{
    "data": "base64_encoded_image_data"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
const imageBuffer = fs.readFileSync('profile_picture.jpg');
const base64Image = imageBuffer.toString('base64');

const response = await axios.post('http://192.168.178.65:46952/image_to_album', {
    data: base64Image
});
```

**Supported Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- HEIC (.heic) - iOS native format

---

### **6. Upload Media**

Uploads media files to specific iPhone directories.

**Endpoint:** `POST /upload_media`

**Request Body:**
```json
{
    "filename": "media_file.jpg",
    "data": "base64_encoded_media_data"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "操作成功"
}
```

**Example Usage:**
```javascript
const mediaBuffer = fs.readFileSync('story_image.jpg');
const base64Media = mediaBuffer.toString('base64');

const response = await axios.post('http://192.168.178.65:46952/upload_media', {
    filename: 'story_image.jpg',
    data: base64Media
});
```

---

## 📊 System Status APIs

### **7. System Status**

Gets the current status of the XXTouch Elite system.

**Endpoint:** `GET /status`

**Response:**
```json
{
    "code": 0,
    "message": "操作成功",
    "data": {
        "running": true,
        "script_running": false,
        "device_info": {
            "model": "iPhone8,1",
            "version": "16.7.1"
        }
    }
}
```

**Example Usage:**
```javascript
const response = await axios.get('http://192.168.178.65:46952/status');
console.log('System status:', response.data);
```

---

### **8. Device Information**

Gets detailed device information.

**Endpoint:** `GET /device_info`

**Response:**
```json
{
    "code": 0,
    "data": {
        "model": "iPhone8,1",
        "name": "iPhone",
        "version": "16.7.1",
        "screen": {
            "width": 750,
            "height": 1334,
            "scale": 2.0
        }
    }
}
```

---

## 🔍 Directory and File APIs

### **9. List Directory**

Lists contents of a directory on the iPhone.

**Endpoint:** `POST /list_dir`

**Request Body:**
```json
{
    "path": "/var/mobile/Media/DCIM"
}
```

**Response:**
```json
{
    "code": 0,
    "data": [
        {
            "name": "100APPLE",
            "type": "directory",
            "size": 0
        },
        {
            "name": "IMG_0001.JPG",
            "type": "file",
            "size": 2048576
        }
    ]
}
```

---

### **10. Read File**

Reads a file from the iPhone filesystem.

**Endpoint:** `POST /read_file`

**Request Body:**
```json
{
    "filename": "lua/scripts/script_name.lua"
}
```

**Response:**
```json
{
    "code": 0,
    "data": "base64_encoded_file_content"
}
```

---

## 🚨 Error Handling

### **Common Error Codes**

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Operation completed successfully |
| `1` | File Not Found | Requested file does not exist |
| `2` | Invalid Format | File format not supported |
| `3` | Permission Denied | Insufficient permissions |
| `4` | System Error | Internal system error |
| `5` | Network Error | Network connectivity issue |

### **HTTP Status Codes**

| Status | Meaning | Action |
|--------|---------|--------|
| `200` | OK | Request successful |
| `400` | Bad Request | Check request format |
| `403` | Forbidden | Endpoint not available |
| `404` | Not Found | Endpoint doesn't exist |
| `500` | Server Error | XXTouch system error |

### **Error Response Format**

```json
{
    "code": 1,
    "message": "文件不存在",
    "error": "File not found: lua/scripts/missing_script.lua"
}
```

---

## 🔧 AutomationBridge API Integration

### **Script Execution Wrapper**

```javascript
class XXTouchAPI {
    constructor(iphoneIP = '192.168.178.65', port = 46952) {
        this.baseURL = `http://${iphoneIP}:${port}`;
        this.timeout = 30000; // 30 seconds
    }

    async executeScript(scriptName) {
        try {
            // Select script
            await axios.post(`${this.baseURL}/select_script_file`, {
                filename: `lua/scripts/${scriptName}`
            }, { timeout: this.timeout });

            // Launch script
            await axios.post(`${this.baseURL}/launch_script_file`, '', {
                timeout: this.timeout
            });

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async uploadScript(scriptContent, scriptName) {
        try {
            const base64Content = Buffer.from(scriptContent).toString('base64');
            
            await axios.post(`${this.baseURL}/write_file`, {
                filename: `lua/scripts/${scriptName}`,
                data: base64Content
            }, { timeout: this.timeout });

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async setClipboard(text) {
        try {
            await axios.post(`${this.baseURL}/set_clipboard`, {
                text: text
            }, { timeout: 5000 });

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async uploadImage(imageData, saveToGallery = true) {
        try {
            const base64Image = Buffer.from(imageData).toString('base64');
            
            if (saveToGallery) {
                await axios.post(`${this.baseURL}/image_to_album`, {
                    data: base64Image
                }, { timeout: 30000 });
            } else {
                await axios.post(`${this.baseURL}/upload_media`, {
                    filename: 'temp_image.jpg',
                    data: base64Image
                }, { timeout: 30000 });
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async getSystemStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/status`, {
                timeout: 5000
            });

            return { 
                success: true, 
                data: response.data 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}
```

---

## 📝 Best Practices

### **1. Timeout Configuration**

```javascript
const timeouts = {
    script_execution: 30000,    // 30s for script execution
    file_upload: 30000,         // 30s for file uploads
    clipboard: 5000,            // 5s for clipboard operations
    status_check: 5000,         // 5s for status checks
    image_upload: 60000         // 60s for large image uploads
};
```

### **2. Retry Logic**

```javascript
async function executeWithRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### **3. Error Handling**

```javascript
async function safeAPICall(apiFunction) {
    try {
        const result = await apiFunction();
        return { success: true, data: result };
    } catch (error) {
        console.error('API call failed:', error.message);
        
        if (error.response) {
            // HTTP error
            return {
                success: false,
                error: `HTTP ${error.response.status}: ${error.response.statusText}`,
                details: error.response.data
            };
        } else if (error.code === 'ECONNREFUSED') {
            // Connection error
            return {
                success: false,
                error: 'iPhone not reachable - check network connection',
                code: 'CONNECTION_FAILED'
            };
        } else {
            // Other error
            return {
                success: false,
                error: error.message,
                code: 'UNKNOWN_ERROR'
            };
        }
    }
}
```

### **4. Health Monitoring**

```javascript
class XXTouchHealthMonitor {
    constructor(api) {
        this.api = api;
        this.isHealthy = true;
        this.lastCheck = null;
    }

    async performHealthCheck() {
        try {
            const status = await this.api.getSystemStatus();
            
            if (status.success) {
                this.isHealthy = true;
                this.lastCheck = new Date();
                return true;
            } else {
                this.isHealthy = false;
                return false;
            }
        } catch (error) {
            this.isHealthy = false;
            return false;
        }
    }

    startMonitoring(intervalMs = 60000) {
        setInterval(() => {
            this.performHealthCheck();
        }, intervalMs);
    }
}
```

---

## 🔗 Integration with AutomationBridge

The `AutomationBridge` service uses these APIs internally:

```javascript
// In AutomationBridge.js
async executeScript(scriptName) {
    // Uses /select_script_file + /launch_script_file
}

async setClipboard(text) {
    // Uses /set_clipboard
}

async uploadMedia(mediaPath, mediaData) {
    // Uses /image_to_album or /upload_media
}

async performHealthCheck() {
    // Uses /status
}
```

This API reference ensures you understand exactly how the automation system communicates with the iPhone! 🚀 