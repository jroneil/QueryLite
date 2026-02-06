import uuid
import asyncio
import json
import logging
from typing import Optional, Any
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)

class BackgroundExecutor:
    """Service to manage asynchronous background query execution for large datasets"""
    
    def __init__(self):
        # Reuse the Redis client from cache_service to track job states
        self.redis = cache_service.redis_client

    async def create_job(self) -> str:
        """Initialize a new job record in Redis"""
        job_id = f"job_{uuid.uuid4()}"
        job_info = {
            "job_id": job_id,
            "status": "processing",
            "progress": 0,
            "result": None,
            "error": None
        }
        # Keep job metadata for 24 hours
        await self.redis.set(job_id, json.dumps(job_info), ex=86400)
        return job_id

    async def update_job(self, job_id: str, status: str, result: Any = None, error: str = None, progress: int = 0):
        """Update the status of an existing background job"""
        job_info = {
            "job_id": job_id,
            "status": status,
            "progress": progress,
            "result": result,
            "error": error
        }
        await self.redis.set(job_id, json.dumps(job_info), ex=86400)

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Retrieve current job status from Redis"""
        data = await self.redis.get(job_id)
        if data:
            return json.loads(data)
        return None

    def start_query_task(self, job_id: str, executor, sql: str, response_template: dict):
        """Spawns an asynchronous task to execute SQL in the background"""
        asyncio.create_task(self._execute_query_async(job_id, executor, sql, response_template))

    async def _execute_query_async(self, job_id: str, executor, sql: str, response_template: dict):
        """Internal task that performs SQL execution and updates job state"""
        try:
            logger.info(f"Starting background SQL execution for job: {job_id}")
            # Execute the query (this is synchronous but wrapped in the task)
            results, execution_time = executor.execute_query(sql)
            
            # Populate the response template
            response_template["results"] = results
            response_template["row_count"] = len(results)
            response_template["execution_time_ms"] = execution_time
            response_template["status"] = "completed"
            
            # Optional: Add chart recommendation to background results if needed
            # chart_rec = executor.recommend_chart_type(results)
            # response_template["chart_recommendation"] = chart_rec.dict()
            
            await self.update_job(job_id, "completed", result=response_template)
            logger.info(f"Background job {job_id} completed successfully.")
            
            executor.close()
        except Exception as e:
            logger.error(f"Background job {job_id} failed: {str(e)}")
            await self.update_job(job_id, "failed", error=str(e))
            if executor:
                executor.close()

# Singleton instance
background_executor = BackgroundExecutor()
