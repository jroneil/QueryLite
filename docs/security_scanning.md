# Security Scanning

QueryLite uses a dedicated scanning environment to verify the security stance of the codebase without interfering with application dependencies.

## 🔍 Scanned Paths
- **Backend**: `backend/` (Bandit, Semgrep)
- **Secrets**: Repository-wide (Gitleaks)

## 🛠️ Prerequisites
- **Python 3.10+**: Installed on your system.
- **PowerShell**: Required for running the provided scripts on Windows.
- **Docker** (Optional): Used as a fallback if `semgrep` cannot be installed locally or fails to run.

## 🚀 Setup Instructions

### Fast Path (Local Virtual Environment)
We use a dedicated virtual environment `.venv-scan` to isolate scanning tools like `bandit` and `semgrep`.

```powershell
# Create the isolated environment and install pinned tools
.\scripts\setup_scan_env.ps1
```

### Fallback Path (Docker)
**Semgrep does not support native Windows.** To ensure reliable scans, the `scan.ps1` script is configured to automatically detect this and run Semgrep via Docker.

If `semgrep` is missing from your local environment (which is expected on native Windows), the script will pull the `returntocorp/semgrep` image and execute the scan within a container, mounting your `backend/` directory as a volume.

## 🏃 How to Run
Run the one-command scanner:

```powershell
.\scripts\scan.ps1
```

This will:
1. Run **Bandit** for static analysis of Python code.
2. Run **Semgrep** for pattern-based vulnerability detection.
3. Attempt to run **Gitleaks** if available on your system path.
4. Output reports to `reports/` and generate a `scan_summary.md`.

## 📂 Reports
All tool outputs are written to the `reports/` directory:
- `bandit.json`: Python-specific security issues (SQL injection, unsafe imports).
- `semgrep.json`: High-level pattern matches (JWT issues, insecure configurations).
- `gitleaks.json`: Exposed secrets or credentials.
- `scan_summary.md`: Quick overview of the latest run.

## 🔧 Troubleshooting

### Semgrep Dependency Conflicts
If you encounter errors like `tomli` version conflicts or `semgrep` fails to start, ensure you are using the `.venv-scan` environment. If issues persist, the `scan.ps1` script will fall back to `docker run returntocorp/semgrep`.

### Pip Install Failures
If `setup_scan_env.ps1` fails behind a corporate proxy, try:
```powershell
pip install --proxy http://proxy.server:port -r .\tools\scan\requirements.txt
```

### Must-Fix vs Warnings
- **Must Fix**: Hard-coded credentials, SQL injection patterns (Severity: High), Plaintext JWT secrets.
- **Acceptable Warnings**: Low-severity configuration linting, experimental rules that require deep context.

## 🐧 Linux/macOS Notes
The scripts are provided for PowerShell, but the logic remains the same:
1. Create a venv: `python3 -m venv .venv-scan`
2. Install reqs: `./.venv-scan/bin/pip install -r tools/scan/requirements.txt`
3. Run tools: `./.venv-scan/bin/bandit ...`
