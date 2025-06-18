# SSH Helper Script for iPhone Connection
# Usage: .\ssh_helper.ps1 "command_to_run"

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

$phoneIP = "192.168.178.65"
$username = "mobile"
$password = "qwertzuio"

# Create a temporary expect-like script for password automation
$expectScript = @"
spawn ssh $username@$phoneIP "$Command"
expect "Password for"
send "$password\r"
expect eof
"@

# For Windows, we'll use plink (PuTTY) if available, or create a batch approach
# First try with plink
try {
    $plink = Get-Command plink -ErrorAction SilentlyContinue
    if ($plink) {
        # Add -batch flag to prevent any interactive prompts and -t to force a TTY
        $plinkCommand = "plink -ssh -batch -t -l $username -pw $password $phoneIP `"$Command`""
        Write-Host "Using plink: $plinkCommand"
        Invoke-Expression $plinkCommand
        return
    }
} catch {
    Write-Warning "plink not available"
}

# Fallback: Use WSL if available
try {
    $wsl = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wsl) {
        $wslCommand = "wsl sshpass -p '$password' ssh -o StrictHostKeyChecking=no $username@$phoneIP '$Command'"
        Write-Host "Using WSL: $wslCommand"
        Invoke-Expression $wslCommand
        return
    }
} catch {
    Write-Warning "WSL not available"
}

# Final fallback: Provide instructions for manual execution
Write-Host "Please run manually:"
Write-Host "ssh $username@$phoneIP `"$Command`""
Write-Host "Password: $password" 