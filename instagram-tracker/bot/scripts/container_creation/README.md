# Batch Container Creation Script

This script automates the creation of multiple Instagram containers by sequentially setting the iPhone clipboard to container numbers and running the container creation Lua script.

## Overview

The `batch_create_containers.js` script performs the following workflow for each container:

1. **Set Clipboard**: Uses `scripts/api/clipboard.js` to set the iPhone clipboard to the container number (e.g., "1", "2", "3")
2. **Wait**: Brief pause to ensure clipboard is set
3. **Create Container**: Executes `create_container_with_clipboard.lua` to create the container
4. **Wait**: 3-second delay between containers to avoid overwhelming the system

## Prerequisites

Before using this script, ensure you have:

1. **Node.js installed** on your computer
2. **iPhone connected** and accessible via SSH
3. **XXTouch Elite** properly configured on the iPhone
4. **Lua scripts uploaded** to the iPhone:
   - `create_container_with_clipboard.lua` must be in the iPhone's script directory
5. **SSH connectivity** working between your computer and iPhone

## Installation

No additional installation required. The script uses Node.js built-in modules and existing project dependencies.

## Usage

### Basic Syntax

```bash
node scripts/container_creation/batch_create_containers.js <count> <startNumber> [iPhone_IP:PORT]
```

### Parameters

- **count**: Number of containers to create (required)
- **startNumber**: The container number to start with (required)
- **iPhone_IP:PORT**: Optional iPhone IP and port (default: `http://192.168.178.65:46952`)

### Examples

#### Create 5 containers starting from number 1
```bash
node scripts/container_creation/batch_create_containers.js 5 1
```
This creates containers numbered: 1, 2, 3, 4, 5

#### Create 3 containers starting from number 10
```bash
node scripts/container_creation/batch_create_containers.js 3 10
```
This creates containers numbered: 10, 11, 12

#### Create containers with custom iPhone IP
```bash
node scripts/container_creation/batch_create_containers.js 5 1 http://192.168.1.100:46952
```

## Frontend Integration

### Required Parameters

The frontend **MUST** provide these two parameters:

1. **Container Count**: How many containers to create
2. **Starting Number**: Which number to start the sequence from

### iPhone IP Configuration

**Default Behavior**: The script uses `http://192.168.178.65:46952` as the default iPhone IP. In most cases, the frontend does **NOT** need to provide an iPhone IP.

**Custom IP (Optional)**: If needed, the frontend can optionally provide a custom iPhone IP in this exact format:
- Format: `http://[IP_ADDRESS]:[PORT]`
- Example: `http://192.168.1.100:46952`

### Frontend Implementation Examples

#### Basic Usage (Recommended)
```javascript
// Frontend sends only the required parameters
const containerCount = 5;
const startingNumber = 1;

// Backend executes with default iPhone IP
const command = `node scripts/container_creation/batch_create_containers.js ${containerCount} ${startingNumber}`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Output:', stdout);
});
```

#### With Custom iPhone IP (If Needed)
```javascript
// Frontend provides custom iPhone IP
const containerCount = 5;
const startingNumber = 1;
const customIPhoneIP = 'http://192.168.1.100:46952';

// Backend executes with custom iPhone IP
const command = `node scripts/container_creation/batch_create_containers.js ${containerCount} ${startingNumber} ${customIPhoneIP}`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Output:', stdout);
});
```

### Frontend Form Fields

**Required Fields:**
- Container Count (number input)
- Starting Number (number input)

**Optional Field:**
- iPhone IP (text input, leave empty to use default)

## Script Workflow

1. **Validation**: Validates input parameters
2. **Initialization**: Sets up paths and connections
3. **Loop for each container**:
   - Calculate container number (startNumber + index)
   - Set iPhone clipboard to container number string
   - Wait 1 second for clipboard to be ready
   - Execute Lua script to create container
   - Wait 3 seconds before next container
4. **Results**: Display summary of successful/failed creations

## Output Example

```
🚀 Batch Container Creation Started
=====================================
📱 iPhone: http://192.168.178.65:46952
🔢 Count: 3 containers
🏁 Starting from: 1

🎯 Creating container 1/3 (Number: 1)
──────────────────────────────────────────────────
📋 Setting clipboard to: "1"
✅ Clipboard set successfully
🔧 Executing container creation script...
✅ Container created successfully
🎉 Container 1 created successfully!
⏳ Waiting 3 seconds before next container...

🎯 Creating container 2/3 (Number: 2)
──────────────────────────────────────────────────
📋 Setting clipboard to: "2"
✅ Clipboard set successfully
🔧 Executing container creation script...
✅ Container created successfully
🎉 Container 2 created successfully!
⏳ Waiting 3 seconds before next container...

🎯 Creating container 3/3 (Number: 3)
──────────────────────────────────────────────────
📋 Setting clipboard to: "3"
✅ Clipboard set successfully
🔧 Executing container creation script...
✅ Container created successfully
🎉 Container 3 created successfully!

🏁 Batch Creation Complete
============================
✅ Successful: 3/3
❌ Failed: 0/3

🎉 All containers created successfully!
```

## Error Handling

The script includes comprehensive error handling:

- **Invalid parameters**: Shows usage help if parameters are missing or invalid
- **Clipboard failures**: Reports if clipboard setting fails
- **Lua script failures**: Reports if container creation fails
- **Connection issues**: Reports network or SSH connectivity problems
- **Partial failures**: Continues with remaining containers even if some fail

## Troubleshooting

### Common Issues

1. **"Failed to set clipboard"**
   - Check iPhone IP address and port
   - Ensure XXTouch Elite is running on iPhone
   - Verify network connectivity

2. **"Failed to create container"**
   - Ensure `create_container_with_clipboard.lua` is uploaded to iPhone
   - Check SSH connectivity to iPhone
   - Verify iPhone is unlocked and ready

3. **"Connection refused"**
   - Check iPhone IP address
   - Ensure XXTouch Elite web server is running
   - Verify firewall settings

### Debug Steps

1. **Test individual components**:
   ```bash
   # Test clipboard functionality
   node scripts/api/clipboard.js "test"
   
   # Test Lua script execution
   node scripts/api/lua_executor.js create_container_with_clipboard.lua
   ```

2. **Check iPhone connectivity**:
   ```bash
   # Test SSH connection
   node scripts/api/lua_executor.js test
   ```

3. **Verify script exists on iPhone**:
   ```bash
   # List remote scripts
   node scripts/api/lua_executor.js list-remote
   ```

## Configuration

### Default Settings

- **iPhone URL**: `http://192.168.178.65:46952`
- **Clipboard wait time**: 1 second
- **Inter-container delay**: 3 seconds

### Customization

To modify timing or behavior, edit the constants in `batch_create_containers.js`:

```javascript
// Wait after setting clipboard
await this.sleep(1000); // 1 second

// Wait between containers
await this.sleep(3000); // 3 seconds
```

## Module Usage

The script can also be imported and used as a module:

```javascript
const BatchContainerCreator = require('./scripts/container_creation/batch_create_containers.js');

const creator = new BatchContainerCreator('http://192.168.1.100:46952');

async function createContainers() {
    const results = await creator.createContainers(5, 1);
    creator.printResults(results);
}

createContainers();
```

## Return Codes

- **0**: All containers created successfully
- **1**: Some or all containers failed to create

This makes it easy to detect success/failure in automated workflows. 