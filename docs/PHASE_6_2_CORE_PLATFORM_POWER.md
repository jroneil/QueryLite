# Phase 6.2: Core Platform Power

This phase focuses on expanding QueryLite from a PostgreSQL-only tool into a universal analytical engine with enterprise-grade reliability features.

## High-Level Objectives

1.  **Universal Connectivity**: Support for multiple database engines (MySQL, MongoDB) and local file analysis (DuckDB).
2.  **Safety & Versioning**: Implementation of "Time Machine" for saved queries, allowing users to track and revert logic changes.
3.  **Extensibility**: Standardized connector interface `BaseConnector` to allow rapid integration of new data sources.

## Features Implemented

### 🔌 Expanded Connectors (6.2.3)
- **MySQL Support**: Native SQLAlchemy integration for MySQL databases.
- **MongoDB Support**: Multi-collection support with automatic schema inference via document sampling.
- **NL-to-MQL**: Dynamic prompt pivoting to generate MongoDB Query Language (JSON) instead of SQL when appropriate.

### 📁 Local File Analysis (6.2.1)
- **DuckDB Integration**: Instant querying of CSV, Excel, and Parquet files without database provisioning.
- **File Upload Foundry**: Drag-and-drop interface for local dataset synthesis.

### ⏳ Query Versioning (6.2.2)
- **Saved Query "Time Machine"**: Automatic snapshots of SQL and natural language logic on every update.
- **Versioning UI**: Timeline view with side-by-side comparison and one-click revert.

## Architecture

- **Connector Factory**: The `QueryExecutor` now acts as a factory, instantiating specialized connectors (`SqlConnector`, `MongoConnector`) based on the data source type.
- **Dialect-Aware LLM Service**: The LLM provider logic was updated to accept a `db_type` parameter, allowing it to tailor its system prompts for SQL (PostgreSQL/MySQL/DuckDB) or MQL (MongoDB).

## Developer Resources
- See `docs/CONTRIBUTING_CONNECTORS.md` for instructions on adding new database support.
