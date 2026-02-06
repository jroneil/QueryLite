# Phase 6.3: Governance & Security

This phase focuses on making QueryLite enterprise-ready by adding granular access control, comprehensive audit trails, and automated PII protection.

## Core Objectives

1.  **RBAC (Role-Based Access Control)**: Implement granular permissions for `admin`, `editor`, and `viewer` roles to control who can view data, manage connections, and create dashboards.
2.  **Audit Logger Pro**: A dedicated administrative interface to monitor all system activity, including SQL query generation, user actions, and LLM token usage.
3.  **PII Masking**: An automated security layer that detects and redacts sensitive information (emails, phone numbers, credit cards) from query results before they reach the user interface.

## Features & Implementation

### 🛡️ RBAC Enforcement (6.3.1)
- **Role Scoping**: Leveraged the existing `WorkspaceMember` model to enforce permissions across all API endpoints.
- **Permission Matrix**:
    - `viewer`: Read-only access to data and dashboards.
    - `editor`: Can create and modify queries and dashboards.
    - `admin`: Full control over data sources, workspace settings, and audit logs.

### 📜 Audit Logger Pro (6.3.2)
- **Admin Dashboard**: A new interface for workspace administrators to browse and filter security logs.
- **Reporting**: Export audit logs to CSV for compliance reporting.
- **Telemetry**: Tracking response times and token costs for every generated query.

### 🎭 PII Masking (6.3.3)
- **Hybrid Detection**: Fast rule-based masking for standard patterns (Email, SSN, Credit Cards).
- **Redaction Pipeline**: Post-processing query results to ensure data privacy without affecting analytical capabilities.

## Architecture

- **Middleware Enforcement**: RBAC is enforced at the router level using FastAPI dependency injection.
- **Redaction Layer**: Result sets are piped through a masking service after execution but before serialization.
- **Audit Interceptor**: Every success and failure in the query pipeline is captured by the `AuditLogger` service.
