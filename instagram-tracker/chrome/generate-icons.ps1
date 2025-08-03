# PowerShell script to generate Chrome Extension Icons

Write-Host "Generating Chrome Extension Icons..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Generate PNG icons
Write-Host "Creating PNG icons..." -ForegroundColor Yellow
try {
    node create-png-icons.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Icons generated successfully!" -ForegroundColor Green
        Write-Host "✓ Extension is ready to load in Chrome" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Go to chrome://extensions/" -ForegroundColor White
        Write-Host "2. Enable 'Developer mode'" -ForegroundColor White
        Write-Host "3. Click 'Load unpacked' and select this folder" -ForegroundColor White
        Write-Host ""
    } else {
        throw "Icon generation failed"
    }
} catch {
    Write-Host ""
    Write-Host "✗ Error generating icons" -ForegroundColor Red
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "Press Enter to exit"