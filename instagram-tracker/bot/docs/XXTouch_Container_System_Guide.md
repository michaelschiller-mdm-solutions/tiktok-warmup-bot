# 📱 XXTouch Elite Container System Guide

## 🚀 Overview

This guide covers the complete **Container Switching System** for iOS automation using **XXTouch Elite** and **Crane**. The system enables:

- **OCR-based container detection** with scrolling search
- **Automated navigation** through iPhone UI
- **Remote container switching** via API calls
- **Instagram automation** within specific containers

---

## 🧱 System Architecture

### **Core Components**

1. **`iphone_navigation_mapper.lua`** - iPhone UI navigation and touch simulation
2. **`ocr_container_finder.lua`** - OCR-based container discovery and selection
3. **`container_switch_system.lua`** - Main controller combining all features
4. **`test_container_system.js`** - Remote testing client for PC

### **XXTouch Elite Modules Used**

Based on the [XXTouch Elite Lua Manual](https://xxtou.ch/docs/lua-manual/intro):

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `screen` | Screenshot capture | `screen.save()`, `screen.width()`, `screen.height()` |
| `touch` | Touch simulation | `touch.on()`, `touch.move()`, `touch.off()` |
| `key` | Key presses | `key.press(key.type.home)` |
| `image` | Image processing | Image detection and analysis |
| `ocr` | Text recognition | `ocr.recognize()` for container names |
| `sys` | System functions | `sys.msleep()`, `sys.time()` |

---

## 🎯 Container Naming Strategy

### **Recommended Naming Convention**

```
CONTAINER1    # First Instagram account
CONTAINER2    # Second Instagram account  
CONTAINER3    # Third Instagram account
...
```

### **Why This Naming**

- **OCR-friendly**: Clear, simple text that's easy to recognize
- **Searchable**: Can scroll through container list to find specific names
- **Scalable**: Easy to add more containers with incremental numbers
- **Programmatic**: Simple pattern matching with `CONTAINER + number`

### **Configuration**

```lua
-- In ocr_container_finder.lua
ContainerFinder.config = {
    container_prefix = "CONTAINER", -- Change if you prefer different naming
    ocr_confidence_threshold = 0.75, -- Adjust OCR sensitivity
    max_scroll_attempts = 10 -- How many times to scroll when searching
}
```

---

## 🔧 Setup Instructions

### **1. iPhone Prerequisites**

```bash
# Ensure you have these installed via Sileo:
# - XXTouch Elite (from Havoc repo)
# - Crane (from Havoc repo) 
# - OpenSSH (for remote access)

# Create automation directory
mkdir -p /var/mobile/Automation/screenshots/
chmod 755 /var/mobile/Automation/
```

### **2. Script Installation**

Upload the Lua scripts to your iPhone:

```bash
# Via SCP (from your PC)
scp scripts/*.lua root@192.168.178.65:/var/mobile/Automation/
```

### **3. Container Setup in Crane**

1. Open **Crane** app
2. Create containers named: `CONTAINER1`, `CONTAINER2`, etc.
3. Install **Instagram** in each container
4. Test manual switching between containers

---

## 🎮 Usage Examples

### **Basic Container Switching**

```lua
-- Switch to CONTAINER1 and launch Instagram
local containerSystem = require("container_switch_system")
containerSystem.init()

local success = containerSystem.switch_to_container_number(1, true)
if success then
    print("Successfully switched to CONTAINER1")
else
    print("Failed to switch containers")
end
```

### **Find All Available Containers**

```lua
local containerSystem = require("container_switch_system")
containerSystem.init()

local containers = containerSystem.get_available_containers()
print("Found " .. #containers .. " containers:")

for i, container in ipairs(containers) do
    print("  " .. container.name .. " at (" .. container.x .. "," .. container.y .. ")")
end
```

### **OCR-based Container Search**

```lua
local finder = require("ocr_container_finder")
finder.init()

-- Search for specific container by name
local found = finder.find_and_select_container("CONTAINER3")
if found then
    print("Found and selected CONTAINER3")
else
    print("CONTAINER3 not found")
end
```

---

## 🌐 Remote Control (PC → iPhone)

### **Test the System**

```bash
# Quick functionality test
node test_container_system.js --quick

# Complete test suite
node test_container_system.js --full

# Test specific container switch
node test_container_system.js --switch --container=2
```

### **Integration with Your Database**

```javascript
// Example integration
const ContainerTester = require('./test_container_system');

async function switchToAccount(accountId) {
    const tester = new ContainerTester('192.168.178.65', 46952);
    
    // Map account ID to container number
    const containerNumber = getContainerNumber(accountId);
    
    // Switch to container and launch Instagram
    const result = await tester.testContainerNumberSwitch(containerNumber);
    
    return result.success;
}
```

---

## 🔍 OCR Configuration and Tuning

### **OCR Settings**

```lua
-- In ocr_container_finder.lua
ContainerFinder.config = {
    ocr_confidence_threshold = 0.75,  -- Lower = more permissive
    ocr_language = "en",              -- English text recognition
    
    -- Search area (where container list appears)
    container_list_area = {
        x = 50,
        y = 200,
        width = screen.width() - 100,
        height = 400
    }
}
```

### **Improving OCR Accuracy**

1. **Take clear screenshots**: Ensure good lighting and screen clarity
2. **Adjust confidence threshold**: Lower values (0.6-0.7) for harder-to-read text
3. **Optimize search area**: Narrow down the region where containers appear
4. **Use consistent fonts**: Container names should use system fonts

### **Debug OCR Issues**

```lua
-- Test OCR on current screen
local finder = require("ocr_container_finder")
finder.init()

local ocr_result = finder.test_ocr()
-- This will log all detected text with confidence scores
```

---

## 📊 Navigation and Touch Mapping

### **Screen Coordinates**

The system auto-detects screen dimensions:

```lua
local nav = require("iphone_navigation_mapper")
nav.init()

-- Screen info is stored in nav.config
print("Screen: " .. nav.config.screen_width .. "x" .. nav.config.screen_height)
```

### **Touch Simulation**

```lua
-- Basic touch
touch.on(1, x, y)    -- Press down at (x,y)
sys.msleep(200)      -- Hold for 200ms
touch.off(1, x, y)   -- Release

-- Swipe/scroll gesture  
touch.on(1, start_x, start_y)
sys.msleep(100)
touch.move(1, end_x, end_y)
sys.msleep(100) 
touch.off(1, end_x, end_y)
```

### **Key Presses**

```lua
-- Home button
key.press(key.type.home)

-- Volume buttons
key.press(key.type.volume_up)
key.press(key.type.volume_down)

-- Lock button  
key.press(key.type.power)
```

---

## 🐛 Troubleshooting

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| OCR not detecting text | Low confidence threshold | Lower `ocr_confidence_threshold` to 0.6-0.7 |
| Container not found | Wrong naming pattern | Check container names match `CONTAINER1`, `CONTAINER2` format |
| Touch not working | Accessibility permissions | Enable XXTouch Elite in Settings → Accessibility |
| Scripts not executing | Remote service disabled | Check XXTouch Elite → Settings → Remote Control |
| Crane not opening | Wrong bundle ID | Verify Crane's bundle identifier |

### **Debug Mode**

Enable detailed logging:

```lua
-- Set debug to true in all modules
nav.config.debug = true
finder.config.debug = true
containerSystem.config.debug = true
```

### **Screenshot Debugging**

All modules automatically capture screenshots on errors:

```bash
# Check debug screenshots on iPhone
ls -la /var/mobile/Automation/screenshots/
ls -la /var/mobile/Automation/error_*.png
```

---

## 🚀 Advanced Features

### **Retry Logic**

The system includes automatic retry for failed operations:

```lua
ContainerSystem.config = {
    max_retries = 3,        -- Try 3 times before giving up
    retry_delay = 1000,     -- Wait 1 second between retries
}
```

### **Error Recovery**

Automatic screenshot capture on errors:

```lua
ContainerSystem.config = {
    screenshot_on_error = true,  -- Capture debug screenshots
    log_file = "/var/mobile/Automation/container_system.log"
}
```

### **Custom Actions**

Extend the system for Instagram automation:

```lua
-- Example: Set profile picture in current container
function ContainerSystem.set_profile_picture(image_path)
    -- Implementation for Instagram profile picture change
    -- This would include:
    -- 1. Navigate to Instagram profile
    -- 2. Tap profile picture
    -- 3. Select "Change Profile Photo"
    -- 4. Select image from path
    -- 5. Confirm changes
end
```

---

## 📈 Performance Optimization

### **Timing Configuration**

```lua
-- Adjust delays based on your device performance
NavigationMapper.config.delays = {
    short = 300,     -- Fast operations  
    medium = 800,    -- Normal operations
    long = 1500,     -- App launches
    very_long = 3000 -- Complex operations
}
```

### **OCR Optimization**

```lua
-- Reduce search area for faster OCR
container_list_area = {
    x = 100,    -- Narrower search area
    y = 250,    -- Skip top UI elements  
    width = screen.width() - 200,
    height = 300  -- Focus on container list only
}
```

---

## 🔒 Security Considerations

### **Remote Access**

- **Change default passwords** for SSH and XXTouch Elite
- **Use VPN** for remote access outside local network
- **Limit API access** to trusted IP addresses only

### **Container Isolation**

- Each container maintains **separate Instagram sessions**
- **No cross-contamination** between accounts
- **Independent cookies and data** per container

---

## 📚 Additional Resources

- [XXTouch Elite Lua Manual](https://xxtou.ch/docs/lua-manual/intro) - Complete API reference
- [Crane Documentation](https://github.com/cpdigitaldarkroom/Crane) - Container management
- [Lua 5.3 Reference](https://www.lua.org/manual/5.3/) - Language documentation

---

## 🔄 Next Steps

1. **Test the basic system** with `--quick` mode
2. **Create your containers** in Crane with proper naming
3. **Run full test suite** to verify everything works
4. **Implement Instagram actions** (profile pic, bio, stories)
5. **Integrate with your database** for automated scheduling 