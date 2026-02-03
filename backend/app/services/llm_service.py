"""
LLM Service for Natural Language to SQL translation
Uses OpenAI GPT-4 (placeholder - replace API key to activate)
"""

import json
from typing import Optional
from openai import OpenAI

from app.config import get_settings
from app.models.schemas import SQLGenerationResult


class LLMService:
    """Service for LLM-based SQL generation"""
    
    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4"
    
    def generate_sql(
        self, 
        question: str, 
        schema_info: str,
        table_names: list[str]
    ) -> SQLGenerationResult:
        """
        Generate a SELECT SQL query from natural language question.
        
        Args:
            question: Natural language question from user
            schema_info: Database schema information as formatted string
            table_names: List of available table names
            
        Returns:
            SQLGenerationResult with generated SQL, explanation, and confidence
        """
        system_prompt = """You are a SQL expert. Your task is to convert natural language questions into PostgreSQL SELECT queries.

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

        user_prompt = f"""Database Schema:
{schema_info}

Available Tables: {', '.join(table_names)}

Question: {question}

Generate the SQL query:"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON response
            # Handle markdown code blocks if present
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
            # Return a fallback response on error
            return SQLGenerationResult(
                sql_query="",
                explanation=f"Error generating SQL: {str(e)}",
                confidence=0.0
            )
    
    def is_configured(self) -> bool:
        """Check if the LLM service is properly configured"""
        settings = get_settings()
        return (
            settings.openai_api_key != "your-openai-api-key-here" 
            and len(settings.openai_api_key) > 10
        )


# Global instance
llm_service = LLMService()


def get_llm_service() -> LLMService:
    """Get LLM service instance"""
    return llm_service
