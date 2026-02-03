# Local Development Setup Guide

This guide provides detailed instructions on how to set up QueryLite for local development, specifically focusing on environment variables and security.

## 1. Environment Variables (.env)

QueryLite requires several environment variables to function correctly. You should create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

### Essential Configuration

| Variable | Description | Example / Recommendation |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for QueryLite's internal metadata database. | `postgresql://querylite:querylite_secret@localhost:5432/querylite` |
| `ENCRYPTION_KEY` | Key used to encrypt your data sources' connection strings. | **Must be exactly 32 characters.** |
| `NEXTAUTH_SECRET` | Used by NextAuth.js to encrypt session tokens. | Any random string. |
| `NEXTAUTH_URL` | The base URL of your frontend application. | `http://localhost:3000` |

### LLM Configurations

| Variable | Description |
| :--- | :--- |
| `LLM_PROVIDER` | Choose your preferred provider: `openai`, `anthropic`, or `ollama`. |
| `OPENAI_API_KEY` | Required if using OpenAI. |
| `ANTHROPIC_API_KEY` | Required if using Anthropic. |
| `OLLAMA_BASE_URL` | Required if using local models via Ollama (default: `http://localhost:11434`). |

### OAuth (Google login)

To enable Google login, you need to create a project in the [Google Cloud Console](https://console.cloud.google.com/) and add these:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Demo Account (Local Dev)
The application automatically seeds a demo account when the backend starts:
- **Email**: `admin@example.com`
- **Password**: `password`

You can use the **"Use Demo Account"** button on the login page to quickly fill these in.

---

## 2. Security Setup

### Fixing "Server Error (Configuration)"
If you see a grey screen with "Server Error" on the login page, it usually means `NEXTAUTH_SECRET` is missing. Ensure it is defined in your `.env`.

### Connection String Security
When adding a new data source in QueryLite, the connection string is encrypted before being stored. If you change your `ENCRYPTION_KEY`, you will lose access to previously saved data sources as they won't be decryptable.

---

## 3. Running the App

### With Docker (Recommended)
```bash
docker-compose up --build
```

### Without Docker
1. **Frontend**:
   ```bash
   cd frontend/querylite-fe
   npm install
   npm run dev
   ```
2. **Backend**:
   ```bash
   cd backend
   # Set up venv and install requirements
   uvicorn app.main:app --reload
   ```

## 4. Troubleshooting

- **Database Connection**: Ensure the PostgreSQL container is running and healthy. `docker-compose ps` should show `querylite-db` as Up.
- **API Connectivity**: If the frontend can't talk to the backend, check `NEXT_PUBLIC_API_URL` (usually `http://localhost:8000`).
