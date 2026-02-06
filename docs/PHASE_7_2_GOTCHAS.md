# Phase 7.2 Implementation Summary & Lessons Learned

## 🚀 Phase 7.2: Proactive Intelligence Engine
This phase transformed QueryLite from a passive visualization tool into a proactive observability platform. The system now monitors data health in the background and notifies users of critical shifts without requiring manual query execution.

### Key Capabilities Delivered
1.  **AI Anomaly Detection**: 
    - **Backend Engine**: Implemented Z-score analysis in `services/anomaly_detector.py` to identify statistical outliers in time-series data.
    - **Automated Scanning**: The system now runs an hourly "Intelligence Protocol" that scans all saved queries for unacknowledged anomalies.
2.  **Smart Threshold Alerting**:
    - **Trigger System**: Users can define specific monitoring rules (e.g., "Yield > 95%" or "Revenue < 1000").
    - **In-Context Setup**: Added a "Set Smart Alert" modal directly in the "Ask" result view to bridge the gap between discovery and monitoring.
3.  **Intelligence Center UI**:
    - A dedicated dashboard at `/intelligence` for triaging detected insights and managing active monitoring rules.
    - Added "Pulsing Anomaly Badges" to primary dashboard panels to ensure critical data health issues are visible at a glance.

---

## ⚠️ Documentation of "Gotchas" & Lessons Learned
*These points are critical for future maintenance and scaling.*

### 1. Router Import Fragility (The "NameError" Bug)
- **Problem**: Adding new routers to `app/main.py` is a high-risk operation. A single accidental deletion of an import line crashes the entire backend, blocking the login flow and giving generic "Connection Refused" errors on the frontend.
- **Future Guard**: Always verify the `app.include_router(...)` block matches the `from app.routers import (...)` block exactly.
- **Reference**: See the [commit fixing the NameError in main.py](backend/app/main.py).

### 2. Next.js 16 Routing Conventions (Turbopack)
- **Problem**: Next.js 16 (specifically with the `(dashboard)` grouping) is highly sensitive to file naming conflicts. Having an `app/page.tsx` and an `app/(dashboard)/page.tsx` causes non-deterministic routing failure.
- **The "Proxy" Switch**: Next.js is deprecating `middleware.ts` in favor of `proxy.ts`. We encountered internal 500 errors until we aligned with the new file naming convention.
- **Future Guard**: Keep the `app/` root clean of legacy `page.tsx` files when using Route Groups.

### 3. Database Schema Sync (Volumes)
- **Problem**: Adding the `AlertRule` and `DataAnomalyAlert` models requires a table creation sync.
- **Resolution**: While `Base.metadata.create_all()` handles table creation on startup, it will **not** modify existing tables (add columns). 
- **Gotcha**: If a phase requires adding columns to *existing* tables (like `SavedQuery`), you must either use an Alembic migration or (in dev only) reset the db volumes. For 7.2, we used new tables to avoid volume resets.

### 4. Frontend Component Re-renders
- **Problem**: The `PanelCard` now performs background fetches for anomalies. 
- **Optimization**: Ensure `fetchAnomalies()` is only triggered when the `savedQueryId` changes or on explicit refresh to prevent unnecessary API load given the hourly scan cycle.

### 5. Authentication Context in Background Tasks
- **Lesson**: The hourly `scheduler_service` scan runs as a system process, not a user request. It must bypass RBAC checks or use a "System Service" token to read query data, while the UI must ensure users only see anomalies for queries they own.
