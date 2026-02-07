# QueryLite Testing & Verification Playbook

This document provides a comprehensive procedure to verify that the QueryLite application is fully operational on a local machine. It covers core functionality, AI features, and procedures for validating enterprise connectors.

---

## 🛠️ 1. Prerequisites & Environment Setup

### 1.1 Local Dependencies
Ensure you have the following installed:
- **Docker & Docker Compose**
- **Node.js 18+** (for local frontend development)
- **Python 3.11+** (for local backend development)

### 1.2 Environment Configuration
1. Copy `.env.example` to `.env`.
2. Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set for AI features.
3. Ensure `ENCRYPTION_KEY` is generated (used for database credentials).

### 1.3 Clean Start (Total Rebuild)
To ensure the database and initialization scripts run correctly:
```bash
# Shutdown and remove volumes (Warning: This wipes local data)
docker-compose down -v

# Rebuild and launch
docker-compose up --build -d
```

---

## 🔍 2. Core Service Verification

Verify that all services are healthy:

| Service | Endpoint | Verification |
|---------|----------|--------------|
| **Backend API** | [http://localhost:8000/health](http://localhost:8000/health) | Should return `{"status": "healthy"}` |
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Should load login page |
| **pgAdmin** | [http://localhost:5050](http://localhost:5050) | Login with `admin@example.com` / `admin` |
| **MailHog** | [http://localhost:8025](http://localhost:8025) | View outgoing system emails |
| **Redis** | `docker exec querylite-redis redis-cli ping` | Should return `PONG` |

---

## 🧪 3. Core Functional Walkthrough

### 3.1 Authentication & Workspaces
1. **Login**: Navigate to `/login` and use the **Demo Account**.
2. **Personal Workspace**: Verify you are in your "Personal Workspace" by default.
3. **Workspace Management**:
   - Navigate to **Workspaces**.
   - Create a new workspace named `"Marketing Team"`.
   - **Verification**: Switch to the new workspace and ensure the active data sources list is empty (isolation check).

### 3.2 Setting Up Data Sources
1. Navigate to **Data Sources**.
2. **Add New**: Click "Add Data Source" and select **PostgreSQL**.
3. **Configuration**:
   - Name: `Analytics DB`
   - Connection String: `postgresql://postgres:password123@pagila_db:5432/pagila`
4. **Test & Save**: Click **"Test Connection"**, then **"Save"**.
5. **Verification**: After saving, wait 10 seconds and check backend logs; verify "Schema Embedding" started (Phase 8.1 Semantic Search prep).

### 3.3 Ask Page & Semantic Search
1. Navigate to **Ask**.
2. Select your new `Analytics DB`.
3. Start typing: `Show me...`
4. **Expected**: Autocomplete suggestions should appear based on global common queries.
5. Ask: `"Total revenue by film category"`.
6. **Expected**: A Donut or Bar chart should render.

### 3.4 Dashboards & Visualization
1. From a successful query result, click **"Save to Favorites"**.
2. Name it `"Category Revenue"`.
3. Navigate to **Dashboards**.
4. Create a new dashboard named `"Executive Overview"`.
5. **Add Panel**: Click "Add Panel" and select your saved `"Category Revenue"` query.
6. **Layout**: Drag and resize the panel. Click **"Save Layout"**.

### 3.5 Scheduled Reports & Email Verification
1. Navigate to **Scheduled Reports**.
2. Click **"Create Report"**.
3. Select your saved `"Category Revenue"` query.
4. Set Schedule: `Every Minute` (for testing: `* * * * *`).
5. Recipient: `test@example.com`.
6. **Verification**: 
   - Open **MailHog** at [http://localhost:8025](http://localhost:8025).
   - Wait 1 minute and verify an email arrives with the report data summary.

### 3.6 Audit Logs & Security
1. Navigate to **Audit Logs**.
2. **Verification**:
   - You should see `query_request` and `query_complete` events for your recent activity.
   - Click a log entry to see the JSON metadata (includes execution time, SQL, and user ID).
   - Verify the `workspace_id` is correctly attributed to either Personal or Marketing.

---

## 🧠 4. Advanced AI Feature Verification

### 4.1 AI Forecaster
1. Run a time-series query: `"Show daily rentals for May 2005"`.
2. Once the chart loads, click the **"Generate Forecast"** button.
3. **Expected**: A 7-period projection overlay appearing on the chart.

### 4.2 Self-Healing Queries
1. (Manual Trigger) Ask a query that might cause a minor ambiguity, e.g., `"Show address for actors"`.
2. **Expected**: If the first attempt fails (e.g. joining `actor` to `address` requires `customer` or `staff`), look for the **"Self-Healed"** banner indicating the AI corrected the join logic.

---

## 🏢 5. Enterprise Connector Testing (Cloud Services)

Cloud warehouses (BigQuery, Snowflake) cannot be fully "mocked" without real infrastructure. Use the following procedure to validate them:

### 5.1 BigQuery Procedure
1. Create a **Service Account** in Google Cloud Console.
2. Download the **JSON Key**.
3. In QueryLite **Data Sources**, select **BigQuery**.
4. Paste the JSON key content into the configuration field.
5. Click **"Test Connection"**.

### 5.2 Snowflake Procedure
1. Obtain your **Account Identifier** (e.g., `xy12345.us-east-1`).
2. Provide User, Password, Database, Schema, Warehouse, and Role.
3. Click **"Test Connection"**.

---

## 📁 6. Troubleshooting

- **Database not populating?** Ensure you ran `docker-compose down -v` to clear old volumes. Scripts in `pagila-init` only run on a fresh volume.
- **LLM errors?** Check `docker logs querylite-backend`. Verify your API key has sufficient quota.
- **Email not sending?** Ensure the `backend` environment variable `SMTP_HOST` is set to `mailhog`.

---
*Created by QueryLite AI Orchestrator - Phase 8.1 Build*
