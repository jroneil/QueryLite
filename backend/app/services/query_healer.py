import logging
from typing import Optional, Tuple
from app.services.llm_service import llm_service
from app.models.schemas import SQLGenerationResult

logger = logging.getLogger(__name__)

class QueryHealer:
    """Service for automatically fixing SQL errors using LLM intelligence"""
    
    def heal_query(
        self, 
        original_question: str, 
        erroneous_sql: str, 
        error_message: str, 
        schema_info: str,
        db_type: str = "postgresql"
    ) -> Tuple[str, str]:
        """
        Analyze an error and generated a corrected SQL query.
        Returns: (fixed_sql, explanation)
        """
        prompt = f"""
        The following SQL query was generated for the question: "{original_question}"
        
        Generated SQL:
        {erroneous_sql}
        
        Database Error:
        {error_message}
        
        Database Type: {db_type}
        
        Schema Context:
        {schema_info}
        
        Please fix the SQL query. Output ONLY the corrected SQL query inside triple backticks, followed by a brief explanation of why it failed and how you fixed it.
        """
        
        try:
            # We can use the refine_query method or a custom generation if needed
            # For simplicity and consistency, let's use the LLM provider directly or via llm_service
            
            # Since llm_service doesn't have a direct 'heal' yet, we can use the refinement endpoint
            # or add a new specialized method. Let's add it to the providers.
            
            # For now, let's use a generic prompt through the current provider
            response = llm_service._provider.generate_sql(
                question=f"FIX THIS SQL: {error_message}\nQuestion: {original_question}\nBroken SQL: {erroneous_sql}",
                schema_info=schema_info,
                table_names=[], # Not strictly needed if schema_info is full
                db_type=db_type
            )
            
            return response.sql_query, response.explanation
            
        except Exception as e:
            logger.error(f"Error in query healing: {str(e)}")
            return "", f"Could not heal query: {str(e)}"

query_healer = QueryHealer()
