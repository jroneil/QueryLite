# QueryLite

> **Turn natural language into insights.** Connect your PostgreSQL database and ask questions in plain English—QueryLite generates the SQL, runs it, and visualizes the results automatically.

## What It Does

QueryLite is a Micro-SaaS MVP that bridges the gap between your data and actionable insights:

1. **Connect** — Securely link your PostgreSQL databases (connection strings are encrypted at rest)
2. **Ask** — Type questions like *"Show me monthly revenue trends"* or *"Top 10 customers by order count"*
3. **Visualize** — The AI generates a SQL query, executes it, and auto-selects the best chart (Bar, Line, or Donut) based on your data structure

No SQL knowledge required. Just ask, and see your data come to life.

## 🚀 Roadmap: Phase 1 (In Progress)

We are currently enhancing QueryLite with the following features:

- **Authentication**: Secure login with Google (OAuth) and Email/Password.
- **Multi-Tenancy**: Private workspaces for users to manage their own data sources.
- **Query History**: Automatically track and re-run past queries.
- **Saved Queries**: Bookmark your favorite insights for quick access.
- **Advanced Export**: Export data to CSV and share SQL queries easily.
- **Enhanced Visuals**: More chart types and customization options.

See the full [Phase 1 Plan](docs/phase_1_plan.md) for details.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Tremor
- **Backend**: Python FastAPI
- **Database**: PostgreSQL
- **LLM**: OpenAI GPT-4 (placeholder - configure API key to enable)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key (optional, for NL-to-SQL feature)

### Setup

1. **Clone and configure environment:**
   ```bash
   cd QueryLite
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

2. **Start all services with Docker:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

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
- **Auto-Visualization**: Automatically selects Bar, Line, or Donut charts based on data structure
- **SQL Preview**: View the generated SQL before execution

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection for app metadata | `postgresql://querylite:querylite_secret@localhost:5432/querylite` |
| `OPENAI_API_KEY` | OpenAI API key for NL-to-SQL | `your-openai-api-key-here` |
| `ENCRYPTION_KEY` | Key for encrypting connection strings | `dev-encryption-key-32chars!!` |
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
