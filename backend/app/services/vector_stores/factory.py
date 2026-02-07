from functools import lru_cache
from app.config import get_settings
from app.services.vector_stores.base import BaseVectorStore
from app.services.vector_stores.pgvector import PgVectorStore
from app.services.vector_stores.qdrant import QdrantVectorStore

@lru_cache()
def get_vector_store() -> BaseVectorStore:
    """Factory to get the configured vector store instance"""
    settings = get_settings()
    
    if settings.vector_store == "qdrant":
        return QdrantVectorStore(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key
        )
    
    # Default to pgvector
    return PgVectorStore()
