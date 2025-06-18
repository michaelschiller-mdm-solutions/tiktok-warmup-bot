# PBI-2: Implement Direct Command-Line Container Switching

## Overview
This PBI covers the work to create a native command-line tool for iOS that can directly interact with the `cranehelperd` daemon to switch application containers. This will replace the previously proposed, less reliable UI automation approach.

## Problem Statement
The bot needs a reliable, fast, and scriptable way to switch the active Crane container for Instagram. The current approach of UI automation is brittle and slow. Direct command-line interaction with Crane has been researched and found to be possible via XPC.

## User Stories
- As the bot operator, I want to switch Crane containers using a direct command-line tool on the iPhone so that I can avoid unreliable UI automation.

## Technical Approach
We will create a small command-line tool using Theos. The tool will be written in C or Objective-C and will use XPC to communicate directly with the `com.opa334.cranehelperd.xpc` Mach service.

The tool will accept two arguments:
1.  `bundleID`: The bundle identifier of the application (e.g., `com.burbn.instagram`).
2.  `containerID`: The ID of the Crane container to activate.

The implementation will be based on the provided research, which includes a C code snippet for sending the `activateContainer` message via XPC.

## Acceptance Criteria
- A command-line tool named `crane-cli` is created.
- The tool can be compiled on the jailbroken iOS device.
- When invoked (`crane-cli <bundleID> <containerID>`), it successfully changes the active Crane container.
- The bot can successfully execute this command via an SSH connection.
- The old UI automation path for container switching is no longer needed.

## Dependencies
- A jailbroken iOS device with Crane installed.
- Theos installed on the iOS device for compilation.
- SSH access to the device.

## Open Questions
- What is the exact list of XPC actions and their required dictionary keys? The research suggests `"activateContainer"`, but we may need to verify this by inspecting `libCrane.h`.

## Related Tasks
- [View Tasks](./tasks.md) 