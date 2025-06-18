# iPhone SSH and Command Execution Guide

This document provides a quick reference for the correct procedures to interact with the jailbroken iPhone via SSH. Following these steps ensures commands are run with the right permissions and avoids common connection issues.

## 1. Core Principles

- **Primary User**: Always connect as the `mobile` user. Direct root login is disabled for security.
- **Root Access**: Use `sudo` for commands that require root privileges. This is done from within a `mobile` user's SSH session.
- **File Transfers**: Use `pscp` (from the PuTTY suite) to transfer files to and from the iPhone.

## 2. Transferring Files (Local to iPhone)

We use `pscp` to copy files. The destination for temporary work should be the `mobile` user's home directory (`/var/mobile/`).

**Steps:**

1.  **Ensure Destination Directory Exists**: `pscp` cannot create directories. The target directory must exist on the iPhone before you try to copy files into it.
    ```powershell
    # To create a directory on the iPhone from your local PowerShell:
    ./scripts/ssh_helper.ps1 "mkdir -p /var/mobile/some_directory"
    ```

2.  **Copy Files**: Use the `pscp` command with the `mobile` user's password (`qwertzuio`).
    ```powershell
    # To copy a directory recursively:
    pscp -pw qwertzuio -r local/path/to/files mobile@192.168.178.65:/var/mobile/some_directory
    ```

## 3. Running Commands

We have two primary ways to run commands, depending on the required privilege level.

### Running Commands as `mobile`

For general commands that don't require root access (like compiling code in the user's home directory), use the `ssh_helper.ps1` script.

- **Simple Command**:
  ```powershell
  ./scripts/ssh_helper.ps1 "your command here"
  ```
- **Complex Command (Chained operations)**: For multi-step commands, especially when setting environment variables, wrap the entire sequence in `sh -c '...'` to ensure it executes in a single, stable shell session.
  ```powershell
  # Note the single quotes inside the double quotes
  ./scripts/ssh_helper.ps1 "sh -c 'export VAR=value; cd /some/dir && another_command'"
  ```

- **Example (Compiling `crane-cli`)**: This requires setting the `THEOS` environment variable and running `make` in the correct directory. We must use the full, exact path to `make` as it is in a non-standard location.
  ```powershell
  ./scripts/ssh_helper.ps1 "sh -c 'export THEOS=/var/theos; /private/preboot/41E2802A643EE34DF1FEEADA88DB05E7A539318DADB9430694BF3CDFD90BE737236C4244BD9FDABD28C1A72AF9E10377/jb-Edu6YrnX/procursus/usr/bin/make -C /var/mobile/crane-cli-build/crane-cli'"
  ```

### Running Commands as `root`

For commands that require elevated privileges (like installing software), use `sudo` within a command sent via `ssh_helper.ps1`. This should also be wrapped in `sh -c '...'` for reliability. When `sudo` is invoked by the `mobile` user, it requires the **`mobile` user's password** (`qwertzuio`).

- **Usage**:
  ```powershell
  # The 'echo' command pipes the mobile user's password to 'sudo -S'
  ./scripts/ssh_helper.ps1 "sh -c 'echo qwertzuio | sudo -S your_command_here'"
  ```
- **Example (Installing `crane-cli`)**:
  ```powershell
  ./scripts/ssh_helper.ps1 "sh -c 'export THEOS=/var/theos; echo qwertzuio | sudo -S /private/preboot/41E2802A643EE34DF1FEEADA88DB05E7A539318DADB9430694BF3CDFD90BE737236C4244BD9FDABD28C1A72AF9E10377/jb-Edu6YrnX/procursus/usr/bin/make -C /var/mobile/crane-cli-build/crane-cli install'"
  ```
This method securely provides the password for the `sudo` prompt without requiring an interactive session and ensures the environment variables are correctly set for the `make` command.

### Getting an Interactive Root Shell (Recommended for Complex Tasks)

For multi-step root operations or for debugging, it is much more reliable to get a persistent root shell. This is a manual, interactive process.

**Steps:**

1.  **Start the Root Session**: From your local PowerShell, run the following command. This will connect to the iPhone and request root privileges.
    ```powershell
    ./scripts/ssh_helper.ps1 "sudo -i -u root"
    ```

2.  **Enter Password Manually**: The shell will connect and you will see a prompt:
    `[sudo] password for mobile:`
    You must **manually type the `mobile` user's password (`qwertzuio`)** and press Enter.

3.  **Confirm Root Access**: Success is confirmed when the prompt changes to the root prompt:
    `iPhone:~ root#`

Once you have this root shell, you can execute any command as root directly without needing `sudo` again. This is the recommended way to perform the `make install` step. 