import json
from typing import Any, List, Optional

import anthropic

from app.config import get_settings
from app.models.schemas import SQLGenerationResult

from .base import LLMProvider


class AnthropicProvider(LLMProvider):
    """Anthropic implementation of LLM provider"""
    
    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-sonnet-20240620"
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
}

The confidence score should reflect:
- 1.0: Perfect match between question and schema
- 0.7-0.9: Good match with some assumptions
- 0.5-0.7: Partial match, query may need refinement
- Below 0.5: Unclear question or missing schema info"""

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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.1,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            content = response.content[0].text
            
            # Parse JSON response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            
            return SQLGenerationResult(
                sql_query=result.get("sql_query", ""),
                explanation=result.get("explanation", ""),
                confidence=result.get("confidence", 0.5)
            )
            
        except Exception as e:
            return SQLGenerationResult(
                sql_query="",
                explanation=f"Anthropic Error: {str(e)}",
                confidence=0.0
            )

    def is_configured(self) -> bool:
        settings = get_settings()
        return bool(settings.anthropic_api_key and len(settings.anthropic_api_key) > 10)

    def get_provider_name(self) -> str:
        return "anthropic"

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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            return response.content[0].text.strip()
        except Exception as e:
            return f"Failed to generate insight: {str(e)}"
