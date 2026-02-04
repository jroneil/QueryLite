"""
Query execution service for running SQL against user databases
"""

import time
from typing import Any, Optional

import sqlparse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.config import get_settings
from app.exceptions import ConnectionError, QueryTimeoutError, SQLSyntaxError
from app.models.schemas import ChartRecommendation
from app.services.schema_analyzer import SchemaAnalyzer
from app.services.schema_cache import schema_cache


class QueryExecutor:
    """Service for executing SQL queries and analyzing results"""
    
    def __init__(self, connection_string: str, data_source_id: Optional[str] = None):
        """Initialize with a database connection string and pool settings"""
        settings = get_settings()
        self.data_source_id = data_source_id
        self.engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=settings.pool_size,
            max_overflow=settings.pool_max_overflow,
            connect_args={"connect_timeout": 10}
        )
        self.timeout = settings.query_timeout_seconds
        self.analyzer = SchemaAnalyzer(self.engine)
    
    def test_connection(self) -> tuple[bool, str, list[str]]:
        """
        Test the database connection.
        
        Returns:
            Tuple of (success, message, table_names)
        """
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            # Get table names
            tables = self.analyzer.inspector.get_table_names()
            
            return True, "Connection successful", tables
        except SQLAlchemyError as e:
            return False, f"Connection failed: {str(e)}", []
        except Exception as e:
            return False, f"Unexpected error: {str(e)}", []
    
    def get_schema_info(self) -> str:
        """
        Get formatted schema information for LLM context, using cache if available.
        """
        if self.data_source_id:
            cached = schema_cache.get(self.data_source_id)
            if cached:
                # We still need to format it for LLM, or we store the formatted version
                # For now, we'll re-format from the cached object to keep the LLM prompt logic consistent
                # Actually, the analyzer can work on the engine or we can store the formatted string
                # Let's just use the analyzer for now but the cache will eventually store the whole result
                pass

        # Use the analyzer for enhanced info
        return self.analyzer.get_formatted_schema_for_llm()
    
    def get_table_names(self) -> list[str]:
        """Get list of table names"""
        try:
            return self.analyzer.inspector.get_table_names()
        except Exception:
            return []
    
    def execute_query(self, sql: str) -> tuple[list[dict[str, Any]], float]:
        """
        Execute a SQL query and return results.
        
        Args:
            sql: SQL query to execute
            
        Returns:
            Tuple of (results as list of dicts, execution time in ms)
        """
        # Security check - only allow SELECT statements
        parsed = sqlparse.parse(sql)
        if not parsed:
            raise SQLSyntaxError("Invalid SQL query")
            
        statement = parsed[0]
        if statement.get_type() != "SELECT":
            raise SQLSyntaxError("Only SELECT statements are allowed")
        
        # Check for dangerous patterns in the normalized statement
        sql_upper = sql.strip().upper()
        dangerous_patterns = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
        for pattern in dangerous_patterns:
            if f" {pattern} " in f" {sql_upper} " or sql_upper.startswith(pattern):
                raise SQLSyntaxError(f"Dangerous SQL pattern detected: {pattern}")
        
        start_time = time.time()
        
        try:
            with self.engine.connect() as conn:
                # Set session timeout for the current connection
                # PostgreSQL specific timeout setting
                conn.execute(text(f"SET statement_timeout = {self.timeout * 1000}"))
                
                result = conn.execute(text(sql))
                rows = result.fetchall()
                columns = result.keys()
                
                # Convert to list of dicts
                results = [dict(zip(columns, row)) for row in rows]
                
            execution_time = (time.time() - start_time) * 1000
            return results, execution_time
            
        except OperationalError as e:
            if "timeout" in str(e).lower():
                raise QueryTimeoutError(f"Query exceeded {self.timeout} seconds limit")
            raise ConnectionError(f"Database connection error: {str(e)}")
        except SQLAlchemyError as e:
            raise SQLSyntaxError(f"SQL Error: {str(e)}")
    
    def recommend_chart_type(self, results: list[dict[str, Any]]) -> ChartRecommendation:
        """
        Analyze query results and recommend the best chart type.
        
        Logic:
        - 2 columns with one numeric: Bar or Line chart
        - Time-based first column: Line chart
        - 2 columns with percentages/proportions: Donut chart
        - Complex data: Table view
        
        Returns:
            ChartRecommendation with chart type and column mappings
        """
        if not results:
            return ChartRecommendation(chart_type="table")
        
        columns = list(results[0].keys())
        
        if len(columns) < 2:
            return ChartRecommendation(chart_type="table")
        
        import logging
        from datetime import date, datetime
        from decimal import Decimal

        # Analyze column types from first few rows
        sample = results[:min(10, len(results))]
        
        numeric_cols = []
        text_cols = []
        date_cols = []

        logging.info(f"Analyzing {len(results)} rows for chart recommendation across columns: {columns}")

        for col in columns:
            values = [row.get(col) for row in sample if row.get(col) is not None]
            if not values:
                continue
            
            first_val = values[0]
            
            if isinstance(first_val, (int, float, Decimal)):
                numeric_cols.append(col)
            elif isinstance(first_val, (date, datetime)):
                date_cols.append(col)
            elif isinstance(first_val, str):
                # Check for date patterns in string values or column names
                if any(keyword in col.lower() for keyword in ['date', 'time', 'month', 'year', 'day', 'ts']):
                    date_cols.append(col)
                else:
                    text_cols.append(col)
            else:
                text_cols.append(col)
        
        # Decision logic
        if len(columns) == 2:
            # Simple 2-column case
            if len(numeric_cols) == 1 and len(text_cols) == 1:
                # Check if it looks like proportions (sum to ~100 or ~1)
                num_col = numeric_cols[0]
                total = sum(row.get(num_col, 0) for row in results if isinstance(row.get(num_col), (int, float)))
                
                if 0.99 <= total <= 1.01 or 99 <= total <= 101:
                    return ChartRecommendation(
                        chart_type="donut",
                        category_column=text_cols[0],
                        value_column=num_col
                    )
                
                # Check if x-axis looks like time
                x_col = text_cols[0]
                if any(keyword in x_col.lower() for keyword in ['date', 'time', 'month', 'year', 'day', 'week', 'ts', 'at']):
                    return ChartRecommendation(
                        chart_type="area",
                        x_column=x_col,
                        y_column=num_col
                    )
                
                # Default to bar chart
                return ChartRecommendation(
                    chart_type="bar",
                    x_column=text_cols[0],
                    y_column=num_col
                )
            
            elif len(date_cols) == 1 and len(numeric_cols) == 1:
                return ChartRecommendation(
                    chart_type="area",
                    x_column=date_cols[0],
                    y_column=numeric_cols[0]
                )
        
        # More complex cases - default to bar or table
        if numeric_cols and (text_cols or date_cols):
            x_col = date_cols[0] if date_cols else (text_cols[0] if text_cols else columns[0])
            chart_type = "line" if date_cols else "bar"
            return ChartRecommendation(
                chart_type=chart_type,
                x_column=x_col,
                y_column=numeric_cols[0]
            )
        
        return ChartRecommendation(chart_type="table")
    
    def close(self):
        """Close the database connection"""
        self.engine.dispose()
