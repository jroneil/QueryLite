# setup_scan_env.ps1
# Creates a dedicated virtual environment for security scanning tools

$VenvPath = Join-Path $PSScriptRoot "..\.venv-scan"
$ReqPath = Join-Path $PSScriptRoot "..\tools\scan\requirements.txt"

Write-Host "--- Initializing QueryLite Security Scan Environment ---" -ForegroundColor Cyan

if (-not (Test-Path $VenvPath)) {
    Write-Host "Creating virtual environment in $VenvPath..." -ForegroundColor Gray
    python -m venv $VenvPath
}

Write-Host "Installing pinned tools from $ReqPath..." -ForegroundColor Gray
& "$VenvPath\Scripts\python.exe" -m pip install --upgrade pip
& "$VenvPath\Scripts\python.exe" -m pip install -r $ReqPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nScan environment ready." -ForegroundColor Green
    Write-Host "Note: Bandit is installed locally." -ForegroundColor Gray
    Write-Host "Note: Semgrep is unsupported on native Windows and will run via Docker fallback in the scan script." -ForegroundColor Yellow
}
else {
    Write-Error "Failed to install scanning tools. See output for details."
}
