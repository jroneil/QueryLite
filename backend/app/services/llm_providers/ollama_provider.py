import json
import httpx
from typing import List
from app.config import get_settings
from app.models.schemas import SQLGenerationResult
from .base import LLMProvider

class OllamaProvider(LLMProvider):
    """Ollama implementation of LLM provider for local models"""
    
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url.rstrip('/')
        self.model = settings.ollama_model
        self.system_prompt = """You are a SQL expert. Your task is to convert natural language questions into PostgreSQL SELECT queries.

IMPORTANT RULES:
1. ONLY generate SELECT statements - never INSERT, UPDATE, DELETE, DROP, or any DDL
2. Always use proper table and column names from the provided schema
3. Use appropriate aggregations (COUNT, SUM, AVG, etc.) when needed
4. Include ORDER BY when results should be sorted
5. Limit results to 1000 rows maximum
6. Return your response as valid JSON with the following structure:
{
    "sql_query": "SELECT ...",
    "explanation": "Brief explanation of what the query does",
    "confidence": 0.95
}"""

    def generate_sql(
        self, 
        question: str, 
        schema_info: str, 
        table_names: List[str]
    ) -> SQLGenerationResult:
        user_prompt = f"""Database Schema:
{schema_info}

Available Tables: {', '.join(table_names)}

Question: {question}

Generate the SQL query:"""

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": f"{self.system_prompt}\n\n{user_prompt}",
                        "stream": False,
                        "format": "json"
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data.get("response", "")
            
            result = json.loads(content.strip())
            
            return SQLGenerationResult(
                sql_query=result.get("sql_query", ""),
                explanation=result.get("explanation", ""),
                confidence=result.get("confidence", 0.7) # Local models might not provide confidence
            )
            
        except Exception as e:
            return SQLGenerationResult(
                sql_query="",
                explanation=f"Ollama Error: {str(e)}",
                confidence=0.0
            )

    def is_configured(self) -> bool:
        # Check if Ollama service is reachable
        try:
            with httpx.Client(timeout=2.0) as client:
                response = client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    def get_provider_name(self) -> str:
        return "ollama"
