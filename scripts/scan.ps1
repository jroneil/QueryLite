# scan.ps1
# One-command security scanner for QueryLite

$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
$VenvPath = Join-Path $ProjectRoot ".venv-scan"
$ReportDir = Join-Path $ProjectRoot "reports"
$BackendDir = Join-Path $ProjectRoot "backend"

# Ensure reports directory exists
if (-not (Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir | Out-Null
}

Write-Host "`n[1/3] Bandit: Python SAS ... " -ForegroundColor Cyan
if (Test-Path "$VenvPath\Scripts\bandit.exe") {
    # Exclude venvs and tests to avoid noise and crashes on 3rd party code
    & "$VenvPath\Scripts\bandit.exe" -r $BackendDir -f json -o "$ReportDir\bandit.json" -x ".venv,venv,tests,__pycache__"
    Write-Host "Done. Report: reports/bandit.json" -ForegroundColor Green
}
else {
    Write-Host "Bandit skipped (Venv not initialized. Run .\scripts\setup_scan_env.ps1 first)" -ForegroundColor Yellow
}

Write-Host "`n[2/3] Semgrep: Context-aware Scanning ... " -ForegroundColor Cyan
$SemgrepPath = "$VenvPath\Scripts\semgrep.exe"

if (Test-Path $SemgrepPath) {
    try {
        & $SemgrepPath scan --config auto --json --output "$ReportDir\semgrep.json" $BackendDir
        Write-Host "Done. Report: reports/semgrep.json" -ForegroundColor Green
    }
    catch {
        Write-Host "Local Semgrep failed. Falling back to Docker..." -ForegroundColor Yellow
        $DockerFallback = $true
    }
}
else {
    Write-Host "Local Semgrep missing. Checking for Docker fallback..." -ForegroundColor Yellow
    $DockerFallback = $true
}

if ($DockerFallback) {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Running Semgrep via Docker (Project Root)..." -ForegroundColor Gray
        # Mount the project root instead of just backend to pick up .semgrepignore
        docker run --rm -v "${ProjectRoot}:/src" returntocorp/semgrep semgrep scan --config auto --json --output "/src/reports/semgrep.json" "/src/backend"
        Write-Host "Docker-based Semgrep completed. Report synced to reports/semgrep.json" -ForegroundColor Green
    }
    else {
        Write-Host "Docker not found. Skipping Semgrep fallback." -ForegroundColor Red
    }
}

Write-Host "`n[3/3] Gitleaks: Secret Scanning ... " -ForegroundColor Cyan
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
    gitleaks detect --source $ProjectRoot --report-path "$ReportDir\gitleaks.json"
    Write-Host "Done. Report: reports/gitleaks.json" -ForegroundColor Green
}
else {
    Write-Host "Gitleaks skipped (Not installed on PATH). Download from: https://github.com/gitleaks/gitleaks" -ForegroundColor Yellow
}

# Generate Summary
$SummaryPath = "$ReportDir\scan_summary.md"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$Summary = @"
# Security Scan Summary
**Date:** $Timestamp

## Results
- **Bandit:** $(if (Test-Path "$ReportDir\bandit.json") { "Generated" } else { "Skipped" })
- **Semgrep:** $(if (Test-Path "$ReportDir\semgrep.json") { "Generated" } else { "Skipped" })
- **Gitleaks:** $(if (Test-Path "$ReportDir\gitleaks.json") { "Generated" } else { "Skipped" })

Reports are available in the \`reports/\` directory.
"@

$Summary | Out-File $SummaryPath -Encoding utf8
Write-Host "`nScan complete. Summary written to reports/scan_summary.md" -ForegroundColor Cyan
