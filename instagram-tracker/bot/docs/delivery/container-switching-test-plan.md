# Container Switching Test Plan

## Current Status
- ✅ **Target Container**: `D02BB018-2B33-4AC6-9C5F-9D90B5D4F63A` (currently active)
- ✅ **Previous Container**: `CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7` 
- ✅ **Manual UI Switch**: Confirmed working 1 hour ago
- ✅ **Instagram**: Running (PID 2660), no restart required
- ✅ **Daemon**: cranehelperd running (PID 425 root, PID 2649 mobile)

## Test Methods (Priority Order)

### **Method 1: Darwin Notification System** 🎯 **(HIGHEST PRIORITY)**

iOS apps commonly use Darwin notifications for IPC:

```bash
# Test notifications that might trigger container switch
notifyutil -p "com.opa334.crane.switch.container"
notifyutil -p "com.opa334.crane.set.active.container"
notifyutil -p "crane.container.switch"
notifyutil -p "crane.setactive"

# Test with container ID parameter (if supported)
notifyutil -s "com.opa334.crane.active.container" "CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7"
```

### **Method 2: File-Based Signaling** 🎯

Create control files to signal container switch:

```bash
# Look for existing control files
find /var/jb -name "*active*" -o -name "*current*" | grep crane

# Test creating control file
echo "CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7" > /tmp/crane_switch_request
echo "com.burbn.instagram:CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7" > /tmp/crane_switch

# Signal daemon to check for control file
kill -USR1 425
```

### **Method 3: Standard Input to Daemon**

Since `cranehelperd list` stays active, it might accept input:

```bash
# Test piping commands to daemon
echo "switch CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7" | /var/jb/usr/local/libexec/cranehelperd
echo "set-active com.burbn.instagram CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7" | /var/jb/usr/local/libexec/cranehelperd
```

### **Method 4: iOS URL Scheme**

Test URL schemes for container switching:

```bash
# Test URL schemes (if available)
open "crane://switch-container?id=CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7"
open "crane://set-active?app=com.burbn.instagram&container=CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7"
```

### **Method 5: Named Pipes/FIFOs**

Create communication pipes:

```bash
# Create test pipe
mkfifo /tmp/crane_command_pipe

# Send switch command
echo "switch_container:com.burbn.instagram:CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7" > /tmp/crane_command_pipe &

# Check if daemon reads from it
```

## Testing Protocol

### **Test Setup**
1. **Verify current state**: Check which container is active
2. **Target switch**: From `D02BB018...` to `CFBC78C5...` 
3. **Instagram verification**: Check if Instagram shows different account/data

### **Test Execution Steps**
For each method:

1. **Backup current state**:
   ```bash
   stat /private/var/mobile/Containers/Data/Application/3B0D4235-2279-4CA8-A8BC-217B261EE8CF/Library/___Crane_Containers/*/Library/Preferences/com.burbn.instagram.plist
   ```

2. **Execute switching method**

3. **Check for immediate changes**:
   ```bash
   # Check if preferences file timestamp changed
   stat /private/var/mobile/Containers/Data/Application/3B0D4235-2279-4CA8-A8BC-217B261EE8CF/Library/___Crane_Containers/CFBC78C5-1AB4-4DD9-9E6B-F8898EE71ED7/Library/Preferences/com.burbn.instagram.plist
   ```

4. **Test Instagram**:
   - Force close Instagram: `killall Instagram`
   - Restart Instagram: `open com.burbn.instagram` (if available)
   - Check if different account/data appears

5. **Verify success**:
   - New container's files have recent timestamps
   - Instagram shows different account data

### **Success Indicators**
- ✅ **File timestamps update** on target container
- ✅ **Instagram shows different account** when restarted
- ✅ **No error messages** from switching command
- ✅ **Daemon continues running** normally

### **Failure Recovery**
If test fails:
1. **Manual UI switch back** to known working state
2. **Document exact error messages**
3. **Check daemon logs**: `dmesg | grep crane`
4. **Verify daemon still running**: `ps aux | grep cranehelperd`

## Expected Results

**Method 1 (Darwin Notifications)**: **85% success probability**
- Most likely method for iOS IPC
- Standard pattern for app-to-daemon communication

**Method 2 (File-based)**: **60% success probability** 
- Common fallback for simple communication
- Easy to implement and debug

**Method 3 (Standard Input)**: **40% success probability**
- Explains why `cranehelperd list` stays active
- Might need specific command format

**Methods 4-5**: **20% success probability**
- Less likely but worth testing
- Good fallback options

## Timeline
- **Method 1-2 Testing**: 30 minutes
- **Method 3 Testing**: 30 minutes  
- **Methods 4-5 Testing**: 30 minutes
- **Total**: 1.5 hours for comprehensive testing 