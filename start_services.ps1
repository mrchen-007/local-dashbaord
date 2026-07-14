# Starts the local AI extraction service in a project-scoped Python environment.
[CmdletBinding()]
param(
  [int]$Port = 8000,
  [int]$StartupTimeoutSeconds = 120,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$venvPath = Join-Path $projectRoot '.venv'
$pythonExe = Join-Path $venvPath 'Scripts\python.exe'
$requirementsPath = Join-Path $projectRoot 'python\requirements.txt'
$serviceScript = Join-Path $projectRoot 'python\start_uie_service.py'
$healthUrl = "http://127.0.0.1:$Port/health"

function Stop-UieServiceJob {
  param($Job)
  if ($null -ne $Job) {
    Stop-Job -Job $Job -ErrorAction SilentlyContinue
    Remove-Job -Job $Job -Force -ErrorAction SilentlyContinue
  }
}

Write-Host 'Checking local AI service environment...' -ForegroundColor Cyan
if ($null -eq (Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'Python 3.9 or newer is required.'
}

if (-not (Test-Path $pythonExe)) {
  Write-Host 'Creating project virtual environment...' -ForegroundColor Yellow
  & python -m venv $venvPath
}

if (-not $SkipInstall) {
  Write-Host 'Installing Python dependencies into .venv...' -ForegroundColor Yellow
  & $pythonExe -m pip install --disable-pip-version-check -q -r $requirementsPath
}

Write-Host "Starting UIE service on port $Port..." -ForegroundColor Yellow
$uieJob = Start-Job -ScriptBlock {
  param($exe, $script, $servicePort)
  & $exe $script --port $servicePort
} -ArgumentList $pythonExe, $serviceScript, $Port

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
$health = $null
while ((Get-Date) -lt $deadline) {
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
    if (($health.status -eq 'ok') -and ($health.model_loaded -eq $true)) {
      break
    }
  } catch {
    # Service is still starting.
  }
  Start-Sleep -Seconds 2
}

if (($null -eq $health) -or ($health.status -ne 'ok') -or ($health.model_loaded -ne $true)) {
  $jobOutput = Receive-Job -Job $uieJob -Keep -ErrorAction SilentlyContinue | Out-String
  Stop-UieServiceJob -Job $uieJob
  throw "UIE service was not ready within $StartupTimeoutSeconds seconds. Output: $jobOutput"
}

Write-Host "UIE service is ready: $healthUrl" -ForegroundColor Green
Write-Host 'Run npm run tauri:dev in another terminal to start the desktop app.' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop the service started by this script.' -ForegroundColor Yellow

try {
  while ($true) {
    Start-Sleep -Seconds 1
    if ($uieJob.State -ne 'Running') {
      throw "UIE service stopped unexpectedly: $($uieJob.State)"
    }
  }
} finally {
  Stop-UieServiceJob -Job $uieJob
  Write-Host 'UIE service stopped.' -ForegroundColor Yellow
}
