# Contributing New Database Connectors

QueryLite is designed to be extensible. If you want to add support for a new database, follow this guide.

## Overview

Connectors are located in `backend/app/services/connectors/`. All connectors must implement the `BaseConnector` abstract class.

## Step 1: Implement the Connector

Create a new file in `backend/app/services/connectors/your_db.py`.

```python
from app.services.connectors.base import BaseConnector
from typing import Any, List, Tuple, Dict, Optional

class YourDbConnector(BaseConnector):
    def __init__(self, connection_string: str, settings: Any = None):
        # Initialize your client here
        pass

    def test_connection(self) -> Tuple[bool, str, List[str]]:
        # Return (success, message, table_names)
        pass

    def get_schema_info(self) -> str:
        # Return a string representation of the schema for LLM context
        pass

    def execute_query(self, query: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        # Execute query and return (results, time_ms)
        pass

    def get_table_names(self) -> List[str]:
        # Return list of table/collection names
        pass

    def close(self):
        # Clean up resources
        pass
```

## Step 2: Register the Connector

Update `backend/app/services/query_executor.py` to include your new connector in the factory logic:

```python
if ds_type == "your_db":
    self.connector = YourDbConnector(connection_string, settings)
```

## Step 3: Update LLM Prompts (Optional)

If your database uses a specific dialect or query language, update the LLM providers in `backend/app/services/llm_providers/`.

Modify the `generate_sql` method to handle your `db_type` and provide appropriate instructions to the LLM.

- **Relational**: `SqlConnector` (PostgreSQL, MySQL).
- **NoSQL**: `MongoConnector`.
- **Warehouses**: `BigQueryConnector`, `SnowflakeConnector`.
- **Local Files**: `DuckDBConnector`.

## Step 4: Update Frontend

1. Open `frontend/querylite-fe/app/(dashboard)/data-sources/page.tsx`.
2. Add your database to the "Select Engine" grid.
3. Add a specialized badge or icon for your database type.

## Testing Your Connector

1. Add a new data source of your type in the UI.
2. Verify "Sync Health" works (calls `test_connection`).
3. Try asking a question in the "Ask" page to verify LLM generation and execution.
4. Verify results render correctly in tables and charts.
