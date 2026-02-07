## QueryLite – Enterprise-Grade AI Analytics (Open Source)

QueryLite is a **reference implementation** for building AI-assisted analytics systems
with security, auditability, and compliance as first-class concerns.

---

## What QueryLite Looks Like

### Natural Language → SQL → Dashboards
![Talk to your data](docs/images/querylite-ask.png)

### Proactive Intelligence & Anomaly Detection
![Monitoring anomalies](docs/images/querylite-intelligence.png)

### GDPR / CCPA Compliance Workflows
![Compliance workflows](docs/images/querylite-compliance.png)

## Consulting & Integration

QueryLite is an open-source reference implementation focused on exploring
governance, auditing, and safe analytics workflows.

It is intended as a learning and discussion artifact, built with the assistance
of AI, rather than a drop-in enterprise solution.

QueryLite is not offered as a hosted service.


> **Turn natural language into insights.** Connect your PostgreSQL database and ask questions in plain English—QueryLite generates the SQL, runs it, and visualizes the results automatically.

No SQL knowledge required. Just ask, and see your data come to life.

## 🛡️ Security Scanning
QueryLite includes automated security scanning (Bandit, Semgrep, Gitleaks) to ensure a baseline security posture.
- Run `.\scripts\setup_scan_env.ps1` to initialize tools.
- Run `.\scripts\scan.ps1` to execute a full scan.
- See [Security Scanning Documentation](docs/security_scanning.md) for details and troubleshooting.

## 🚀 Roadmap

### Phase 1: Core Foundation (Completed)
- **Authentication**: Secure login with NextAuth.js and OAuth providers.
- **Multi-Tenancy**: Private workspaces for users to manage their own data sources.
- **Query History**: Automatically track and re-run past queries.

### Phase 1b: Polishing the Core (Completed ✅)
- **Saved Queries**: Bookmark favorite insights for quick access. ✅
- **Export**: Export data to CSV. ✅
- **Initial Suggestions**: Basic natural language suggestions based on schema metadata. ✅

### Phase 2: Intelligence & Reliability (Completed)
- **Multi-LLM Support**: Seamlessly switch between OpenAI (GPT-4), Anthropic (Claude 3.5 Sonnet), and local models (LLama 3 via Ollama).
- **Schema Intelligence**: Automatic relationship detection (Foreign Keys) and semantic type inference for better SQL generation.
- **Reliability Suite**: Integrated query timeouts, rate limiting, and connection pooling for production readiness.
- **Confidence Engine**: Real-time confidence scoring with automatic refinement suggestions for low-confidence queries.
- **Custom Error Handling**: Graceful, user-friendly messaging for complex SQL errors and database timeouts.

### Phase 3: Team Collaboration & Automation (Completed ✅)
- **Audit Logging**: Comprehensive security audit trail for all queries and configuration changes.
- **Read-Only Enforcement**: Strict safety middleware to prevent non-SELECT statements.
- **Team Workspaces**: Secure collaboration environments for sharing data sources and insights.
- **RBAC (Role-Based Access Control)**: Granular permissions (Admin, Editor, Viewer).
- **Scheduled Reports**: Automated email delivery of data insights (CSV + HTML).
- **Team Discussion**: Comments and threads on saved queries for collaboration.
- **Webhooks**: Real-time outbound notifications for team activity (Slack/Discord).

### Phase 4: Advanced BI & Dashboards (Completed ✅)
- **Dashboard Builder**: Create customizable layouts to combine multiple charts.
- **Dynamic Panels**: Real-time data execution for every dashboard panel.
- **Auto-Viz Integration**: Deep integration with the visualization engine for instant insights.
- **Chart Pinning**: One-click workflow from "Saved Queries" to "Dashboards".

### Phase 5: Aesthetic Excellence & Executive Intelligence (Completed ✅)
- **System Telemetry**: Real-time status indicators and engine monitoring footers for an operational feel.
- **Robust Sizing**: Refined the visualization engine for pixel-perfect chart scaling and responsiveness.

### Phase 6.1: Deep Analytical Memory (Completed ✅)
- **Conversational Memory**: Multi-turn chat interface that remembers context across follow-up questions.
- **Thread Management**: Persistent conversation threads with search and history management.

### Phase 6.2: Core Platform Power (Completed ✅)
- **Universal Connectors**: Support for PostgreSQL, MySQL, and DuckDB (for local CSV/Excel/Parquet files).
- **NoSQL Support**: Native MongoDB integration with schema sampling and MQL (MongoDB Query Language) generation.
- **Query Versioning**: Time Machine for saved queries—track evolution and revert to previous logic.
- **Connector SDK**: Standardized `BaseConnector` interface for easy expansion to any data source.

### Phase 6.3: Governance & Security (Completed ✅)
- **RBAC (Role-Based Access Control)**: Granular permissions (Admin, Editor, Viewer).
- **PII Masking**: AI-powered detection and redaction of sensitive data in results.
- **Audit Logger Pro**: Dedicated administrative UI for monitoring security events and token usage.

### Phase 6.4: UI/UX Premium Polish (Completed ✅)
- **Global Dashboard Filters**: Top-level date range picker that applies across all panels.
- **Interactive Drill-Downs**: Native chart-clickable filtering for bi-directional exploration.
- **Executive Exports**: One-click professional PDF and PowerPoint report generation.
- **SQL Feedback Loop**: Community-driven AI refinement with thumbs up/down quality ratings.
- **Messenger Integrations**: Deliver scheduled reports directly to Slack and Microsoft Teams.
 
 ### Phase 7.1: Enterprise Readiness (Completed ✅)
- **BigQuery & Snowflake**: Native support for enterprise cloud warehouses with optimized introspection. ✅
- **Enterprise SSO (OIDC)**: Single Sign-On with Okta and Azure AD (Entra ID) support. ✅
- **Domain Discovery**: Zero-config SSO discovery based on user email domains. ✅
- **Result Caching**: Redis-backed query result caching for millisecond latency on recurring peaks. ✅
- **Background Jobs**: Asynchronous execution for long-running analytical pivots. ✅
- **Performance Telemetry**: Real-time cache and execution timing indicators. ✅

### Phase 7.2: Proactive Intelligence (Completed ✅)
- **Anomaly Detection**: AI-driven scanning for unexpected spikes or drops ✅
- **Smart Alerting**: Threshold-based triggers for Slack, Teams, and Email ✅
- **Insight Monitoring**: Centralized dashboard for data health and alerts ✅

### Phase 7.3: Predictive Insights (Completed ✅)
- **Trend Forecasting**: Predictive modeling and future projections for time-series data ✅
- **Data Discovery**: Automated "Smart Findings" feed to surface interesting data patterns ✅
- **Forecasting Overlays**: One-click predictive visualization in Ask and Dashboard views ✅
 
 ### Phase 8: AI Augmentation (Completed ✅)
- **Semantic Search**: Vector embeddings (pgvector) for schema filtering to improve LLM accuracy on massive databases. ✅
- **Query Suggestions**: Real-time natural language autocomplete based on successful query patterns. ✅
- **Self-Healing Queries**: Automated error correction; retries failed queries with LLM-suggested fixes. ✅

### Phase 9: White-Labeling & Multi-Tenancy (Completed ✅)
- **Multi-Tenancy**: Isolated workspaces for different teams or clients with RBAC. ✅
- **Custom Branding**: Per-workspace theming (colors, logos, dark mode). ✅
- **Organization Admin Console**: Centralized usage metrics and member management. ✅
- **Branded Reports**: Scheduled emails and webhooks customized with tenant branding. ✅

### Phase 10: Data Governance & Compliance (Completed ✅)
- **Data Lineage Tracking**: Visualize table→query→dashboard relationships with impact analysis for schema changes. ✅
- **GDPR/CCPA Compliance**: Automated "Right to be Forgotten" request workflows with full audit trails. ✅
- **Column-Level Permissions**: Granular masking (hide/redact/hash) of sensitive columns based on user role. ✅
- **Administrative Control**: Context-aware RBAC for governance and auditing tools in the Sidebar. ✅

### 🔮 Looking Ahead
We are continuously expanding QueryLite's capabilities. Planned enhancements include:
- **Production Hardening**: CI/CD, Helm Charts, and E2E testing.
- **Advanced Analytics**: Pivot tables, statistical analysis, and what-if scenarios.
- **Agentic Data Assistant**: Multi-step reasoning and proactive insight generation.
- **Federated Querying**: Join data across different databases (e.g., Postgres + Snowflake).

For a detailed vision of the next 7 phases, see our [Full Future Roadmap](docs/FUTURE_ROADMAP.md).

---

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), Tailwind CSS 4, shadcn/ui, Tremor
- **Backend**: Python FastAPI (Async)
- **Database Support**: PostgreSQL, MySQL, DuckDB, MongoDB, BigQuery, Snowflake
- **LLM**: Multi-provider support (OpenAI, Anthropic, Ollama)

## 📂 Multi-Database Architecture

QueryLite supports a wide range of analytical sources out of the box:

- **PostgreSQL**: Full schema analysis and relationship detection.
- **MySQL**: Standard SQL support via SQLAlchemy.
- **DuckDB**: Analyze local **CSV**, **Excel**, and **Parquet** files with zero setup.
- **MongoDB**: Infer schemas from document samples and generate MQL (JSON) queries automatically.
- **BigQuery**: Native support for Google Cloud warehouses using Service Account JSON credentials.
- **Snowflake**: Enterprise-grade connectivity with support for warehouses, roles, and schemas.

Interested in adding another database? See our [Connector Contribution Guide](docs/CONTRIBUTING_CONNECTORS.md).

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- OpenAI or Anthropic API key (optional, for NL-to-SQL feature)
- **Playbook**: See [Testing & Verification Playbook](docs/TEST_PLAYBOOK.md) for a full walkthrough.

### 2. Setup & Launch

```bash
# Clone and configure environment
cp .env.example .env

# Start all services
docker-compose up --build -d
```

### 3. Access & Login

- **App**: [http://localhost:3000](http://localhost:3000)
- **Demo Login**: Use the "Use Demo Account" button on the login page (or `admin@example.com` / `password`).
- **Admin**: [http://localhost:5050](http://localhost:5050) (pgAdmin - `admin@example.com` / `admin`)

---

## 🧪 Testing with Pagila (Sample Dataset)

QueryLite includes a dedicated **Pagila** instance to test intelligence right out of the box.

1.  **Add Data Source**: In the dashboard, click "Add Data Source".
2.  **Connect**: Use the internal connection string:
    `postgresql://postgres:password123@pagila_db:5432/pagila`
3.  **Run Tests**: Head to the "Query" page and try these:
    - *"Show monthly rental count trends"* (Tests area charts)
    - *"How many films are in each category?"* (Tests joins & bar charts)
    - *"Top 10 customers by total spend"* (Tests complex aggregations)

See the full [Pagila Test Plan](docs/TEST_PLAN_PAGILA.md) for more scenarios.

## 🔒 Security Audit & Scanning

QueryLite uses **Bandit** for automated security linting of the Python backend.

### Running a Security Scan

To run a security audit of the backend code:

```bash
cd backend
python -m bandit -r app
```

We have configured a `.bandit` file to manage false positives (like `assert` statements in tests or standard OAuth types). 

### Dependency Auditing (Vulnerabilities)

We use `pip-audit` to check for known vulnerabilities in our dependencies:

```bash
cd backend
python -m pip_audit
```

If vulnerabilities are found, update the versions in `requirements.txt` and run `pip install` again.

### Advanced Security Scanning (Safety)

For more comprehensive vulnerability analysis and automated fixing:

```bash
cd backend
python -m safety scan
```

Or to specifically check a requirements file:

```bash
python -m safety check -r requirements.txt
```

To automatically apply recommended security patches:

```bash
python -m safety scan --apply-fixes
```

### Secret Scanning (Gitleaks)

To ensure no sensitive information (API keys, passwords) is committed to the repository:

```bash
gitleaks detect --source .
```

### Code Quality & Linting (Ruff)

We use **Ruff** for extremely fast Python linting and code formatting:

```bash
cd backend
python -m ruff check .
```

To automatically fix safe issues (like unused imports or incorrectly ordered imports):

```bash
python -m ruff check . --fix
```


## Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend/querylite-fe
npm install
npm run dev
```

### Database

Ensure PostgreSQL is running and update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://querylite:querylite_secret@localhost:5432/querylite
```

## Features

- **Multi-Database Support**: Connect PostgreSQL, MySQL, MongoDB, **BigQuery**, and **Snowflake**.
- **Enterprise SSO**: Single Sign-On via OIDC (Okta, Azure AD) with email-based **auto-discovery**.
- **Analyze Local Files**: Upload CSV/Excel/Parquet files for instant DuckDB-powered analysis.
- **Natural Language Queries**: Ask questions like "Show monthly revenue trends" - now in SQL or MQL.
- **Dashboard Builder**: Create and customize multi-chart dashboards for real-time monitoring
- **Auto-Visualization**: Automatically selects Bar, Line, or Donut charts based on data structure
- **SQL Preview**: View the generated SQL before execution
- **Multi-LLM Support**: Switch between OpenAI (GPT-4), Anthropic (Claude), and local models (Ollama)
- **Schema Intelligence**: Enhanced NL-to-SQL performance with relationship awareness and type inference
- **Reliability Suite**: Production-ready with rate limiting, query timeouts, and connection pooling
- **Scheduled Reports**: Automated email delivery of data insights with CSV attachments
- **Team Collaboration**: Comment threads on saved queries for team-wide insights
- **Outbound Webhooks**: Real-time HTTP notifications for team activity (Slack/Discord ready)
- **Conversational Memory**: Multi-turn analytical sessions that remember context across follow-up questions
- **Toast Notifications**: Interactive UI with real-time feedback and keyboard shortcuts (Ctrl+Enter)
- **Proactive Intelligence**: Automated AI-driven anomaly detection with real-time dashboard indicators
- **Intelligence Center**: Centralized management for smart threshold-based alerts and data health insights
- **Predictive Forecasting**: One-click time-series projections and future trend analysis.
- **Smart Discovery**: AI-generated insight feed that automatically surfaces "Need to Know" data facts.
- **Data Lineage**: Visual graph of table/query/dashboard relationships with schema impact analysis.
- **GDPR Compliance**: Automated data deletion workflows for Right to be Forgotten requests.
- **Column Masking**: Role-based sensitive data protection (hide, redact, or hash columns).
- **Governance Console**: Context-aware RBAC hiding administrative tools from non-admin users.

## Environment Variables

For a detailed guide on setting up security and local environment variables, see [Local Setup Guide](docs/LOCAL_SETUP.md).

| Variable | Description | Default / Requirement |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection for app metadata | `postgresql://querylite:querylite_secret@localhost:5432/querylite` |
| `OPENAI_API_KEY` | OpenAI API key for NL-to-SQL | `your-openai-api-key-here` |
| `ENCRYPTION_KEY` | Key for encrypting connection strings | **Must be 32 characters** |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js tokens | Required for Auth |
| `NEXTAUTH_URL` | Base frontend URL for Auth callback | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Project Structure

```
QueryLite/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # App entry point
│   │   ├── config.py       # Settings
│   │   ├── db/             # Database models
│   │   ├── models/         # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/querylite-fe/   # Next.js frontend
│   ├── app/
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── components/     # UI components
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

## License

MIT
