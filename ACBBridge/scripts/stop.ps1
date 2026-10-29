$ErrorActionPreference = "Stop"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")

try {
    $tokenPath = Join-Path $localAppData "ACBBridge\token.txt"
    if (Test-Path $tokenPath) {
        $token = Get-Content $tokenPath
        Invoke-RestMethod -Uri "http://127.0.0.1:17843/v1/shutdown" -Method Post -Headers @{"X-ACB-Token"=$token} -ErrorAction Stop | Out-Null
        Write-Host "Shutdown requested via API."
    }
} catch {
    Write-Host "API shutdown failed or bridge not responding."
}

Start-Sleep -Seconds 2

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:17843/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    throw "Bridge still responds; leave the process intact and inspect its logs."
} catch {
    if ($_.Exception.Status -ne [Net.WebExceptionStatus]::ConnectFailure) { throw }
}

Write-Host "ACBBridge stopped."
