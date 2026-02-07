"""
LLM Service for Natural Language to SQL translation
Supports multiple providers: OpenAI, Anthropic, and local via Ollama
"""

from typing import Any, List, Optional

import sqlparse

from app.config import get_settings
from app.models.schemas import SQLGenerationResult
from app.services.llm_providers import (
    AnthropicProvider,
    LLMProvider,
    OllamaProvider,
    OpenAIProvider,
)


class LLMService:
    """Service for LLM-based SQL generation using configurable providers"""
    
    def __init__(self):
        self._provider: Optional[LLMProvider] = None
        self._set_provider()
    
    def _set_provider(self):
        settings = get_settings()
        provider_name = settings.llm_provider.lower()
        
        if provider_name == "openai":
            self._provider = OpenAIProvider()
        elif provider_name == "anthropic":
            self._provider = AnthropicProvider()
        elif provider_name == "ollama":
            self._provider = OllamaProvider()
        else:
            # Fallback to OpenAI
            self._provider = OpenAIProvider()
    
    def generate_sql(
        self, 
        question: str, 
        schema_info: str,
        table_names: list[str],
        conversation_history: Optional[List[dict]] = None,
        db_type: str = "postgresql",
        data_source_id: Optional[Any] = None
    ) -> SQLGenerationResult:
        """
        Generate a SELECT query from natural language question.
        """
        if not self._provider:
            self._set_provider()
            
        # Phase 8.1: Semantic Context Filtering
        filtered_schema = schema_info
        filtered_tables = table_names
        
        if data_source_id:
            from app.services.semantic_search import semantic_search
            # Find top relevant tables
            relevant_tables = semantic_search.get_relevant_table_names(question, data_source_id, top_k=5)
            
            if relevant_tables:
                # Filter schema_info to only include relevant tables
                # Most schema_info strings are blocks separated by double newlines per table
                schema_blocks = schema_info.split("\n\n")
                filtered_blocks = []
                for block in schema_blocks:
                    # Check if the block mentions a relevant table (case-insensitive)
                    if any(f"Table: {t.lower()}" in block.lower() for t in relevant_tables):
                        filtered_blocks.append(block)
                
                if filtered_blocks:
                    filtered_schema = "\n\n".join(filtered_blocks)
                    filtered_tables = relevant_tables
                    print(f"Semantic search reduced schema from {len(schema_blocks)} to {len(filtered_blocks)} tables")

        return self._provider.generate_sql(question, filtered_schema, filtered_tables, conversation_history, db_type)
    
    def validate_sql(self, sql: str, db_type: str = "postgresql") -> tuple[bool, str]:
        """
        Validate query syntax and safety.
        """
        if not sql:
            return False, "Query is empty"
            
        if db_type == "mongodb":
            # Basic JSON validation for MQL
            try:
                import json
                json.loads(sql)
                return True, ""
            except Exception:
                return False, "Invalid MQL JSON"

        # Parse SQL
        parsed = sqlparse.parse(sql)
        if not parsed:
            return False, "Invalid SQL syntax"
            
        # Basic check for multiple statements
        if len(parsed) > 1:
            return False, "Multiple statements are not allowed"
            
        statement = parsed[0]
        
        # Ensure it's a SELECT statement
        if statement.get_type() != "SELECT":
            return False, "Only SELECT statements are allowed"
            
        return True, ""

    def refine_query(self, question: str, sql_error: str, schema_info: str) -> str:
        """
        Suggest a corrected natural language query or SQL based on an error.
        """
        if not self._provider:
            self._set_provider()
        return self._provider.refine_query(question, sql_error, schema_info)

    def generate_insight(
        self,
        data_sample: List[dict[str, Any]],
        question: str,
        chart_type: str,
        explanation: Optional[str] = None
    ) -> str:
        """
        Generate a natural language narrative/insight from data results.
        """
        if not self._provider:
            self._set_provider()
        return self._provider.generate_insight(data_sample, question, chart_type, explanation)

    def is_configured(self) -> bool:
        """Check if the current LLM provider is properly configured"""
        if not self._provider:
            self._set_provider()
        return self._provider.is_configured()


# Global instance
llm_service = LLMService()


def get_llm_service() -> LLMService:
    """Get LLM service instance"""
    return llm_service
