$ErrorActionPreference = "Stop"

Write-Host "Uninstalling AI ChatButtons Bridge..."
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")
$expectedScript = Join-Path $localAppData "ACBBridge\app\acbbridge.py"

# Stop the task
$taskName = "ACBBridge"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    if (@($existingTask.Actions | Where-Object { $_.Arguments -eq "`"$expectedScript`"" }).Count -ne 1) {
        throw "ACBBridge task name belongs to another command; preserve that task."
    }
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed Scheduled Task."
}

# Stop via API to be safe
try {
    $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
    $token = Get-Content (Join-Path $localAppData "ACBBridge\token.txt")
    Invoke-RestMethod -Uri "http://127.0.0.1:17843/v1/shutdown" -Method Post -Headers @{"X-ACB-Token"=$token} -ErrorAction SilentlyContinue
} catch {}

Start-Sleep -Seconds 2

# PID files may name a process that has since been reused. Never kill by PID.
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:17843/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    throw "Bridge still responds; leave its files intact."
} catch {
    if ($_.Exception.Status -ne [Net.WebExceptionStatus]::ConnectFailure) { throw }
}

$purge = $args -contains "--purge-local-state"

$baseDir = [IO.Path]::GetFullPath((Join-Path $localAppData "ACBBridge"))
$targetDir = if ($purge) { $baseDir } else { Join-Path $baseDir "app" }
$targetDir = [IO.Path]::GetFullPath($targetDir)
if ($targetDir -ne $baseDir -and -not $targetDir.StartsWith($baseDir + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Uninstall target escapes the ACBBridge profile folder."
}
if (Test-Path -LiteralPath $targetDir) {
    if (((Get-Item -LiteralPath $targetDir).Attributes -band [IO.FileAttributes]::ReparsePoint) -or
        ((Get-Item -LiteralPath $baseDir).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw "Refusing to remove a linked profile/runtime directory."
    }
    $pendingDirectories = New-Object 'Collections.Generic.Stack[string]'
    $pendingDirectories.Push($targetDir)
    while ($pendingDirectories.Count) {
        foreach ($entry in Get-ChildItem -LiteralPath $pendingDirectories.Pop() -Force) {
            if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing to remove a tree containing links."
            }
            if ($entry.PSIsContainer) { $pendingDirectories.Push($entry.FullName) }
        }
    }
    $configPath = Join-Path $baseDir "config.json"
    if (Test-Path -LiteralPath $configPath) {
        $configuredRoot = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).output.root
        if ($configuredRoot) {
            $auditRoot = [IO.Path]::GetFullPath($configuredRoot)
            if ($auditRoot -eq $targetDir -or $auditRoot.StartsWith($targetDir + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Audit output is inside the uninstall target; preserve it before uninstalling."
            }
        }
    }
    Remove-Item -LiteralPath $targetDir -Recurse -Force
}

Write-Host "Uninstall complete."
