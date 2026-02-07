import logging
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.database import SessionLocal
from app.db.models import QueryHistory

logger = logging.getLogger(__name__)

class SuggestionService:
    """Service for generating query suggestions and autocomplete based on history"""
    
    def get_autocomplete_suggestions(self, partial_query: str, workspace_id: Optional[uuid.UUID] = None, limit: int = 5) -> List[str]:
        """Get suggestions based on partial natural language query"""
        if not partial_query or len(partial_query) < 2:
            return []
            
        with SessionLocal() as db:
            # Search for historical queries that start with or contain the partial query
            # Prioritize queries that match at the beginning
            query = db.query(
                QueryHistory.natural_language_query,
                func.count(QueryHistory.id).label("freq")
            ).filter(
                QueryHistory.natural_language_query.ilike(f"%{partial_query}%")
            )
            
            # If workspace scoped, we can filter by data sources in that workspace
            # For now, let's keep it simple and globally relevant to user's history
            
            suggestions = query.group_by(
                QueryHistory.natural_language_query
            ).order_by(
                desc("freq")
            ).limit(limit).all()
            
            return [s[0] for s in suggestions]

    def get_popular_queries(self, data_source_id: Optional[uuid.UUID] = None, limit: int = 5) -> List[str]:
        """Get most frequent successful queries for a data source"""
        with SessionLocal() as db:
            query = db.query(
                QueryHistory.natural_language_query,
                func.count(QueryHistory.id).label("freq")
            )
            
            if data_source_id:
                query = query.filter(QueryHistory.data_source_id == data_source_id)
            
            results = query.group_by(
                QueryHistory.natural_language_query
            ).order_by(
                desc("freq")
            ).limit(limit).all()
            
            return [r[0] for r in results]

suggestion_service = SuggestionService()
