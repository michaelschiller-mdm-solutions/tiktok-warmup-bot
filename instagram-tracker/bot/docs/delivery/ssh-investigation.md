# SSH Investigation - Container Switching Research

## Connection Details
- **iPhone IP:** 192.168.178.65
- **SSH User:** mobile
- **Password:** qwertzuio
- **Target Container ID:** 8-2B33-4AC6-9C5F-9D90B5D4F63A

## Investigation Commands

### Step 1: Basic System Check
```bash
# Check device info
uname -a

# Check current user and directory
whoami
pwd

# Check iOS version
sw_vers
```

**Expected:** Confirm we're on the jailbroken iPhone

---

### Step 2: Activator Investigation
```bash
# Check if activator command exists
which activator

# List all activator listeners
activator listeners

# Look specifically for Crane listeners
activator listeners | grep -i crane
```

**Expected:** Find Crane activator listeners for container switching

---

### Step 3: Container File System Investigation
```bash
# Find Instagram app bundles
find /private/var/containers/Bundle/Application/ -name "Instagram.app" -type d

# Find Instagram data containers
find /private/var/mobile/Containers/Data/Application/ -type d -exec ls -la {}/Library/Preferences/ \; | grep -i instagram

# List all data application containers
ls -la /private/var/mobile/Containers/Data/Application/
```

**Expected:** Understand how containers are stored in file system

---

### Step 4: Crane Configuration Investigation
```bash
# Look for Crane preferences and configuration
find /private/var/mobile/Library/Preferences/ -name "*crane*" -type f

# Check for Crane configuration files
ls -la /private/var/mobile/Library/Preferences/com.opa334.crane*

# Read Crane preferences (if found)
cat /private/var/mobile/Library/Preferences/com.opa334.crane.plist
```

**Expected:** Find Crane's container configuration

---

### Step 5: Container Mapping Investigation
```bash
# Look for container mapping files
find /private/var/mobile/ -name "*container*" -type f | head -20

# Check if there's a container registry
ls -la /private/var/mobile/Library/Caches/com.opa334.crane/

# Look for container metadata
find /private/var/mobile/ -name "*8-2B33-4AC6-9C5F-9D90B5D4F63A*" -type f
```

**Expected:** Find how container IDs map to actual containers

---

### Step 6: Process Investigation
```bash
# Check running processes
ps aux | grep -i crane
ps aux | grep -i instagram

# Check SpringBoard process
ps aux | grep SpringBoard
```

**Expected:** See if Crane daemon is running

---

### Step 7: Test Direct Container Switch
```bash
# Try direct activator command (if activator exists)
activator send "com.opa334.crane.activatorlistener.SetActiveContainer|com.burbn.instagram|8-2B33-4AC6-9C5F-9D90B5D4F63A|"

# Check if command executed
echo $?
```

**Expected:** Test if our target container ID works with activator

---

## Investigation Results ✅ COMPLETED

### Results from Step 1: Basic System Check ✅
```
Darwin iPhone 22.6.0 Darwin Kernel Version 22.6.0: Tue Jul  2 20:47:35 PDT 2024
iPhone10,1 arm Darwin
iOS 16.7.11
User: mobile
Directory: /var/jb/var/mobile
```

### Results from Step 2: Activator Investigation ❌ FAILED
```
activator not found
which activator: activator not found
```
**CRITICAL BLOCKER**: Activator is NOT installed

### Results from Step 3: Container File System Investigation ✅
```
Instagram found: /private/var/containers/Bundle/Application/54D0D95A-DF15-4053-8566-C585F276311A/Instagram.app
Data containers: 162 total containers found
Recent containers created June 12-13 (Crane activity confirmed)
```

### Results from Step 4: Crane Configuration Investigation ✅
```
Crane found: /var/jb/Applications/CraneApplication.app/
Developer: opa334 (confirmed)
Crane is installed and functional
```

### Results from Step 5: Container Mapping Investigation ❌
```
No specific container ID files found
Crane preferences not located yet
```

### Results from Step 6: Process Investigation (SKIPPED)
```
[Not executed - focusing on Activator installation]
```

### Results from Step 7: Test Direct Container Switch ❌ FAILED
```
zsh:1: no such file or directory: /var/jb/usr/bin/activator
```

---

## Conclusions
1. **SSH Connection**: ✅ Working with automated authentication via plink
2. **Jailbreak Status**: ✅ palera1n rootless confirmed, iPhone 8, iOS 16.7.11  
3. **Crane Status**: ✅ Installed and functional at `/var/jb/Applications/CraneApplication.app/`
4. **Container System**: ✅ Working (162 data containers, recent Crane activity)
5. **Activator Status**: ❌ **MISSING - CRITICAL BLOCKER**

## Next Steps - INSTALL ACTIVATOR
**Priority 1**: Install Activator to enable programmatic container switching

**Target Command Pattern**:
```bash
activator send "com.opa334.crane.activatorlistener.SetActiveContainer|com.burbn.instagram|8-2B33-4AC6-9C5F-9D90B5D4F63A|"
``` 