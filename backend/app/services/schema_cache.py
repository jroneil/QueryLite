import time
from typing import Dict, Optional, Any
from app.models.schema_models import CachedSchema
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SchemaCache:
    """Simple in-memory cache for database schemas"""
    
    def __init__(self):
        self._cache: Dict[str, CachedSchema] = {}
        
    def get(self, data_source_id: str) -> Optional[CachedSchema]:
        """Get cached schema if present and not expired"""
        cached = self._cache.get(data_source_id)
        if not cached:
            return None
            
        # Check expiration
        elapsed = (datetime.now() - cached.created_at).total_seconds()
        if elapsed > cached.ttl_seconds:
            logger.info(f"Schema cache expired for {data_source_id}")
            del self._cache[data_source_id]
            return None
            
        return cached
        
    def set(self, data_source_id: str, schema_data: Any, ttl: int = 3600):
        """Cache schema data"""
        self._cache[data_source_id] = CachedSchema(
            data_source_id=data_source_id,
            tables=schema_data,
            created_at=datetime.now(),
            ttl_seconds=ttl
        )

    def invalidate(self, data_source_id: str):
        """Invalidate cache for a data source"""
        if data_source_id in self._cache:
            del self._cache[data_source_id]

# Global instance
schema_cache = SchemaCache()
