import logging
from typing import List, Optional
import openai
from app.config import get_settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating vector embeddings using OpenAI"""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = "text-embedding-3-small" # 1536 dimensions
        self.client = openai.OpenAI(api_key=self.api_key)

    def generate_embedding(self, text: str) -> List[float]:
        """Generate an embedding for a single text string"""
        try:
            response = self.client.embeddings.create(
                input=[text.replace("\n", " ")],
                model=self.model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text strings in batch"""
        if not texts:
            return []
            
        try:
            # Clean texts
            cleaned_texts = [t.replace("\n", " ") for t in texts]
            
            response = self.client.embeddings.create(
                input=cleaned_texts,
                model=self.model
            )
            
            # OpenAI returns them in order
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise

embedding_service = EmbeddingService()
