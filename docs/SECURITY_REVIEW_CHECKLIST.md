# QueryLite Security Review Checklist

A manual security review checklist for vulnerabilities that automated scanners (Bandit, pip-audit, Safety, Gitleaks) may not catch.

**Last Updated**: 2026-02-04  
**Reviewer**: _______________  
**Date Reviewed**: _______________

---

## 🔐 Authentication & Authorization

### Backend (FastAPI)

- [ ] **JWT Token Validation**: Verify tokens are validated on every protected endpoint
  - File: `backend/app/routers/auth_deps.py`
  - Check: `get_current_user` dependency is used on all protected routes
  
- [ ] **Token Expiration**: Confirm access tokens have reasonable expiration (< 1 hour)
  - File: `backend/app/routers/auth.py`
  - Check: `ACCESS_TOKEN_EXPIRE_MINUTES` value

- [ ] **Password Hashing**: Verify passwords are hashed with bcrypt/argon2 (not MD5/SHA1)
  - File: `backend/app/routers/auth.py`
  - Check: Uses `pwd_context.hash()` and `pwd_context.verify()`

- [ ] **User ID from Token**: Ensure user ID comes from JWT token, not request body
  - Files: All routers in `backend/app/routers/`
  - Check: `current_user.id` is used, not `request.user_id`

- [ ] **Role-Based Access Control**: Verify workspace role checks before sensitive operations
  - File: `backend/app/routers/workspaces.py`
  - Check: Admin role required for member management

### Frontend (Next.js)

- [ ] **NextAuth Configuration**: Verify NEXTAUTH_SECRET is set and complex
  - File: `.env` and `frontend/querylite-fe/app/api/auth/[...nextauth]/route.ts`
  
- [ ] **Protected Routes**: Confirm middleware protects sensitive routes
  - File: `frontend/querylite-fe/middleware.ts` or `proxy.ts`
  - Check: All `/dashboard/*`, `/ask/*`, etc. routes are protected

- [ ] **Token Storage**: Verify tokens are stored in httpOnly cookies, not localStorage
  - Check: NextAuth default behavior, no custom localStorage token storage

---

## 💉 Injection Vulnerabilities

### SQL Injection

- [ ] **Parameterized Queries**: All SQL uses SQLAlchemy ORM or parameterized queries
  - Files: `backend/app/routers/*.py`, `backend/app/services/*.py`
  - Red flag: Any raw SQL with string concatenation (`f"SELECT * FROM {table}"`)

- [ ] **User Input in SQL**: Check that user input is never directly in SQL strings
  - File: `backend/app/services/query_executor.py`
  - Check: `text(sql)` is only used with validated/sanitized queries

- [ ] **LLM-Generated SQL Validation**: Verify generated SQL is validated before execution
  - File: `backend/app/routers/query.py`
  - Check: `statement.get_type() != "SELECT"` blocks non-SELECT statements

### Command Injection

- [ ] **No Shell Commands**: Verify no `os.system()`, `subprocess.call(shell=True)`, or `eval()`
  - Search: `grep -r "os.system\|subprocess\|eval(" backend/`
  - Should return minimal/no results

### Template Injection

- [ ] **No Jinja2 with User Input**: If using templates, user input is escaped
  - Check: No `Template(user_input).render()` patterns

---

## 🔓 Data Exposure

### API Response Filtering

- [ ] **No Password Leakage**: User responses exclude `hashed_password`
  - File: `backend/app/models/schemas.py`
  - Check: `UserResponse` schema excludes password field

- [ ] **Connection String Protection**: Encrypted connection strings never returned raw
  - File: `backend/app/routers/data_sources.py`
  - Check: `connection_string` is never in response, only `connection_string_encrypted`

- [ ] **Audit Log Filtering**: Sensitive data not logged in plain text
  - File: `backend/app/services/audit_service.py`
  - Check: SQL queries logged don't contain passwords or PII

### Environment Variables

- [ ] **No Secrets in Code**: Verify no hardcoded API keys, passwords, or secrets
  - Search: `grep -r "sk-\|password=\|secret=" backend/ frontend/`
  - Should only find references to env vars

- [ ] **Gitignore Check**: Verify `.env` files are gitignored
  - File: `.gitignore`
  - Check: Contains `.env`, `.env.local`, `.env.production`

---

## 🌐 Cross-Site Scripting (XSS)

### Frontend

- [ ] **React Auto-Escaping**: Verify no `dangerouslySetInnerHTML` with user data
  - Search: `grep -r "dangerouslySetInnerHTML" frontend/`
  - If found, verify content is sanitized with DOMPurify

- [ ] **URL Validation**: User-provided URLs are validated before rendering
  - Check: No `<a href={userInput}>` or `<img src={userInput}>` without validation

- [ ] **SQL Display Escaping**: Generated SQL displayed in UI is escaped
  - File: `frontend/querylite-fe/app/(dashboard)/ask/page.tsx`
  - Check: SQL is rendered in `<pre>` tag (auto-escaped by React)

---

## 🔄 Cross-Site Request Forgery (CSRF)

- [ ] **CORS Configuration**: Verify CORS origins are restricted
  - File: `backend/app/main.py`
  - Check: `allow_origins` is not `["*"]` in production

- [ ] **State Parameter in OAuth**: Verify OAuth flows use state parameter
  - File: `frontend/querylite-fe/app/api/auth/[...nextauth]/route.ts`
  - Check: NextAuth handles this by default

---

## 📦 Dependency Security

- [ ] **Lock File Present**: `package-lock.json` and `requirements.txt` are committed
  - Check: Both files exist and are up to date

- [ ] **Known Vulnerabilities Checked**: Run these commands and review output
  ```bash
  # Backend
  cd backend && pip-audit
  cd backend && safety check
  
  # Frontend
  cd frontend/querylite-fe && npm audit
  ```

- [ ] **Outdated Dependencies**: Check for critically outdated packages
  ```bash
  cd frontend/querylite-fe && npm outdated
  pip list --outdated
  ```

---

## 🔒 Encryption & Secrets

### At Rest

- [ ] **Connection String Encryption**: Database connection strings are encrypted
  - File: `backend/app/services/encryption.py`
  - Check: AES or Fernet encryption is used

- [ ] **Encryption Key Rotation**: Document how to rotate ENCRYPTION_KEY
  - Check: README or docs explain key rotation process

### In Transit

- [ ] **HTTPS in Production**: All production traffic uses HTTPS
  - Check: Deployment config forces HTTPS

- [ ] **Secure WebSocket**: If using WebSockets, verify WSS protocol
  - Check: No `ws://` URLs in production code

---

## 🛡️ Rate Limiting & DoS Protection

- [ ] **Rate Limiting on Auth**: Login/register endpoints have rate limits
  - File: `backend/app/routers/auth.py`
  - Check: Middleware or decorator limits requests per IP

- [ ] **Query Timeout**: Long-running queries are terminated
  - File: `backend/app/services/query_executor.py`
  - Check: `statement_timeout` is set (currently in code)

- [ ] **Result Size Limits**: Query results are paginated/limited
  - Check: Large result sets don't crash the server

---

## 🗄️ Database Security

- [ ] **Least Privilege**: Application DB user has minimal permissions
  - Check: DB user can't DROP tables, only SELECT/INSERT/UPDATE/DELETE

- [ ] **Connection Pooling**: Pool limits prevent connection exhaustion
  - File: `backend/app/services/query_executor.py`
  - Check: `pool_size` and `max_overflow` are set

- [ ] **No Default Credentials**: PostgreSQL doesn't use default password
  - File: `docker-compose.yml`
  - Check: `POSTGRES_PASSWORD` is from environment, not hardcoded

---

## 📝 Logging & Monitoring

- [ ] **No Sensitive Data in Logs**: Passwords, tokens, PII not logged
  - Check: Run app, review logs for sensitive data

- [ ] **Audit Trail**: Security-relevant actions are logged
  - File: `backend/app/services/audit_service.py`
  - Check: Login, query execution, data source creation are logged

- [ ] **Error Messages**: Detailed errors not exposed to users
  - Check: Production mode returns generic errors, not stack traces

---

## 🐳 Container Security

- [ ] **Non-Root User**: Containers run as non-root user
  - File: `backend/Dockerfile`, `frontend/Dockerfile`
  - Check: Contains `USER` directive

- [ ] **Minimal Base Images**: Using Alpine or slim images
  - Check: `FROM python:3.11-slim` or `node:20-alpine`

- [ ] **No Secrets in Images**: Secrets passed via environment, not COPY
  - Check: Dockerfile doesn't COPY `.env` files

---

## ✅ Review Summary

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ⬜ | |
| Authorization | ⬜ | |
| SQL Injection | ⬜ | |
| XSS | ⬜ | |
| CSRF | ⬜ | |
| Secrets Management | ⬜ | |
| Dependencies | ⬜ | |
| Rate Limiting | ⬜ | |
| Database | ⬜ | |
| Logging | ⬜ | |
| Containers | ⬜ | |

**Overall Assessment**: ⬜ Pass / ⬜ Fail / ⬜ Needs Remediation

---

## 🔗 Quick Commands Reference

```bash
# Run all security scans
cd backend
bandit -r app/ -c .bandit
pip-audit
safety check
ruff check .

# Check for secrets
gitleaks detect --source .

# Frontend audit
cd frontend/querylite-fe
npm audit

# Search for dangerous patterns
grep -rn "eval\|exec\|os.system" backend/
grep -rn "dangerouslySetInnerHTML" frontend/
grep -rn "password\|secret\|key" . --include="*.py" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".env"
```

---

## 📋 Post-Review Actions

1. [ ] Document all findings with severity (Critical/High/Medium/Low)
2. [ ] Create tickets for remediation
3. [ ] Schedule re-review after fixes
4. [ ] Update this checklist with any new patterns found
