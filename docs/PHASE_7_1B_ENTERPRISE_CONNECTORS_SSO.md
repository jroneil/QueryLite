# Phase 7.1B: Enterprise Readiness (Connectors & SSO)

This phase completes the enterprise footprint of QueryLite by supporting massive cloud warehouses and organizational authentication standards.

## Core Objectives

1.  **Warehouse Scale**: Enable native connectivity to BigQuery and Snowflake for high-scale analytical workloads.
2.  **Enterprise Identity**: Implement Single Sign-On (SSO) using OpenID Connect (OIDC) to integrate with corporate identity providers like Okta and Azure AD.
3.  **Frictionless Access**: Provide zero-config SSO discovery to simplify the login experience for enterprise users.

## Key Features

### ☁️ Cloud Warehouse Connectors
QueryLite now supports native connectors for the industry's leading analytical warehouses:

-   **BigQuery**:
    -   Authentication via Service Account JSON.
    -   Native schema introspection via `INFORMATION_SCHEMA`.
    -   Secure credential storage with encryption at rest.
-   **Snowflake**:
    -   Support for Account, Warehouse, Database, and Role configurations.
    -   Optimized analytical execution via `snowflake-connector-python`.
    -   Automatic schema mapping for predictive insights.

### 🔐 Enterprise SSO (OIDC)
Integrated organizational identity management at the workspace level:

-   **Generic OIDC Support**: Compatible with any provider following the OpenID Connect standard.
-   **Zero-Config Discovery**: Using the "Discovery" pattern, users simply enter their email address on the login page. QueryLite automatically identifies the organization's identity provider based on the domain and redirects them to their SSO portal.
-   **Workspace Isolation**: SSO configurations are scoped to specific workspaces, allowing multi-tenant organizations to manage their own identity rules.
-   **Secure Credential Management**: OIDC Client Secrets are stored encrypted and are never re-exposed via the UI.

## Technical Details

### Backend Architecture
-   **Connector SDK**: Implemented `BigQueryConnector` and `SnowflakeConnector` extending the `BaseConnector` pattern.
-   **SSO Router**: New `/api/sso` routes for managing OIDC configurations and `/api/sso/discover` for domain-based lookup.
-   **Dynamic Routing**: The `QueryExecutor` handles the switching between standard SQL, MQL (Mongo), and Warehouse-specific protocols based on the `DataSource` configuration.

### Frontend Integration
-   **Login discovery**: Added email blur listener to the login page to trigger SSO discovery.
-   **Admin Settings**: Expanded the Workspace Settings dialog to include a "Single Sign-On (OIDC)" section for administrative configuration.
-   **Branded Experience**: Added specific UI accents and icons for BigQuery (Orange) and Snowflake (Cyan) to differentiate them from standard relational sources.

## Data Security & Encryption
-   **At-Rest Encryption**: All enterprise credentials (BQ JSON, SF Passwords, OIDC Secrets) are encrypted using Fernet symmetric encryption prior to being persisted in the database.
-   **Least Privilege**: Recommended setup instructions encourage the use of read-only service accounts for analytical warehouses.
