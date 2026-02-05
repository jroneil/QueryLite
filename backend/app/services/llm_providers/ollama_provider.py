import json
from typing import Any, List, Optional

import httpx

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
        table_names: List[str],
        conversation_history: Optional[List[dict]] = None
    ) -> SQLGenerationResult:
        full_prompt = f"{self.system_prompt}\n\n"
        
        if conversation_history:
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                full_prompt += f"{role.upper()}: {content}\n"

        user_prompt = f"""Database Schema:
{schema_info}

Available Tables: {', '.join(table_names)}

Question: {question}

Generate the SQL query:"""

        full_prompt += f"USER: {user_prompt}\nASSISTANT:"

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": full_prompt,
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

    def generate_insight(
        self,
        data_sample: List[dict[str, Any]],
        question: str,
        chart_type: str,
        explanation: Optional[str] = None
    ) -> str:
        """Generate a natural language narrative/insight from data results"""
        system_prompt = """You are a senior data analyst. Your task is to provide a concise (2-3 sentences max) 
executive summary of the provided data results. Focus on the key takeaway that answers the user's original question.
Use clear, professional language. Do not mention the raw data structure, just the insights."""

        user_prompt = f"""User Question: {question}
Query Explanation: {explanation or "N/A"}
Chart Type: {chart_type}
Data Sample (up to 10 rows):
{json.dumps(data_sample[:10], indent=2)}

Provide a concise insight:"""

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": f"{system_prompt}\n\n{user_prompt}",
                        "stream": False,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("response", "").strip()
        except Exception as e:
            return f"Failed to generate insight: {str(e)}"
