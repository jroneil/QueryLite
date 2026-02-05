"""
Pydantic Settings for application configuration
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


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
    enforce_read_only: bool = False
    rate_limit_per_minute: int = 60
    pool_size: int = 5
    pool_max_overflow: int = 10
    
    # Encryption
    encryption_key: str = "dev-encryption-key-32chars!!"
    
    # Notification Settings
    email_provider: str = "smtp"
    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "reports@querylite.ai"
    smtp_use_starttls: bool = False
    
    # Caching
    redis_host: str = "redis"
    redis_port: int = 6379
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
