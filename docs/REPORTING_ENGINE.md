# QueryLite Reporting & Visualization Engine

This document provides a deep dive into the backend logic that powers QueryLite's natural language to SQL translation and its automated visualization engine.

## 1. Natural Language to SQL (NL-to-SQL)

The core journey begins when a user asks a question in natural language.

### A. Context Extraction
Before the LLM can generate SQL, `QueryExecutor` prepares the necessary context:
- **Table Names**: A filtered list of relevant tables found in the database.
- **Schema Info**: Detailed metadata including columns, data types, and primary/foreign key relationships.
- **Service**: `backend/app/services/query_executor.py` -> `get_schema_info()`

### B. LLM Orchestration
QueryLite supports multiple providers (OpenAI, Anthropic, Ollama) through a provider-agnostic service layer.
- **System Prompting**: We use a specialized "SQL Expert" persona that enforces strict rules:
  - Only `SELECT` statements (read-only enforcement at the prompt level).
  - Maximum result limit (e.g., 1000 rows).
  - Output must be a structured JSON object containing the `sql_query`, a human-readable `explanation`, and a `confidence` score.
- **Service**: `backend/app/services/llm_service.py`
- **Providers**: `backend/app/services/llm_providers/openai_provider.py`

---

## 2. Automated Visualization Engine

Once the SQL is executed and raw data is returned, the `QueryExecutor` analyzes the result set to determine how it should be displayed.

### A. Data Analysis
The engine inspects the first few rows (the "sample") of the result set to categorize columns into three types:
1.  **Numeric Columns**: Integers or floats (metrics like revenue, count).
2.  **Date/Time Columns**: Columns with names containing keywords like 'date', 'year', 'month'.
3.  **Text/Categorical**: Everything else (names, categories, IDs).

### B. Recommendation Logic
The `recommend_chart_type` method in `QueryExecutor` follows a decision tree:

| Data Shape | Metric Detected | Recommended Chart |
| :--- | :--- | :--- |
| **2 Columns** | (Text, Numeric) | **Bar Chart** |
| **2 Columns** | (Date, Numeric) | **Area Chart** (for trends) |
| **Proportions** | (Sum of values ≈ 100%) | **Donut Chart** |
| **Multi-Column** | (> 2 columns) | **Line/Bar** (based on first column type) |
| **Complex/Fallback**| N/A | **Table View** |

### C. Frontend Handover
The backend sends a `ChartRecommendation` object to the frontend:
```json
{
  "chart_type": "bar",
  "x_column": "category_name",
  "y_column": "total_sales"
}
```
The React frontend then uses this to configure the **Tremor** chart components automatically.

---

## 3. Security & Reliability

### A. Syntax Validation
Before execution, SQL is parsed using the `sqlparse` library to ensure it is a valid `SELECT` statement and doesn't contain multiple queries (preventing SQL injection).

### B. Read-Only Enforcement
QueryLite enforces a strict read-only policy:
- **Pattern Matching**: Checks for keywords like `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, or `CREATE`.
- **Backend Enforcer**: `backend/app/middleware/read_only_enforcer.py` (optional middleware) and direct checks in `QueryExecutor.execute_query`.

### C. Timeout Management
To prevent runaway queries from crashing the system, a `statement_timeout` is set for every PostgreSQL connection (default is 30 seconds).

---

## Technical Files Reference
- **NL Logic**: `backend/app/services/llm_service.py`
- **Provier Logic**: `backend/app/services/llm_providers/`
- **Exec & Viz Engine**: `backend/app/services/query_executor.py`
- **Types/Models**: `backend/app/models/schemas.py`
