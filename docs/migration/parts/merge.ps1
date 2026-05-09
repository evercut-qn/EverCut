# PowerShell merge script for Backend Migration Guide
# Usage: .\merge.ps1

$parts = @(
    "backend-part1.md",
    "backend-part2.md",
    "backend-part3.md",
    "backend-part4.md",
    "backend-part5.md"
)

$outputFile = "..\01-BACKEND-MIGRATION-GUIDE.md"

# Clear/create output file
"" | Out-File -FilePath $outputFile -Encoding utf8

foreach ($part in $parts) {
    if (Test-Path $part) {
        $content = Get-Content -Path $part -Raw -Encoding utf8
        # Remove HTML comments (part markers)
        $content = $content -replace '<!--.*?-->', ''
        Add-Content -Path $outputFile -Value $content -Encoding utf8
        Write-Host "Merged: $part"
    } else {
        Write-Host "WARNING: Missing part: $part" -ForegroundColor Yellow
    }
}

Write-Host "`nBackend Migration Guide assembled at: $outputFile" -ForegroundColor Green

# Infrastructure Guide
$infraParts = @(
    "infra-part1.md"
)

$infraOutput = "..\02-INFRASTRUCTURE-SETUP-GUIDE.md"
"" | Out-File -FilePath $infraOutput -Encoding utf8

foreach ($part in $infraParts) {
    if (Test-Path $part) {
        $content = Get-Content -Path $part -Raw -Encoding utf8
        $content = $content -replace '<!--.*?-->', ''
        Add-Content -Path $infraOutput -Value $content -Encoding utf8
        Write-Host "Merged: $part"
    } else {
        Write-Host "WARNING: Missing part: $part" -ForegroundColor Yellow
    }
}

Write-Host "Infrastructure Guide assembled at: $infraOutput" -ForegroundColor Green

# Flutter Guide
$flutterParts = @(
    "flutter-part1.md"
)

$flutterOutput = "..\03-FLUTTER-INTEGRATION-GUIDE.md"
"" | Out-File -FilePath $flutterOutput -Encoding utf8

foreach ($part in $flutterParts) {
    if (Test-Path $part) {
        $content = Get-Content -Path $part -Raw -Encoding utf8
        $content = $content -replace '<!--.*?-->', ''
        Add-Content -Path $flutterOutput -Value $content -Encoding utf8
        Write-Host "Merged: $part"
    } else {
        Write-Host "WARNING: Missing part: $part" -ForegroundColor Yellow
    }
}

Write-Host "Flutter Guide assembled at: $flutterOutput" -ForegroundColor Green
Write-Host "`nAll guides assembled successfully!" -ForegroundColor Cyan
