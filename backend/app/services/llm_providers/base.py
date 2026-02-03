from abc import ABC, abstractmethod
from typing import List, Optional
from app.models.schemas import SQLGenerationResult

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    def generate_sql(
        self, 
        question: str, 
        schema_info: str, 
        table_names: List[str]
    ) -> SQLGenerationResult:
        """Generate SQL from natural language question"""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider is properly configured"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the name of the provider"""
        pass
