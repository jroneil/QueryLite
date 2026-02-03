import time
from fastapi import Request
from app.exceptions import RateLimitExceededError
from app.config import get_settings
from collections import defaultdict
import threading

class RateLimiter:
    """Simple in-memory sliding window rate limiter"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
        
    def is_allowed(self, identity: str, limit: int, window: int = 60) -> bool:
        now = time.time()
        with self.lock:
            # Clear old requests
            self.requests[identity] = [t for t in self.requests[identity] if now - t < window]
            
            if len(self.requests[identity]) >= limit:
                return False
                
            self.requests[identity].append(now)
            return True

_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    settings = get_settings()
    
    # Identify user by IP or Auth token if available
    # For now, we'll use IP for simplicity in this MVP
    identity = request.client.host
    
    if not _limiter.is_allowed(identity, settings.rate_limit_per_minute):
        raise RateLimitExceededError(f"Rate limit of {settings.rate_limit_per_minute} requests per minute exceeded")
        
    return await call_next(request)
