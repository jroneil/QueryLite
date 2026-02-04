from fastapi import status


class QueryLiteException(Exception):
    """Base exception for QueryLite"""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class SQLSyntaxError(QueryLiteException):
    """Raised when SQL syntax is invalid"""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)

class QueryTimeoutError(QueryLiteException):
    """Raised when a query exceeds the timeout"""
    def __init__(self, message: str = "Query execution timed out"):
        super().__init__(message, status_code=status.HTTP_504_GATEWAY_TIMEOUT)

class RateLimitExceededError(QueryLiteException):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)

class ConnectionError(QueryLiteException):
    """Raised when database connection fails"""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

class LLMProviderError(QueryLiteException):
    """Raised when LLM provider fails"""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_502_BAD_GATEWAY)
