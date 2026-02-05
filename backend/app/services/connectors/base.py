from abc import ABC, abstractmethod
from typing import Any, List, Tuple, Dict, Optional

class BaseConnector(ABC):
    """Abstract base class for all database connectors"""
    
    @abstractmethod
    def test_connection(self) -> Tuple[bool, str, List[str]]:
        """Test connection and return (success, message, table_names)"""
        pass
        
    @abstractmethod
    def get_schema_info(self) -> str:
        """Get formatted schema for LLM context"""
        pass
        
    @abstractmethod
    def execute_query(self, query: str, timeout: int) -> Tuple[List[Dict[str, Any]], float]:
        """Execute query and return (results, execution_time_ms)"""
        pass
        
    @abstractmethod
    def get_table_names(self) -> List[str]:
        """Get list of table/collection names"""
        pass
        
    @abstractmethod
    def close(self):
        """Clean up resources"""
        pass
