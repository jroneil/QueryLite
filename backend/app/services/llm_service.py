"""
LLM Service for Natural Language to SQL translation
Supports multiple providers: OpenAI, Anthropic, and local via Ollama
"""

import json
from typing import Optional, List
import sqlparse

from app.config import get_settings
from app.models.schemas import SQLGenerationResult
from app.services.llm_providers import OpenAIProvider, AnthropicProvider, OllamaProvider, LLMProvider


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
        table_names: list[str]
    ) -> SQLGenerationResult:
        """
        Generate a SELECT SQL query from natural language question.
        """
        if not self._provider:
            self._set_provider()
            
        return self._provider.generate_sql(question, schema_info, table_names)
    
    def validate_sql(self, sql: str) -> tuple[bool, str]:
        """
        Validate SQL syntax and safety.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not sql:
            return False, "Query is empty"
            
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
        # This could call the LLM again to suggest a fix
        # For now, we'll keep it simple or implement a quick LLM call
        return f"Query failed with: {sql_error}. Perhaps try specifying columns more clearly?"

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
