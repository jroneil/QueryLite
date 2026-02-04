# QueryLite Phase 3: Enterprise Features

## Overview
Phase 3 transforms QueryLite from a single-user tool into an enterprise-ready platform. This phase focuses on **Security & Compliance** and **Team Collaboration**.

## Phase 3A: Security & Collaboration (Implementation Target)

### 1. Security & Compliance
- **Audit Logging**: Every query execution and configuration change is logged with user context.
- **Read-Only Enforcement**: A safety middleware to strictly prevent any non-SELECT SQL statements from reaching the database.

### 2. Team Collaboration (Workspaces & RBAC)
- **Workspaces**: Primary container for data sources and queries.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full control over workspace, members, and data sources.
  - **Editor**: Can add data sources and run/save queries.
  - **Viewer**: Read-only access to saved queries and results.

---

## Technical Design

### Audit Logging
- **Service**: `backend/app/services/audit_logger.py`
- **Database**: `audit_logs` table (id, user_id, workspace_id, action, sql, timestamp).

### Workspaces
- **Models**: `Workspace` (many-to-many with Users via `WorkspaceMember`).
- **Authorization**: Custom FastAPI dependency `get_workspace_role` to check permissions on every request.

### Read-Only Enforcement
- **Middleware**: `backend/app/middleware/read_only_enforcer.py`.
- **Logic**: Uses `sqlparse` to verify statement type before execution.

---

## Implementation Tasks

### Backend
- [ ] Create Audit Log models and service.
- [ ] Implement Read-Only middleware.
- [ ] Create Workspace and RBAC models.
- [ ] Implement Workspace API endpoints.
- [ ] Refactor Data Source and Query endpoints to be workspace-scoped.

### Frontend
- [ ] Workspace management dashboard.
- [ ] Workspace switcher in navigation.
- [ ] Role-restricted UI elements (e.g., hidden "Add Data Source" for Viewers).
