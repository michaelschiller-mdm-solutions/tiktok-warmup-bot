# Activator Installation Plan

## Current Status
**CRITICAL BLOCKER**: Activator is not installed on the jailbroken iPhone, preventing programmatic container switching with Crane.

**Device**: iPhone 8 (iPhone10,1), iOS 16.7.11, palera1n rootless jailbreak

## Installation Methods

### Method 1: Package Manager Installation (Recommended)
Since we have Sileo installed, this is the preferred method:

```bash
# Check available repos
apt list --upgradable

# Search for Activator
apt search activator

# Install if found
apt install com.a3tweaks.activator
```

### Method 2: Manual .deb Installation
If not available in current repos:

1. **Download Activator .deb**:
   - Source: BigBoss repo or rpetri.ch/cydia/activator/
   - Version: Latest compatible with iOS 16.7.11
   - File: `libactivator_*.deb`

2. **Transfer to iPhone**:
   ```bash
   scp activator.deb mobile@192.168.178.65:/tmp/
   ```

3. **Install manually**:
   ```bash
   dpkg -i /tmp/activator.deb
   apt-get install -f  # Fix dependencies if needed
   ```

### Method 3: Add BigBoss Repository
If Activator isn't available, add BigBoss repo:

```bash
# Add BigBoss repo (if not present)
echo "deb https://apt.thebigboss.org/repofiles/cydia/ stable main" >> /etc/apt/sources.list.d/bigboss.list

# Update package list
apt update

# Install Activator
apt install com.a3tweaks.activator
```

## Post-Installation Verification

### Step 1: Verify Installation
```bash
# Check if activator command exists
which activator

# Test basic functionality
activator version

# List available listeners
activator listeners
```

### Step 2: Verify Crane Integration
```bash
# Look for Crane listeners
activator listeners | grep -i crane

# Expected output should include:
# com.opa334.crane.activatorlistener.SetActiveContainer
```

### Step 3: Test Container Switching
```bash
# Test with our target container ID
activator send "com.opa334.crane.activatorlistener.SetActiveContainer|com.burbn.instagram|8-2B33-4AC6-9C5F-9D90B5D4F63A|"

# Verify no errors
echo $?
```

## Alternative Solutions (If Activator Fails)

### Option A: Direct Crane API Investigation - **NEW PRIORITY**
**CRITICAL INSIGHT FROM DEVELOPER**: Crane works by "redirecting paths accessed by the app" rather than app data replacement.

Research Crane's **filesystem redirection mechanism**:
- Path redirection system (how containers redirect app data paths)
- Container mapping files/configuration
- Direct filesystem manipulation instead of Activator
- Possible direct container switching via filesystem operations

### Option B: UI Automation Fallback
Use XXTouch Elite to:
- Automate Crane UI interactions
- Switch containers via GUI
- Less efficient but functional

### Option C: Research Alternative Container Managers
Investigate other container management tools if Activator remains problematic.

## Implementation Priority

1. **IMMEDIATE**: Try Method 1 (package manager)
2. **BACKUP**: Method 2 (manual installation) 
3. **FALLBACK**: Method 3 (add BigBoss repo)
4. **LAST RESORT**: Alternative solutions

## Success Criteria
✅ `activator` command available in PATH  
✅ Crane listeners visible in `activator listeners`  
✅ Container switching command executes without error  
✅ Target container ID responds to switch command

## BREAKTHROUGH DISCOVERY! 🎯

### Crane Uses Siri Shortcuts/Intents NOT Activator!

From Crane's Info.plist, we discovered these **Intent** entries:
- `CreateCraneContainerIntent` ⭐ **CONTAINER CREATION!**
- `NextCraneContainerIntent` - Navigate between containers
- `SetActiveCraneContainerIntent` ⭐ **CONTAINER SWITCHING!**
- `SetDefaultCraneContainerIntent` - Set default container
- `WipeCraneContainerIntent` ⭐ **CONTAINER DELETION!**

**CONCLUSION**: Crane provides **FULL CONTAINER LIFECYCLE MANAGEMENT** via iOS Shortcuts/Intents system!

### This Enables Complete Automation:
✅ **Create 1000 Instagram containers** programmatically  
✅ **Switch between containers** automatically  
✅ **Manage container lifecycle** without UI interaction  
✅ **Scale to any number of accounts** via Intent API

### New Investigation Priority
1. **Research iOS Shortcuts API** for programmatic execution
2. **Find Siri Shortcuts command-line interface** 
3. **Test Intent-based container switching**
4. **Fallback to Activator installation** if Intents fail

### Command Patterns to Test for Full Automation

#### Container Creation (1000 accounts):
```bash
# Create new Instagram container for each account
shortcuts run "CreateCraneContainerIntent" --app "com.burbn.instagram" --name "account_001"
shortcuts run "CreateCraneContainerIntent" --app "com.burbn.instagram" --name "account_002"
# ... repeat for 1000 accounts
```

#### Container Switching (account management):
```bash
# Switch to specific container for automation
shortcuts run "SetActiveCraneContainerIntent" --app "com.burbn.instagram" --container "account_001"
```

#### Container Management:
```bash
# Navigate containers
shortcuts run "NextCraneContainerIntent" --app "com.burbn.instagram"

# Set default container  
shortcuts run "SetDefaultCraneContainerIntent" --app "com.burbn.instagram" --container "account_001"

# Clean up containers
shortcuts run "WipeCraneContainerIntent" --app "com.burbn.instagram" --container "account_999"
```

#### Alternative approaches if shortcuts CLI doesn't exist:
```bash
# URL scheme approach
open "intent://CreateCraneContainerIntent?app=com.burbn.instagram&name=account_001"

# Direct SpringBoard API calls
# CFUserNotificationDisplayAlert or similar iOS APIs
```

## Next Steps
**NEW PRIORITY**: Research iOS Intents/Shortcuts system for container switching
**FALLBACK**: Continue with Activator installation if Intents approach fails 