$ErrorActionPreference = "Stop"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$configPath = Join-Path $localAppData "ACBBridge\config.json"

if (Test-Path $configPath) {
    $cfg = Get-Content $configPath | ConvertFrom-Json
    $root = $cfg.output.root
    if (-not $root) { $root = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Documents\AI ChatButtons Audits" }
    if (Test-Path $root) {
        Invoke-Item $root
    } else {
        Write-Host "Output root does not exist: $root" -ForegroundColor Yellow
    }
} else {
    Write-Host "Config not found. Install first." -ForegroundColor Red
}
