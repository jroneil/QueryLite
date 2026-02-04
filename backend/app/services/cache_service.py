"""
Cache Service - Redis wrapper for query result and session caching
"""

import json
from typing import Any, Optional

import redis

from app.config import get_settings


class CacheService:
    """Service for managing Redis caching"""
    
    def __init__(self):
        settings = get_settings()
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=0,
            decode_responses=True
        )
        self.default_ttl = 3600 # 1 hour
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve data from cache"""
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store data in cache"""
        from fastapi.encoders import jsonable_encoder
        try:
            self.redis_client.set(
                key,
                json.dumps(jsonable_encoder(value)),
                ex=ttl or self.default_ttl
            )
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str):
        """Remove a specific key from cache"""
        try:
            self.redis_client.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")

    def invalidate_pattern(self, pattern: str):
        """Invalidate keys matching a pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            print(f"Cache invalidate error: {e}")

# Global singleton instance
cache_service = CacheService()
