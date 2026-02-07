# Phase 10: Data Governance & Compliance

This phase adds enterprise-grade data governance, regulatory compliance tools, and granular access control.

---

## Features

### 10.1 Data Lineage Tracking

Track relationships between schema elements and downstream assets.

| Endpoint | Description |
|----------|-------------|
| `GET /api/lineage/{data_source_id}` | Returns graph of tables → queries → panels |
| `GET /api/lineage/{data_source_id}/impact/{table}` | Impact analysis for schema changes |

**Access:** Intelligence → Lineage

---

### 10.2 GDPR/CCPA Compliance

Automated "Right to be Forgotten" workflows with full audit trails.

| Endpoint | Description |
|----------|-------------|
| `POST /api/compliance/deletion-request` | Create deletion request |
| `GET /api/compliance/deletion-requests` | List all requests |
| `POST /api/compliance/deletion-requests/{id}/execute` | Execute deletion |

**Deletion Actions:**
- Deletes query history, saved queries, threads, reports, and alerts
- Anonymizes user account and audit log entries
- Logs all actions for compliance proof

**Access:** Admin → Compliance

---

### 10.3 Column-Level Permissions

Mask or hide sensitive columns based on user role.

| Endpoint | Description |
|----------|-------------|
| `GET /api/column-permissions/{data_source_id}` | List rules |
| `POST /api/column-permissions/{data_source_id}` | Create rule |
| `PUT /api/column-permissions/{id}/{perm_id}` | Update rule |
| `DELETE /api/column-permissions/{id}/{perm_id}` | Delete rule |

**Mask Strategies:**
| Strategy | Effect |
|----------|--------|
| `hide` | Column removed from results |
| `redact_partial` | Shows first 2 chars + `***` |
| `hash` | Shows `[HASH:xxxxxxxx]` |

**Example:**
```json
{
  "column_name": "email",
  "restricted_roles": ["viewer"],
  "mask_strategy": "redact_partial"
}
```

---

## Database Models Added

- `DataLineageEdge` - Tracks table/column → query/panel relationships
- `DeletionRequest` - GDPR request lifecycle (pending → completed)
- `ColumnPermission` - Per-column masking rules

---

## Files Created

**Backend:**
- `app/services/lineage_service.py` - SQL parsing and lineage extraction
- `app/services/gdpr_service.py` - Deletion workflow orchestration
- `app/routers/data_lineage.py` - Lineage API
- `app/routers/gdpr.py` - Compliance API
- `app/routers/column_permissions.py` - Column permissions CRUD

**Frontend:**
- `app/(dashboard)/intelligence/lineage/page.tsx` - Lineage visualization
- `app/(dashboard)/admin/compliance/page.tsx` - GDPR admin console
