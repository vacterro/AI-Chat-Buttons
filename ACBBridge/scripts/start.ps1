$ErrorActionPreference = "Stop"

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:17843/health" -Method Get -ErrorAction Stop
    if ($response.ok -eq $true) {
        Write-Host "ACBBridge already running." -ForegroundColor Green
        exit 0
    }
} catch {}

$taskName = "ACBBridge"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    $expectedScript = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "ACBBridge\app\acbbridge.py"
    if (@($existingTask.Actions | Where-Object { $_.Arguments -eq "`"$expectedScript`"" }).Count -ne 1) {
        throw "ACBBridge task name belongs to another command; preserve that task."
    }
    Write-Host "Starting via Scheduled Task..."
    Start-ScheduledTask -TaskName $taskName
} else {
    Write-Host "Task not found. Please run INSTALL.cmd." -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:17843/health" -Method Get -ErrorAction Stop
    if ($response.ok -eq $true) {
        Write-Host "ACBBridge started successfully." -ForegroundColor Green
    }
} catch {
    Write-Host "Failed to verify startup." -ForegroundColor Red
    exit 1
}
