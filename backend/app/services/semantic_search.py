import logging
import uuid
from typing import List, Dict, Any, Optional
from app.services.embedding_service import embedding_service
from app.services.vector_stores import get_vector_store, SearchResult

logger = logging.getLogger(__name__)

class SemanticSearch:
    """Service for performing semantic search over schema embeddings"""
    
    def __init__(self):
        self.vector_store = get_vector_store()

    def search_relevant_schema(
        self, 
        question: str, 
        data_source_id: uuid.UUID, 
        top_k: int = 5
    ) -> List[SearchResult]:
        """Find the most relevant schema elements for a given question"""
        try:
            # 1. Vectorize the question
            query_vector = embedding_service.generate_embedding(question)
            
            # 2. Search in the vector store
            results = self.vector_store.search(
                query_vector=query_vector,
                top_k=top_k,
                filters={"data_source_id": str(data_source_id)}
            )
            
            return results
        except Exception as e:
            logger.error(f"Error performing semantic search: {str(e)}")
            return []

    def get_relevant_table_names(self, question: str, data_source_id: uuid.UUID, top_k: int = 10) -> List[str]:
        """Helper to get just the table names from relevant schema elements"""
        results = self.search_relevant_schema(question, data_source_id, top_k)
        
        # Extract table names from metadata
        table_names = []
        for res in results:
            if res.metadata.get("element_type") == "table":
                table_names.append(res.metadata.get("name"))
        
        # Deduplicate while preserving order (relevance)
        seen = set()
        return [x for x in table_names if not (x in seen or seen.add(x))]

semantic_search = SemanticSearch()
