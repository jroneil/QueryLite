import time
import json
import logging
from typing import Any, List, Tuple, Dict, Optional
from google.cloud import bigquery
from google.oauth2 import service_account
from app.services.connectors.base import BaseConnector

logger = logging.getLogger(__name__)

class BigQueryConnector(BaseConnector):
    """Connector for Google BigQuery using Service Account JSON credentials"""
    
    def __init__(self, credentials_json: str, project_id: Optional[str] = None):
        """
        credentials_json: Stringified JSON content of the service account key
        """
        try:
            self.creds_dict = json.loads(credentials_json)
            self.credentials = service_account.Credentials.from_service_account_info(self.creds_dict)
            self.project_id = project_id or self.creds_dict.get("project_id")
            self.client = bigquery.Client(credentials=self.credentials, project=self.project_id)
        except Exception as e:
            logger.error(f"Failed to initialize BigQuery client: {e}")
            raise ValueError(f"Invalid BigQuery credentials: {str(e)}")

    def test_connection(self) -> Tuple[bool, str, List[str]]:
        try:
            # Try to list datasets as a connectivity test
            datasets = list(self.client.list_datasets(max_results=5))
            dataset_names = [d.dataset_id for d in datasets]
            
            # For BigQuery, "tables" are often large, we might want to list top few across datasets
            # but for a simple test, listing datasets is enough to prove auth works
            return True, f"Connected to project: {self.project_id}", dataset_names
        except Exception as e:
            logger.error(f"BigQuery connection test failed: {e}")
            return False, str(e), []

    def get_table_names(self) -> List[str]:
        """Returns fully qualified table names: project.dataset.table"""
        tables = []
        try:
            datasets = self.client.list_datasets()
            for dataset in datasets:
                ds_id = dataset.dataset_id
                ds_tables = self.client.list_tables(ds_id)
                for table in ds_tables:
                    tables.append(f"{ds_id}.{table.table_id}")
            return tables
        except Exception as e:
            logger.error(f"Failed to list BigQuery tables: {e}")
            return []

    def get_schema_info(self) -> str:
        """Fetch schema info from INFORMATION_SCHEMA across all datasets"""
        schema_text = []
        try:
            datasets = self.client.list_datasets()
            for dataset in datasets:
                ds_id = dataset.dataset_id
                query = f"""
                    SELECT table_name, column_name, data_type
                    FROM `{self.project_id}.{ds_id}.INFORMATION_SCHEMA.COLUMNS`
                    ORDER BY table_name, ordinal_position
                """
                results = self.client.query(query).result()
                
                current_table = None
                for row in results:
                    if row.table_name != current_table:
                        current_table = row.table_name
                        schema_text.append(f"\nTable: {ds_id}.{current_table}")
                    schema_text.append(f"  - {row.column_name} ({row.data_type})")
                    
            return "\n".join(schema_text)
        except Exception as e:
            logger.error(f"Failed to fetch BigQuery schema: {e}")
            return f"Error fetching schema: {str(e)}"

    def execute_query(self, query: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        start_time = time.time()
        try:
            query_job = self.client.query(query)
            # Result set conversion
            results = query_job.result(timeout=timeout)
            
            rows = [dict(row.items()) for row in results]
            execution_time = (time.time() - start_time) * 1000
            
            return rows, execution_time
        except Exception as e:
            logger.error(f"BigQuery execution error: {e}")
            raise e

    def close(self):
        # BigQuery client doesn't require explicit close in most cases, but good practice
        pass
