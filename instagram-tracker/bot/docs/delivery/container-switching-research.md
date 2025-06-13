# Container Switching Research - Priority: SetActiveContainer

## Current Goal
**PRIORITY**: Switch to existing container ID `8-2B33-4AC6-9C5F-9D90B5D4F63A` for Instagram automation.

Container creation is secondary - we need to work with existing containers first.

---

## Key Findings

### ✅ Crane Architecture Discovered
- **Location**: `/var/jb/Applications/CraneApplication.app/`
- **Developer**: opa334
- **Mechanism**: Path redirection (not app data replacement)
- **Interface**: Siri Shortcuts/Intents system (NOT Activator)

### ✅ Intent Endpoints Identified
From `CraneApplication.app/Info.plist`:
- `SetActiveCraneContainerIntent` ⭐ **PRIMARY TARGET**
- `CreateCraneContainerIntent` (secondary)
- `NextCraneContainerIntent`
- `SetDefaultCraneContainerIntent`
- `WipeCraneContainerIntent`

### ❌ Command Line Access Blocked
- `shortcuts` command not available
- URL schemes (`shortcuts://`) not working
- No CLI interface to Crane binary
- Direct Intent invocation failed
- **Activator not available** on palera1n rootless (modern jailbreaks use Sileo)
- **cranehelperd daemon** found but no documented CLI interface
- Custom URL schemes (`crane://`) unresponsive

### ✅ Container System Confirmed
- **162 total data containers** found
- **4 containers with 8 files** (likely Crane-managed)
- **Recent activity**: June 12-13 (Crane container creation confirmed)
- **Target container exists** in system
- **Crane daemon running**: `/var/jb/usr/local/libexec/cranehelperd` (PID 425, root process)

---

## Current Status: Need Alternative Execution Method

Since Intent discovery was successful but execution failed, we need alternative approaches:

### Option A: UI Automation (XXTouch Elite)
```lua
-- Automate Crane UI to switch containers
-- Long-press Instagram → Select container ID 8-2B33-4AC6-9C5F-9D90B5D4F63A
```

### Option B: Activator Installation 
```bash
# Traditional jailbreak automation (requires root)
apt install com.a3tweaks.activator
activator send "com.opa334.crane.activatorlistener.SetActiveContainer|com.burbn.instagram|8-2B33-4AC6-9C5F-9D90B5D4F63A|"
```

### Option C: Direct Filesystem Manipulation
```bash
# Research Crane's path redirection mechanism
# Directly modify container mappings if possible
```

---

## Investigation Results Summary

| Method | Status | Feasibility |
|--------|--------|-------------|
| iOS Shortcuts/Intents | ❌ Discovered but not executable | Low |
| Activator Commands | ❌ Not installed, needs root | Medium |
| UI Automation | ⚠️ Possible but slower | High |
| Filesystem Direct | ❓ Unknown | Unknown |

---

## Next Priority Actions

1. **IMMEDIATE**: Test UI automation approach with XXTouch Elite ⭐ **PRIMARY PATH**
2. ~~BACKUP: Attempt Activator installation with root access~~ ❌ **BLOCKED** (Not available on palera1n rootless)
3. **RESEARCH**: Investigate direct filesystem manipulation or daemon IPC

**Target**: Successfully switch to container `8-2B33-4AC6-9C5F-9D90B5D4F63A` and confirm Instagram opens in that context.

### Decision: Proceed with UI Automation
Based on our investigation, **UI automation via XXTouch Elite** is our most viable path forward. All command-line approaches have been exhausted.

---

## Success Criteria
✅ Container switch executes without error  
✅ Instagram launches in target container context  
✅ Method is reproducible for automation  
✅ Can be integrated into production workflow 