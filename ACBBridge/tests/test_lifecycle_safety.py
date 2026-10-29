"""Run actual lifecycle scripts behind mocks; never access an operator profile."""
import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest


def lifecycle(tmp_path, script, case):
    runtime = shutil.which('powershell.exe')
    if not runtime:
        pytest.skip('PowerShell 5 is required for Windows lifecycle checks')
    root = Path(os.environ.get('ACB_LIFECYCLE_SUBJECT', Path(__file__).resolve().parents[1]))
    harness = tmp_path / 'lifecycle-mocks.ps1'
    harness.write_text(r'''
param($Subject, $Case)
$ErrorActionPreference = 'Stop'
$global:ACBTestRemoved = @()
$global:ACBTestCopied = @()
function New-Item { param($ItemType,[switch]$Force,$Path) }
function Copy-Item { param($LiteralPath,$Path,$Destination,[switch]$Recurse,[switch]$Force)
  if ($Path -like '*\*') { throw 'unreviewed wildcard copy' }
  if ($LiteralPath -like '*COPY_TOKEN*') { throw 'prohibited token carrier copied' }
  $global:ACBTestCopied += $LiteralPath
}
function Get-Command { param($Name,$ErrorAction) [pscustomobject]@{Source='C:\fixture\pythonw.exe'} }
function Test-Path { param($LiteralPath,$Path) return $true }
function Get-Item { param($LiteralPath,$Path)
  $name = if ($LiteralPath) { $LiteralPath } else { $Path }
  if ($name -like '*.ps1') { return [IO.FileInfo]$name }
  $attributes = if ($Case -eq 'linked') { [IO.FileAttributes]::ReparsePoint } else { [IO.FileAttributes]::Directory }
  [pscustomobject]@{Attributes=$attributes}
}
function Get-ChildItem { param($LiteralPath,[switch]$Force)
  if ($Case -eq 'nested-link') { [pscustomobject]@{Attributes=[IO.FileAttributes]::ReparsePoint;PSIsContainer=$true;FullName='C:\fixture\linked'} }
}
function Get-ScheduledTask { param($TaskName,$ErrorAction)
  if ($Case -eq 'foreign-task') { [pscustomobject]@{Actions=@([pscustomobject]@{Arguments='"C:\foreign\script.py"'})} }
}
function New-ScheduledTaskAction { param($Execute,$Argument,$WorkingDirectory) [pscustomobject]@{Arguments=$Argument} }
function New-ScheduledTaskTrigger { param([switch]$AtLogon) @{} }
function New-ScheduledTaskSettingsSet { param([switch]$AllowStartIfOnBatteries,[switch]$DontStopIfGoingOnBatteries,[switch]$StartWhenAvailable,[switch]$DontStopOnIdleEnd,$RestartCount,$RestartInterval,$ExecutionTimeLimit) @{} }
function New-ScheduledTaskPrincipal { param($UserId,$LogonType) @{} }
function Register-ScheduledTask { param($TaskName,$Action,$Trigger,$Settings,$Principal,[switch]$Force) }
function Start-ScheduledTask { param($TaskName) }
function Stop-ScheduledTask { param($TaskName,$ErrorAction) }
function Unregister-ScheduledTask { param($TaskName,$Confirm) }
function Start-Sleep { param($Seconds) }
function Get-Content { param($LiteralPath,$Path,[switch]$Raw)
  $name = if ($LiteralPath) { $LiteralPath } else { $Path }
  if ($name -like '*config.json') {
    $base = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'ACBBridge\app\audits'
    if ($Case -eq 'audits-inside') { return (@{output=@{root=$base}} | ConvertTo-Json -Compress) }
    return '{"output":{"root":""}}'
  }
  if ($name -like '*bridge.pid') { return '12345' }
  if ($Subject -like '*install.ps1' -and $Subject -notlike '*uninstall.ps1') { throw 'installer read pairing credential' }
  'fixture-token-not-a-real-secret'
}
function Set-Clipboard { throw 'clipboard was touched' }
function Get-Process { param($Id,$ErrorAction) [pscustomobject]@{ProcessName='python'} }
function Stop-Process { throw 'unverified PID was killed' }
function Invoke-RestMethod { param($Uri,$Method,$Headers,$ErrorAction,$TimeoutSec)
  if ($Uri -like '*/health') {
    if (($Subject -like '*install.ps1' -and $Subject -notlike '*uninstall.ps1') -or $Case -eq 'live') { return @{ok=$true} }
    if ($Case -eq 'timeout') { throw [Net.WebException]::new('unknown liveness', [Net.WebExceptionStatus]::Timeout) }
    throw [Net.WebException]::new('fixture endpoint stopped', [Net.WebExceptionStatus]::ConnectFailure)
  }
  @{ok=$true}
}
function Remove-Item { param($LiteralPath,$Path,[switch]$Recurse,[switch]$Force,$ErrorAction)
  if (-not $LiteralPath) { throw 'removal must use an exact literal path' }
  $global:ACBTestRemoved += $LiteralPath
}
$caught = ''
try { & $Subject } catch { $caught = $_.Exception.Message }
@{error=$caught;removed=$global:ACBTestRemoved;copied=$global:ACBTestCopied} | ConvertTo-Json -Depth 4 -Compress
''', encoding='utf-8')
    env = {k:v for k,v in os.environ.items() if k.upper() != 'PSMODULEPATH'}
    result = subprocess.run([runtime, '-NoProfile', '-NonInteractive', '-File', str(harness),
                             str(root / 'scripts' / script), case], capture_output=True,
                            encoding='utf-8', errors='replace', env=env, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_install_never_reads_copies_or_prints_pairing_credential(tmp_path):
    result = lifecycle(tmp_path, 'install.ps1', 'stopped')
    assert not result['error'], result
    assert result['copied'] and not any('COPY_TOKEN' in p for p in result['copied'])


@pytest.mark.parametrize('script', ['install.ps1', 'uninstall.ps1'])
def test_foreign_task_is_preserved(tmp_path, script):
    result = lifecycle(tmp_path, script, 'foreign-task')
    assert 'another command' in result['error'] and not result['removed'], result


@pytest.mark.parametrize('case,reason', [('live','still responds'), ('timeout','unknown liveness'),
                                      ('linked','linked'), ('nested-link','containing links'),
                                      ('audits-inside','Audit output')])
def test_uninstall_refuses_uncertain_or_unsafe_targets(tmp_path, case, reason):
    result = lifecycle(tmp_path, 'uninstall.ps1', case)
    assert reason in result['error'] and not result['removed'], result


def test_uninstall_removes_only_literal_runtime_after_confirmed_stop(tmp_path):
    result = lifecycle(tmp_path, 'uninstall.ps1', 'stopped')
    assert not result['error'], result
    assert len(result['removed']) == 1 and result['removed'][0].endswith('ACBBridge\\app'), result


def test_stop_never_kills_stale_pid(tmp_path):
    result = lifecycle(tmp_path, 'stop.ps1', 'stopped')
    assert not result['error'], result
