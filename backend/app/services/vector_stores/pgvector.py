from typing import List, Any, Optional, Dict
import uuid
from sqlalchemy import text
from app.db.database import SessionLocal
from app.db.models import SchemaEmbedding
from app.services.vector_stores.base import BaseVectorStore, SearchResult

class PgVectorStore(BaseVectorStore):
    """PostgreSQL implementation of vector store using pgvector"""
    
    def upsert(self, id: str, vector: List[float], metadata: Dict[str, Any]) -> None:
        """Add or update a vector in the store"""
        with SessionLocal() as session:
            # Check if exists
            obj_id = uuid.UUID(id) if isinstance(id, str) else id
            existing = session.query(SchemaEmbedding).filter(SchemaEmbedding.id == obj_id).first()
            
            if existing:
                existing.embedding = vector
                existing.metadata_json = metadata
                existing.data_source_id = metadata.get("data_source_id")
                existing.element_type = metadata.get("element_type", "table")
                existing.name = metadata.get("name", "")
            else:
                new_emb = SchemaEmbedding(
                    id=obj_id,
                    data_source_id=metadata.get("data_source_id"),
                    element_type=metadata.get("element_type", "table"),
                    name=metadata.get("name", ""),
                    embedding=vector,
                    metadata_json=metadata
                )
                session.add(new_emb)
            
            session.commit()

    def search(self, query_vector: List[float], top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[SearchResult]:
        """Search for similar vectors using cosine distance"""
        with SessionLocal() as session:
            query = session.query(
                SchemaEmbedding,
                SchemaEmbedding.embedding.cosine_distance(query_vector).label("distance")
            )
            
            if filters:
                if "data_source_id" in filters:
                    query = query.filter(SchemaEmbedding.data_source_id == filters["data_source_id"])
                if "element_type" in filters:
                    query = query.filter(SchemaEmbedding.element_type == filters["element_type"])
            
            results = query.order_by("distance").limit(top_k).all()
            
            return [
                SearchResult(
                    id=str(row.SchemaEmbedding.id),
                    score=1.0 - float(row.distance), # Convert distance to similarity score
                    metadata=row.SchemaEmbedding.metadata_json or {}
                )
                for row in results
            ]

    def delete(self, id: str) -> None:
        """Remove a vector from the store"""
        with SessionLocal() as session:
            obj_id = uuid.UUID(id) if isinstance(id, str) else id
            session.query(SchemaEmbedding).filter(SchemaEmbedding.id == obj_id).delete()
            session.commit()

    def delete_by_metadata(self, filters: Dict[str, Any]) -> None:
        """Remove vectors matching metadata filters"""
        with SessionLocal() as session:
            query = session.query(SchemaEmbedding)
            if "data_source_id" in filters:
                query = query.filter(SchemaEmbedding.data_source_id == filters["data_source_id"])
            if "element_type" in filters:
                query = query.filter(SchemaEmbedding.element_type == filters["element_type"])
            
            query.delete(synchronize_session=False)
            session.commit()
