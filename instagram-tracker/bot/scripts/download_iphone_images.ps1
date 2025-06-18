# Download iPhone Images Script
# Downloads recent images from iPhone to test_images directory

$phoneIP = "192.168.178.65"
$username = "mobile"
$password = "qwertzuio"

# Create test_images directory if it doesn't exist
if (-not (Test-Path "../test_images")) {
    New-Item -ItemType Directory -Path "../test_images"
}

# Download the most recent images
$images = @("IMG_0008.HEIC", "IMG_0007.HEIC", "IMG_0006.HEIC", "IMG_0005.HEIC")

foreach ($image in $images) {
    $remoteFile = "/var/mobile/Media/DCIM/100APPLE/$image"
    $localFile = "../test_images/iphone_$image"
    
    Write-Host "Downloading $image..."
    
    try {
        # Try with pscp first
        $command = "pscp -scp -batch -pw $password $username@$phoneIP`:$remoteFile $localFile"
        Write-Host "Command: $command"
        Invoke-Expression $command
        
        if (Test-Path $localFile) {
            Write-Host "Successfully downloaded $image" -ForegroundColor Green
        } else {
            Write-Host "Failed to download $image" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error downloading $image`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Download complete. Check ../test_images/ directory for downloaded files." 