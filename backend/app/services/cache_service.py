import json
import hashlib
import logging
from typing import Optional, Any
import redis.asyncio as redis
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class RedisCacheService:
    """Service for handling Redis caching logic for analytical queries"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True
        )
        self.default_ttl = 3600  # 1 hour default cache

    def _generate_key(self, data_source_id: str, sql: str) -> str:
        """Generate a deterministic cache key based on data source and SQL"""
        # We hash the SQL to avoid extremely long keys in Redis
        sql_hash = hashlib.md5(sql.strip().encode()).hexdigest()
        return f"query_cache:{data_source_id}:{sql_hash}"

    async def get_query_result(self, data_source_id: str, sql: str) -> Optional[Any]:
        """Fetch cached query results if they exist"""
        key = self._generate_key(data_source_id, sql)
        try:
            cached_data = await self.redis_client.get(key)
            if cached_data:
                logger.info(f"Cache HIT for key: {key}")
                return json.loads(cached_data)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {str(e)}")
            return None

    async def set_query_result(self, data_source_id: str, sql: str, result: Any, ttl: Optional[int] = None):
        """Store query results in Redis with an expiration"""
        key = self._generate_key(data_source_id, sql)
        try:
            ttl = ttl or self.default_ttl
            await self.redis_client.set(
                key, 
                json.dumps(result), 
                ex=ttl
            )
            logger.info(f"Cached results for key: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Redis set error: {str(e)}")

# Singleton instance
cache_service = RedisCacheService()
