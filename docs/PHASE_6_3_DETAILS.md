# Phase 6.3: Governance & Security Implementation Detail

This phase focused on enterprise-grade security, transparency, and data protection. QueryLite now supports granular Role-Based Access Control (RBAC), a professional audit logging interface, and automated PII redaction.

## 1. Role-Based Access Control (RBAC)
We implemented a hierarchical role system to manage permissions within workspaces.

*   **Roles Supported**:
    *   `Admin`: Full control over workspace, data sources, members, and webhooks.
    *   `Editor`: Can create/edit dashboards and saved queries, and query shared data sources.
    *   `Viewer`: Read-only access to dashboards and the ability to execute queries (based on backend policy).
*   **Enforcement**: 
    *   Backend: `RBACService` enforces minimum roles in all critical routes using SQLAlchemy filters and FastAPI exceptions.
    *   Frontend: UI elements (Provisioning buttons, Delete actions) are conditionally rendered based on the user's role in the active workspace.

## 2. Audit Logger Pro
The audit system was upgraded from basic event logging to a comprehensive telemetry engine.

*   **Telemetry tracking**:
    *   `Token Count`: Tracks AI consumption per query.
    *   `Response Time`: Monitors query performance (MS).
    *   `Details`: Captures raw SQL and NL questions for security auditing.
*   **Admin Dashboard**:
    *   Located at `/admin/audit`.
    *   Real-time activity feed with telemetry badges.
    *   Aggregate stats: Total tokens, average latency, and query volume.
    *   CSV Export: One-click export for compliance reporting.

## 3. PII Masking
Automated data protection now redacts sensitive information before it leaves the backend.

*   **Detection Patterns**:
    *   Emails (Partial masking: a***@domain.com)
    *   Phone Numbers, SSN, Credit Cards (Full redaction)
    *   Secrets (Sensitive keywords in column names like `password`, `secret` are automatically redacted).
*   **Settings**: 
    *   Administrators can toggle PII masking globally via the `/settings` portal.
    *   Configurable via `ENABLE_PII_MASKING` environment variable.

## Technical Components Added
- `app/services/rbac.py`: Permission logic and role weights.
- `app/services/pii_masker.py`: Regex-based redaction engine.
- `app/routers/audit.py`: Admin API for logs and stats.
- `app/(dashboard)/admin/audit/page.tsx`: Premium audit monitoring UI.
- `app/(dashboard)/settings/page.tsx`: Governance policy control center.
