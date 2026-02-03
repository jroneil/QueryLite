"""
Pydantic Settings for application configuration
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://querylite:querylite_secret@localhost:5432/querylite"
    
    # OpenAI
    openai_api_key: str = "your-openai-api-key-here"
    
    # Encryption
    encryption_key: str = "dev-encryption-key-32chars!!"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
