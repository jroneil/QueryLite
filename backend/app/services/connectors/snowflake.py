import time
import logging
import snowflake.connector
from typing import Any, List, Tuple, Dict, Optional
from app.services.connectors.base import BaseConnector

logger = logging.getLogger(__name__)

class SnowflakeConnector(BaseConnector):
    """Connector for Snowflake Data Warehouse"""
    
    def __init__(self, account: str, user: str, password: str, warehouse: str, database: str, schema: str = "PUBLIC", role: Optional[str] = None):
        try:
            self.conn = snowflake.connector.connect(
                user=user,
                password=password,
                account=account,
                warehouse=warehouse,
                database=database,
                schema=schema,
                role=role
            )
            self.database = database
            self.schema = schema
        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {e}")
            raise ValueError(f"Snowflake connection error: {str(e)}")

    def test_connection(self) -> Tuple[bool, str, List[str]]:
        try:
            cursor = self.conn.cursor()
            cursor.execute(f"SHOW TABLES IN SCHEMA {self.database}.{self.schema}")
            tables = [row[1] for row in cursor.fetchall()]
            cursor.close()
            return True, "Successfully connected to Snowflake", tables
        except Exception as e:
            logger.error(f"Snowflake test connection failed: {e}")
            return False, str(e), []

    def get_table_names(self) -> List[str]:
        try:
            cursor = self.conn.cursor()
            cursor.execute(f"SHOW TABLES IN SCHEMA {self.database}.{self.schema}")
            tables = [row[1] for row in cursor.fetchall()]
            cursor.close()
            return tables
        except Exception as e:
            logger.error(f"Failed to list Snowflake tables: {e}")
            return []

    def get_schema_info(self) -> str:
        schema_text = []
        try:
            cursor = self.conn.cursor()
            query = f"""
                SELECT table_name, column_name, data_type
                FROM {self.database}.INFORMATION_SCHEMA.COLUMNS
                WHERE table_schema = '{self.schema.upper()}'
                ORDER BY table_name, ordinal_position
            """
            cursor.execute(query)
            results = cursor.fetchall()
            
            current_table = None
            for table_name, col_name, data_type in results:
                if table_name != current_table:
                    current_table = table_name
                    schema_text.append(f"\nTable: {current_table}")
                schema_text.append(f"  - {col_name} ({data_type})")
                
            cursor.close()
            return "\n".join(schema_text)
        except Exception as e:
            logger.error(f"Failed to fetch Snowflake schema: {e}")
            return f"Error fetching schema: {str(e)}"

    def execute_query(self, query: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        start_time = time.time()
        try:
            cursor = self.conn.cursor(snowflake.connector.DictCursor)
            # Snowflake doesn't have a direct timeout on execute, but we can try to use session params if needed
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            
            execution_time = (time.time() - start_time) * 1000
            return list(rows), execution_time
        except Exception as e:
            logger.error(f"Snowflake execution error: {e}")
            raise e

    def close(self):
        try:
            self.conn.close()
        except:
            pass
