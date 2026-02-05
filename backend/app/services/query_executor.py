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


from app.services.connectors.sql import SqlConnector
from app.services.connectors.mongodb import MongoConnector
from app.services.connectors.base import BaseConnector

class QueryExecutor:
    """Service for executing queries across multiple database types"""
    
    def __init__(self, connection_string: Optional[str] = None, data_source_id: Optional[str] = None, 
                 ds_type: str = "postgresql", file_path: Optional[str] = None):
        settings = get_settings()
        self.data_source_id = data_source_id
        self.ds_type = ds_type
        self.timeout = settings.query_timeout_seconds
        
        # Factory: Choose appropriate connector
        if ds_type in ["postgresql", "mysql", "duckdb"]:
            self.connector: BaseConnector = SqlConnector(
                connection_string=connection_string,
                ds_type=ds_type,
                file_path=file_path,
                settings=settings
            )
        elif ds_type == "mongodb":
            if not connection_string:
                raise ConnectionError("MongoDB requires a connection string")
            self.connector: BaseConnector = MongoConnector(
                connection_string=connection_string,
                settings=settings
            )
        else:
            raise ValueError(f"Unsupported data source type: {ds_type}")

    def test_connection(self) -> tuple[bool, str, list[str]]:
        return self.connector.test_connection()
    
    def get_schema_info(self) -> str:
        return self.connector.get_schema_info()
    
    def get_table_names(self) -> list[str]:
        return self.connector.get_table_names()
    
    def execute_query(self, query: str) -> tuple[list[dict[str, Any]], float]:
        return self.connector.execute_query(query, self.timeout)
    
    def recommend_chart_type(self, results: list[dict[str, Any]]) -> ChartRecommendation:
        """Analyze query results and recommend the best chart type"""
        if not results:
            return ChartRecommendation(chart_type="table")
        
        columns = list(results[0].keys())
        if len(columns) < 2:
            return ChartRecommendation(chart_type="table")
        
        from datetime import date, datetime
        from decimal import Decimal

        sample = results[:min(10, len(results))]
        numeric_cols = []
        text_cols = []
        date_cols = []

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
                if any(keyword in col.lower() for keyword in ['date', 'time', 'month', 'year', 'day', 'ts']):
                    date_cols.append(col)
                else:
                    text_cols.append(col)
            else:
                text_cols.append(col)
        
        if len(columns) == 2:
            if len(numeric_cols) == 1 and len(text_cols) == 1:
                num_col = numeric_cols[0]
                total = sum(row.get(num_col, 0) for row in results if isinstance(row.get(num_col), (int, float)))
                if 0.99 <= total <= 1.01 or 99 <= total <= 101:
                    return ChartRecommendation(chart_type="donut", category_column=text_cols[0], value_column=num_col)
                x_col = text_cols[0]
                if any(keyword in x_col.lower() for keyword in ['date', 'time', 'month', 'year', 'day', 'week', 'ts', 'at']):
                    return ChartRecommendation(chart_type="area", x_column=x_col, y_column=num_col)
                return ChartRecommendation(chart_type="bar", x_column=text_cols[0], y_column=num_col)
            elif len(date_cols) == 1 and len(numeric_cols) == 1:
                return ChartRecommendation(chart_type="area", x_column=date_cols[0], y_column=numeric_cols[0])
        
        if numeric_cols and (text_cols or date_cols):
            x_col = date_cols[0] if date_cols else (text_cols[0] if text_cols else columns[0])
            return ChartRecommendation(chart_type="line" if date_cols else "bar", x_column=x_col, y_column=numeric_cols[0])
        
        return ChartRecommendation(chart_type="table")
    
    def close(self):
        self.connector.close()
