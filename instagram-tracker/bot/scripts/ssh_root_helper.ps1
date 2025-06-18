# SSH Root Helper Script for iPhone Connection
# Usage: .\ssh_root_helper.ps1 "command_to_run"

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

$phoneIP = "192.168.178.65"
$username = "mobile"
$password = "qwertzuio"  # Default palera1n root password

# For Windows, we'll use plink (PuTTY) if available
try {
    $plink = Get-Command plink -ErrorAction SilentlyContinue
    if ($plink) {
        # Add -batch flag to prevent any interactive prompts
        $plinkCommand = "plink -ssh -batch -l $username -pw $password $phoneIP `"$Command`""
        Write-Host "Using plink (root): $plinkCommand"
        Invoke-Expression $plinkCommand
        return
    }
} catch {
    Write-Warning "plink not available"
}

# Fallback message
Write-Host "Please run manually:"
Write-Host "ssh root@$phoneIP `"$Command`""
Write-Host "Password: $password" 