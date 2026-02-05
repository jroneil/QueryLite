import time
from typing import Any, List, Tuple, Dict, Optional
import sqlparse
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app.services.connectors.base import BaseConnector
from app.services.schema_analyzer import SchemaAnalyzer
from app.exceptions import ConnectionError, QueryTimeoutError, SQLSyntaxError

class SqlConnector(BaseConnector):
    """Connector for SQL-based databases (Postgres, MySQL, DuckDB)"""
    
    def __init__(self, connection_string: Optional[str] = None, ds_type: str = "postgresql", file_path: Optional[str] = None, settings: Any = None):
        self.ds_type = ds_type
        self.file_path = file_path
        
        if ds_type == "duckdb" and file_path:
            self.engine = create_engine("duckdb:///:memory:")
            self._register_local_file()
        elif connection_string:
            # Handle MySQL connection string conversion if needed
            # SQLAlchemy expects mysql+pymysql:// for MySQL
            if ds_type == "mysql" and not connection_string.startswith("mysql"):
                # This depends on how the user inputs it, but let's be safe
                if "://" in connection_string:
                    connection_string = "mysql+pymysql" + connection_string[connection_string.find("://"):]
            
            self.engine = create_engine(
                connection_string,
                pool_pre_ping=True,
                pool_size=getattr(settings, 'pool_size', 5),
                max_overflow=getattr(settings, 'pool_max_overflow', 10),
                connect_args={"connect_timeout": 10}
            )
        else:
            raise ConnectionError("No connection information provided")
            
        self.analyzer = SchemaAnalyzer(self.engine)
        
    def _register_local_file(self):
        if not self.file_path or self.ds_type != "duckdb":
            return
        ext = self.file_path.split('.')[-1].lower()
        with self.engine.connect() as conn:
            if ext == 'csv':
                conn.execute(text(f"CREATE VIEW data AS SELECT * FROM read_csv_auto('{self.file_path}')"))
            elif ext in ['xlsx', 'xls']:
                conn.execute(text(f"INSTALL spatial; LOAD spatial;"))
                conn.execute(text(f"CREATE VIEW data AS SELECT * FROM st_read('{self.file_path}')"))
            elif ext == 'parquet':
                conn.execute(text(f"CREATE VIEW data AS SELECT * FROM read_parquet('{self.file_path}')"))

    def test_connection(self) -> Tuple[bool, str, List[str]]:
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            tables = self.analyzer.inspector.get_table_names()
            return True, "Connection successful", tables
        except Exception as e:
            return False, f"Connection failed: {str(e)}", []

    def get_schema_info(self) -> str:
        return self.analyzer.get_formatted_schema_for_llm()

    def get_table_names(self) -> List[str]:
        try:
            return self.analyzer.inspector.get_table_names()
        except Exception:
            return []

    def execute_query(self, sql: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        parsed = sqlparse.parse(sql)
        if not parsed:
            raise SQLSyntaxError("Invalid SQL query")
            
        statement = parsed[0]
        if statement.get_type() != "SELECT":
            raise SQLSyntaxError("Only SELECT statements are allowed")
            
        start_time = time.time()
        try:
            with self.engine.connect() as conn:
                if self.ds_type == "postgresql":
                    conn.execute(text(f"SET statement_timeout = {timeout * 1000}"))
                elif self.ds_type == "mysql":
                    conn.execute(text(f"SET max_execution_time = {timeout * 1000}"))
                
                result = conn.execute(text(sql))
                rows = result.fetchall()
                columns = result.keys()
                results = [dict(zip(columns, row)) for row in rows]
                
            execution_time = (time.time() - start_time) * 1000
            return results, execution_time
        except OperationalError as e:
            if "timeout" in str(e).lower() or "exceeded" in str(e).lower():
                raise QueryTimeoutError(f"Query exceeded {timeout} seconds limit")
            raise ConnectionError(f"Database connection error: {str(e)}")
        except Exception as e:
            raise SQLSyntaxError(f"SQL Error: {str(e)}")

    def close(self):
        self.engine.dispose()
