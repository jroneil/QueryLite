from abc import ABC, abstractmethod
from typing import List, Any, Optional, Dict
from pydantic import BaseModel

class SearchResult(BaseModel):
    id: str
    score: float
    metadata: Dict[str, Any]

class BaseVectorStore(ABC):
    """Abstract base class for all vector store implementations"""
    
    @abstractmethod
    def upsert(self, id: str, vector: List[float], metadata: Dict[str, Any]) -> None:
        """Add or update a vector in the store"""
        pass
    
    @abstractmethod
    def search(self, query_vector: List[float], top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[SearchResult]:
        """Search for similar vectors"""
        pass
    
    @abstractmethod
    def delete(self, id: str) -> None:
        """Remove a vector from the store"""
        pass
    
    @abstractmethod
    def delete_by_metadata(self, filters: Dict[str, Any]) -> None:
        """Remove vectors matching metadata filters"""
        pass
