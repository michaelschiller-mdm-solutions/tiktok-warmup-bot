# Crane Helper Script - Updated to use crane-cli
# Usage: .\crane_helper.ps1 -bundleID "com.burbn.instagram" -containerID "D02BB018-2B33-4AC6-9C5F-9D90B5D4F63A"

param(
    [Parameter(Mandatory=$true)]
    [string]$bundleID,

    [Parameter(Mandatory=$true)]
    [string]$containerID
)

$sshHelperPath = Join-Path $PSScriptRoot "ssh_helper.ps1"

# The command for the newly built crane-cli tool.
# We must use 'sudo' because the tool communicates with a root daemon via XPC,
# which requires elevated privileges.
$craneCommand = "echo qwertzuio | sudo -S crane-cli `"$bundleID`" `"$containerID`""

Write-Host "Executing Crane command: $craneCommand"
& $sshHelperPath -Command $craneCommand 