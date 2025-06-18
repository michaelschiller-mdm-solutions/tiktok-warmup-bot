# Tasks for PBI 2: Implement Direct Command-Line Container Switching

This document lists all tasks associated with PBI 2.

**Parent PBI**: [PBI 2: Implement Direct Command-Line Container Switching](./prd.md)

## Task Summary

| Task ID | Name                                                     | Status   | Description                                                                 |
| :------ | :------------------------------------------------------- | :------- | :-------------------------------------------------------------------------- |
| 2-1     | [Create C source for `crane-cli` tool](./2-1.md)         | Proposed | Create the `main.c` file with XPC logic to talk to `cranehelperd`.          |
| 2-2     | [Create Theos Makefile for `crane-cli`](./2-2.md)        | Proposed | Create the Makefile needed by Theos to compile the tool.                    |
| 2-3     | [Create build & deploy script](./2-3.md)                 | Proposed | Create a shell script to automate the build and installation on the iPhone. |
| 2-4     | [Integrate `crane-cli` into bot](./2-4.md)               | Proposed | Update the bot to use the new SSH command instead of other methods.         |
| 2-5     | [E2E Test: Verify Container Switching](./2-5.md)         | Proposed | Perform an end-to-end test to confirm the new CLI works as expected.        | 