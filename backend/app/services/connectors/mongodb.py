import time
from typing import Any, List, Tuple, Dict, Optional
import json
from pymongo import MongoClient
from app.services.connectors.base import BaseConnector
from app.exceptions import ConnectionError, QueryTimeoutError

class MongoConnector(BaseConnector):
    """Connector for MongoDB databases"""
    
    def __init__(self, connection_string: str, settings: Any = None):
        try:
            self.client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
            # Fetch database name from connection string or default
            # format: mongodb://user:pass@host:port/db_name
            self.db = self.client.get_default_database()
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MongoDB: {str(e)}")

    def test_connection(self) -> Tuple[bool, str, List[str]]:
        try:
            self.client.admin.command('ping')
            collections = self.db.list_collection_names()
            return True, "Connection successful", collections
        except Exception as e:
            return False, f"Connection failed: {str(e)}", []

    def get_table_names(self) -> List[str]:
        return self.db.list_collection_names()

    def get_schema_info(self) -> str:
        """Infers schema by sampling documents from collections"""
        schema_parts = []
        collections = self.db.list_collection_names()
        
        for coll_name in collections:
            coll = self.db[coll_name]
            # Sample 5 documents to infer schema
            sample_docs = list(coll.find().limit(5))
            
            if not sample_docs:
                schema_parts.append(f"Collection: {coll_name}\nEmpty collection.")
                continue
                
            fields = {}
            for doc in sample_docs:
                for key, value in doc.items():
                    field_type = type(value).__name__
                    if key not in fields:
                        fields[key] = field_type
            
            field_lines = [f"  - {k}: {v}" for k, v in fields.items()]
            schema_parts.append(f"Collection: {coll_name}\nFields:\n" + "\n".join(field_lines))
            
        return "\n\n".join(schema_parts)

    def execute_query(self, query_str: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        """
        Executes a MongoDB query. 
        Expects query_str to be a JSON string representing a find() or aggregate() operation.
        Example: {"collection": "users", "filter": {"age": {"$gt": 20}}}
        """
        start_time = time.time()
        try:
            cmd = json.loads(query_str)
            coll_name = cmd.get("collection")
            if not coll_name:
                raise ValueError("No collection specified in query")
                
            coll = self.db[coll_name]
            filter_obj = cmd.get("filter", {})
            projection = cmd.get("projection", None)
            sort = cmd.get("sort", None)
            limit = cmd.get("limit", 100)
            
            cursor = coll.find(filter_obj, projection).limit(limit)
            if sort:
                cursor = cursor.sort(list(sort.items()))
                
            rows = []
            for doc in cursor:
                # Convert ObjectId to string for JSON serialization
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                rows.append(doc)
                
            execution_time = (time.time() - start_time) * 1000
            return rows, execution_time
        except Exception as e:
            raise Exception(f"MongoDB Query Error: {str(e)}")

    def close(self):
        self.client.close()
