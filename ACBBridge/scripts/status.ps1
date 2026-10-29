$ErrorActionPreference = "Stop"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")

$taskName = "ACBBridge"
$autostart = "NOT INSTALLED"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    $autostart = "INSTALLED"
}

try {
    $token = Get-Content (Join-Path $localAppData "ACBBridge\token.txt")
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:17843/v1/status" -Method Get -Headers @{"X-ACB-Token"=$token} -ErrorAction Stop
    
    Write-Host "ACBBridge: RUNNING" -ForegroundColor Green
    Write-Host "PID: $($response.pid)"
    Write-Host "Version: $($response.version)"
    Write-Host "URL: http://127.0.0.1:17843"
    Write-Host "Output: $($response.output_root)"
    $writable = if ($response.output_writable) { "YES" } else { "NO" }
    Write-Host "Output writable: $writable"
    Write-Host "Autostart: $autostart"
    
} catch {
    Write-Host "ACBBridge: UNAVAILABLE (status not verified)" -ForegroundColor Red
    Write-Host "Autostart: $autostart"
    
    $configPath = Join-Path $localAppData "ACBBridge\config.json"
    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath | ConvertFrom-Json
        $root = $cfg.output.root
        if (-not $root) { $root = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Documents\AI ChatButtons Audits" }
        Write-Host "Output: $root"
    }
}
