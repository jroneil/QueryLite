"""
Pydantic Settings for application configuration
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://querylite:querylite_secret@localhost:5432/querylite"
    
    # LLM Settings
    openai_api_key: str = "your-openai-api-key-here"
    llm_provider: str = "openai"  # openai | anthropic | ollama
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    confidence_threshold: float = 0.7

    # Performance & Error Handling
    query_timeout_seconds: int = 30
    rate_limit_per_minute: int = 60
    pool_size: int = 5
    pool_max_overflow: int = 10
    
    # Encryption
    encryption_key: str = "dev-encryption-key-32chars!!"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
