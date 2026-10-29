$ErrorActionPreference = "Stop"
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$baseDir = Join-Path $localAppData "ACBBridge"
$appDir = Join-Path $baseDir "app"

Write-Host "Installing AI ChatButtons Bridge..."

# Create directories
New-Item -ItemType Directory -Force -Path $appDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $baseDir "logs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $baseDir "state\runs") | Out-Null

# Copy app files
$sourceDir = (Get-Item $MyInvocation.MyCommand.Path).Directory.Parent.FullName
$runtimeFiles = @("acbbridge.py", "config.default.json", "START.cmd", "STOP.cmd", "STATUS.cmd", "OPEN_OUTPUT.cmd", "UNINSTALL.cmd", "README.md")
foreach ($relative in $runtimeFiles) {
    Copy-Item -LiteralPath (Join-Path $sourceDir $relative) -Destination $appDir -Force
}
New-Item -ItemType Directory -Force -Path (Join-Path $appDir "scripts") | Out-Null
foreach ($relative in @("start.ps1", "stop.ps1", "status.ps1", "open-output.ps1", "uninstall.ps1")) {
    Copy-Item -LiteralPath (Join-Path $sourceDir "scripts\$relative") -Destination (Join-Path $appDir "scripts") -Force
}

# Create default config if not exists
$targetConfig = Join-Path $baseDir "config.json"
if (-not (Test-Path $targetConfig)) {
    $sourceConfig = Join-Path $sourceDir "config.default.json"
    if (Test-Path $sourceConfig) {
        Copy-Item $sourceConfig $targetConfig
        Write-Host "Created default config.json"
    }
}

# Resolve pythonw.exe
$pythonw = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
if (-not $pythonw) {
    $python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if ($python) {
        $pythonw = $python -replace 'python\.exe$', 'pythonw.exe'
    }
}

if (-not $pythonw -or -not (Test-Path $pythonw)) {
    Write-Warning "pythonw.exe not found in PATH. Using python.exe (might show console)."
    $pythonw = "python.exe"
}

# Set up autostart task
$taskName = "ACBBridge"
$scriptPath = Join-Path $appDir "acbbridge.py"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask -and @($existingTask.Actions | Where-Object { $_.Arguments -eq "`"$scriptPath`"" }).Count -ne 1) {
    throw "ACBBridge task name belongs to another command; preserve that task."
}

Write-Host "Configuring autostart..."
$action = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$scriptPath`"" -WorkingDirectory $appDir
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit 0
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Starting ACBBridge..."
Start-ScheduledTask -TaskName $taskName

# Wait for health endpoint
$maxRetries = 10
$started = $false
for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:17843/health" -Method Get -ErrorAction Stop
        if ($response.ok -eq $true) {
            $started = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($started) {
    Write-Host "ACBBridge installed and RUNNING." -ForegroundColor Green
    
    Write-Host "Pair manually using your private token.txt in the ACBBridge profile folder."
    Write-Host "Installation does not print or copy pairing credentials."
} else {
    Write-Warning "Installed, but failed to verify /health endpoint. Check logs."
}
