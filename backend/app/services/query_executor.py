"""
Query execution service for running SQL against user databases
"""

import time
from typing import Any
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

from app.models.schemas import ChartRecommendation, SchemaInfo


class QueryExecutor:
    """Service for executing SQL queries and analyzing results"""
    
    def __init__(self, connection_string: str):
        """Initialize with a database connection string"""
        self.engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=1,
            max_overflow=0
        )
    
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
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            
            return True, "Connection successful", tables
        except SQLAlchemyError as e:
            return False, f"Connection failed: {str(e)}", []
        except Exception as e:
            return False, f"Unexpected error: {str(e)}", []
    
    def get_schema_info(self) -> str:
        """
        Get formatted schema information for LLM context.
        
        Returns:
            Formatted string with table and column information
        """
        try:
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            
            schema_parts = []
            for table in tables:
                columns = inspector.get_columns(table)
                col_info = []
                for col in columns:
                    col_str = f"  - {col['name']}: {col['type']}"
                    if col.get('nullable') is False:
                        col_str += " (NOT NULL)"
                    col_info.append(col_str)
                
                table_schema = f"Table: {table}\nColumns:\n" + "\n".join(col_info)
                schema_parts.append(table_schema)
            
            return "\n\n".join(schema_parts)
        except Exception as e:
            return f"Error getting schema: {str(e)}"
    
    def get_table_names(self) -> list[str]:
        """Get list of table names"""
        try:
            inspector = inspect(self.engine)
            return inspector.get_table_names()
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
        sql_upper = sql.strip().upper()
        if not sql_upper.startswith("SELECT"):
            raise ValueError("Only SELECT statements are allowed")
        
        # Check for dangerous patterns
        dangerous_patterns = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
        for pattern in dangerous_patterns:
            if pattern in sql_upper:
                raise ValueError(f"Dangerous SQL pattern detected: {pattern}")
        
        start_time = time.time()
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql))
                rows = result.fetchall()
                columns = result.keys()
                
                # Convert to list of dicts
                results = [dict(zip(columns, row)) for row in rows]
                
            execution_time = (time.time() - start_time) * 1000
            return results, execution_time
            
        except SQLAlchemyError as e:
            raise ValueError(f"Query execution error: {str(e)}")
    
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
        
        # Analyze column types from first few rows
        sample = results[:min(10, len(results))]
        
        # Detect numeric columns
        numeric_cols = []
        text_cols = []
        date_cols = []
        
        for col in columns:
            values = [row.get(col) for row in sample if row.get(col) is not None]
            if not values:
                continue
            
            first_val = values[0]
            
            if isinstance(first_val, (int, float)):
                numeric_cols.append(col)
            elif isinstance(first_val, str):
                # Check for date patterns
                if any(keyword in col.lower() for keyword in ['date', 'time', 'month', 'year', 'day']):
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
                if any(keyword in x_col.lower() for keyword in ['date', 'time', 'month', 'year', 'day', 'week']):
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
