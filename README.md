# QueryLite

> **Turn natural language into insights.** Connect your PostgreSQL database and ask questions in plain English—QueryLite generates the SQL, runs it, and visualizes the results automatically.

## What It Does

QueryLite is a Micro-SaaS MVP that bridges the gap between your data and actionable insights:

1. **Connect** — Securely link your PostgreSQL databases (connection strings are encrypted at rest)
2. **Ask** — Type questions like *"Show me monthly revenue trends"* or *"Top 10 customers by order count"*
3. **Visualize** — The AI generates a SQL query, executes it, and auto-selects the best chart (Bar, Line, or Donut) based on your data structure

No SQL knowledge required. Just ask, and see your data come to life.

## 🚀 Roadmap

### Phase 1: Core Foundation (Completed)
- **Authentication**: Secure login with NextAuth.js and OAuth providers.
- **Multi-Tenancy**: Private workspaces for users to manage their own data sources.
- **Query History**: Automatically track and re-run past queries.
- **Saved Queries**: Bookmark favorite insights for quick access.
- **Export**: Export data to CSV.

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

---

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), Tailwind CSS 4, shadcn/ui, Tremor
- **Backend**: Python FastAPI (Async)
- **Database**: PostgreSQL 17
- **LLM**: Multi-provider support (OpenAI, Anthropic, Ollama)

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- OpenAI or Anthropic API key (optional, for NL-to-SQL feature)

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

- **Data Sources Management**: Connect multiple PostgreSQL databases with encrypted connection strings
- **Natural Language Queries**: Ask questions like "Show monthly revenue trends" 
- **Dashboard Builder**: Create and customize multi-chart dashboards for real-time monitoring
- **Auto-Visualization**: Automatically selects Bar, Line, or Donut charts based on data structure
- **SQL Preview**: View the generated SQL before execution
- **Multi-LLM Support**: Switch between OpenAI (GPT-4), Anthropic (Claude), and local models (Ollama)
- **Schema Intelligence**: Enhanced NL-to-SQL performance with relationship awareness and type inference
- **Reliability Suite**: Production-ready with rate limiting, query timeouts, and connection pooling
- **Scheduled Reports**: Automated email delivery of data insights with CSV attachments
- **Team Collaboration**: Comment threads on saved queries for team-wide insights
- **Outbound Webhooks**: Real-time HTTP notifications for team activity (Slack/Discord ready)
- **Toast Notifications**: Interactive UI with real-time feedback and keyboard shortcuts (Ctrl+Enter)

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
