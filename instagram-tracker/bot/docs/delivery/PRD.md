# 📱 Instagram Automation Architecture – Crane + XXTouch Elite + HTTP Server

## 🚀 Overview

This project aims to **automate complete Instagram account management** using a jailbroken iPhone. Each Instagram account will live in its own **Crane container**. The automation will be triggered remotely, and all content comes from an internal database.

### **Complete Feature Set:**
- ✅ **Account Switching** (Crane container management)
- ✅ **Profile Picture Updates** (SCP upload + UI automation)
- ✅ **Bio Text Updates** (Virtual keyboard automation)
- ✅ **Post Creation** (Image upload + caption entry)
- ✅ **Story Publishing** (Image/video + caption)
- ✅ **Highlights Management** (Story → Highlight conversion)
- ✅ **Status Reporting** (API callbacks to database)
- ✅ **Virtual Keyboard Mapping** (A-Z letter automation)

---

## 🧱 System Components

### 1. Jailbroken iPhone
- **iPhone**: iOS 16.7.1 (rootless jailbreak)
- **Jailbreak tool**: palera1n rootless mode
- **Package manager**: Sileo
- **Installed tweaks/tools**:
  - [x] **Crane** (for multi-container management)
  - [x] **XXTouch Elite** (for Lua-based UI automation)
  - [x] **OpenSSH** (for file transfers and remote access)

---

### 2. Remote Machine (Windows PC)
- Hosts the **internal account database**
- Sends content (profile pic, posts, stories, captions) via **SCP**
- Calls automation endpoints via HTTP
- Receives status updates from iPhone

---

## 📊 Complete Process Flow

### 🔁 **Account Setup Flow**
1. **PC → iPhone**: Upload account assets via SCP
   - Profile picture: `/var/mobile/Automation/accounts/acc123/profile.jpg`
   - Post images: `/var/mobile/Automation/accounts/acc123/posts/`
   - Story images: `/var/mobile/Automation/accounts/acc123/stories/`
   - Bio text: `/var/mobile/Automation/accounts/acc123/bio.txt`

2. **PC → iPhone**: HTTP request `POST /create-container?name=acc123`

3. **iPhone**: Crane creates container + Instagram installation

4. **iPhone**: Login automation + profile setup

### 📅 **Daily Task Automation**
- **Day 1**: Switch container → set profile picture
- **Day 2**: Switch container → update bio text
- **Day 3**: Switch container → upload post with caption
- **Day 4**: Switch container → publish story
- **Day 5**: Switch container → add story to highlights

### 🔄 **Status Reporting Flow**
- **iPhone → PC**: HTTP POST to database API after each action
- **Status codes**: success/failure/retry_needed
- **Logs**: Detailed execution logs with screenshots

---

## 📂 Enhanced Implementation Architecture

### **Bot Communication Flow**
```
Windows PC Database → SCP File Transfer → iPhone Storage
Windows PC → HTTP API → XXTouch Elite → Crane Containers → Instagram Actions
iPhone → HTTP Callbacks → Windows PC Database (Status Updates)
```

### **Pasteboard Clipboard System** ✅
```
Text Input Request → XXTouch Pasteboard API → iOS Clipboard → Automated Paste Gesture
Image Input Request → XXTouch Pasteboard API → iOS Clipboard → Automated Paste Gesture
```

### **File Management System**
```
/var/mobile/Automation/
├── accounts/
│   ├── acc123/
│   │   ├── profile.jpg
│   │   ├── bio.txt
│   │   ├── posts/
│   │   │   ├── post1.jpg
│   │   │   ├── post1_caption.txt
│   │   └── stories/
│   │       ├── story1.jpg
│   │       ├── story1_caption.txt
├── scripts/
│   ├── pasteboard_actions/
│   │   ├── paste_text.lua
│   │   ├── paste_image.lua
│   │   └── clear_field.lua
├── screenshots/ (debug images)
└── logs/ (execution logs)
```

---

## 📋 **Pasteboard Clipboard Strategy** ✅

### **Text Input Process**
1. **Send text to XXTouch Pasteboard API** via HTTP request
2. **Record paste gesture** using XXTouch Elite's recording feature
3. **Execute paste automation** to input text instantly
4. **Validate text input** and retry if needed

### **Image Input Process**
1. **Send image to XXTouch Pasteboard API** via HTTP request
2. **Record paste gesture** for image fields (profile pics, posts, stories)
3. **Execute paste automation** to input images
4. **Handle image selection and cropping** workflows

### **Clipboard Automation Algorithm**
```javascript
// Text input via pasteboard
async function inputText(text) {
    await writeToClipboard(text, 'public.plain-text');
    await executePasteGesture();
    await validateTextInput(text);
}

// Image input via pasteboard  
async function inputImage(imagePath) {
    await writeToClipboard(imageData, 'public.image');
    await executePasteGesture();
    await handleImageSelection();
}
```

---

## 🧪 **Required Automation Tasks (XXTouch)**

### **1. Profile Picture Change**
- Navigate to Instagram profile
- Tap profile picture → "Change Profile Photo"
- Select "Choose from Library"
- Navigate to uploaded image file
- Crop and confirm

### **2. Bio Text Update**
- Navigate to "Edit Profile"
- Tap bio text field
- Clear existing text (select all + delete)
- Send bio text to pasteboard API
- Execute paste gesture automation
- Save changes

### **3. Post Creation**
- Tap "+" button → "Post"
- Send image to pasteboard API → Execute paste gesture
- Add caption using pasteboard API → Execute paste gesture
- Configure post settings
- Share post

### **4. Story Publishing**
- Tap "+" button → "Story"
- Select image/video
- Add text/stickers if needed
- Share to story

### **5. Highlights Management**
- Access story highlights
- Select story to add to highlight
- Create new highlight or add to existing
- Set highlight cover and name

---

## 🔗 **API Endpoints Design**

### **Incoming Requests (PC → iPhone)**
```
POST /switch-container          # Switch to specific container
POST /set-profile-picture       # Change profile picture
POST /update-bio               # Update bio text
POST /create-post              # Upload post with caption
POST /publish-story            # Publish story
POST /manage-highlights        # Add stories to highlights
GET  /get-status              # Get current automation status
```

### **Outgoing Requests (iPhone → PC)**
```
POST https://your-api.com/status-update
{
    "account_id": "acc123",
    "action": "profile_picture_updated",
    "status": "success",
    "timestamp": "2025-06-13T17:00:00Z",
    "screenshot": "base64_image_data"
}
```

---

## 📋 **Implementation Phases**

### **Phase 1: Foundation (Current)**
- [x] Container switching with OCR
- [x] Basic navigation system
- [ ] Fix XXTouch Elite execution issues

### **Phase 2: Pasteboard Integration** ✅
- [x] Test pasteboard text API (working perfectly!)
- [ ] Test pasteboard image API
- [ ] Record paste gesture automation
- [ ] Create text input via clipboard + paste
- [ ] Create image input via clipboard + paste

### **Phase 3: Instagram Actions**
- [ ] Profile picture change automation
- [ ] Post creation workflow
- [ ] Story publishing system
- [ ] Highlights management

### **Phase 4: Integration**
- [ ] SCP file transfer system
- [ ] API callback system
- [ ] Error handling and recovery
- [ ] Comprehensive testing

### **Phase 5: Production**
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Monitoring and logging
- [ ] Documentation and training

---

## 🧪 **Pasteboard Recording Plan**

### **Recording Session Structure**
1. **Open target app** (Instagram, Notes, etc. for testing)
2. **Record paste gestures for different contexts**:
   ```bash
   # Record text paste gesture
   # Save as: paste_text.lua
   
   # Record image paste gesture (for posts/stories)
   # Save as: paste_image.lua
   
   # Record text field clearing
   # Save as: clear_field.lua
   ```

3. **Record context-specific paste actions**:
   - `paste_bio.lua` - Paste in Instagram bio field
   - `paste_caption.lua` - Paste in Instagram caption field
   - `paste_story_text.lua` - Paste in Instagram story text
   - `paste_profile_pic.lua` - Paste profile picture selection

### **Testing Strategy**
```javascript
// Test complete text workflow
await writeToClipboard("Test bio text");
await executeLuaScript("paste_bio.lua");

// Test complete image workflow  
await writeToClipboard(imageData, "public.image");
await executeLuaScript("paste_profile_pic.lua");
```

---

## 🔧 **Next Immediate Steps**

### **1. Resolve XXTouch Elite Issues**
- Check accessibility permissions
- Verify service status
- Test basic touch functionality

### **2. Create Keyboard Recording Environment**
- Set up clean recording session
- Create storage structure for scripts
- Test script playback system

### **3. Build Text Input Engine**
- Create modular character mapping
- Implement text-to-script conversion
- Add error handling and recovery

---

## 📚 **Documentation Requirements**

### **For Each Instagram Action:**
- Step-by-step UI flow documentation
- Screenshot references for each step
- Error handling procedures
- Timing and delay specifications

### **For Virtual Keyboard:**
- Complete character mapping table
- Special character combinations
- Keyboard state management
- Text input validation procedures

---

## ✅ **Success Criteria**

1. **Container switching works 100% reliably**
2. **Virtual keyboard can type any text accurately**
3. **All Instagram actions complete successfully**
4. **Error handling and recovery procedures work**
5. **Status reporting provides complete visibility**
6. **System can manage 10+ accounts simultaneously**

This comprehensive approach will give you a **complete Instagram automation system** that can handle all the required tasks reliably and at scale.

## 🧪 Hands-On Testing Plan

### **Phase 1: Environment Setup & Basic Tool Testing**

#### **Step 1: Jailbreak Verification & Tool Installation**
- [x] Confirm palera1n rootless jailbreak is working
- [x] Install XXTouch Elite ($9.99 from Havoc repo)
- [x] Install Crane ($4.99 from Havoc repo) 
- [x] Test basic SSH access to iPhone
- [x] Document iOS version, jailbreak status, and tool versions

#### **Step 2: XXTouch Elite Basic Testing**
- [ ] Launch XXTouch Elite app
- [ ] Test basic Lua script execution (simple screen tap)
- [ ] Test screenshot capture functionality
- [ ] Test image recognition with a simple target
- [ ] Test text input simulation
- [ ] Document Lua API functions available

#### **Step 3: Crane Basic Testing**
- [ ] Create a test container manually through Crane UI
- [ ] Install Instagram in the test container
- [ ] Test switching between containers
- [ ] Test if apps remain logged in per container
- [ ] Document container creation/switching process

### **Phase 2: Integration Testing**

#### **Step 4: XXTouch + Crane Integration**
- [ ] Test XXTouch script controlling Crane container switching
- [ ] Test launching Instagram in specific containers via script
- [ ] Test if XXTouch can detect which container is active
- [ ] Document integration methods that work

#### **Step 5: Instagram UI Automation**
- [ ] Map Instagram login screen elements (coordinates/images)
- [ ] Test automated login process
- [ ] Test profile picture change automation
- [ ] Test bio editing automation
- [ ] Test story upload process
- [ ] Document UI element locations and automation scripts

### **Phase 3: Remote Control Testing**

#### **Step 6: HTTP Server Setup**
- [ ] Test XXTouch Elite's built-in web server
- [ ] Test remote script execution via HTTP
- [ ] Alternative: Install and test lighttpd
- [ ] Test file upload capabilities (for images/content)
- [ ] Document remote access methods

#### **Step 7: Complete Workflow Testing**
- [ ] Test end-to-end automation: PC → iPhone → Container → Instagram
- [ ] Test error handling and recovery
- [ ] Test multiple account management
- [ ] Document complete workflow with timings

### **Testing Documentation Format**

For each test, document:
```markdown
## Test: [Description]
**Date:** YYYY-MM-DD
**Tools:** XXTouch Elite v.X.X, Crane v.X.X
**Goal:** What we're trying to achieve
**Method:** Step-by-step process
**Result:** ✅ Success / ❌ Failed / ⚠️ Partial
**Notes:** Important observations, code snippets, screenshots
**Next Steps:** What to try next
```

---

