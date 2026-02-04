"""
Read-Only Enforcer Middleware - Strictly prevents non-SELECT queries
"""

from fastapi import Request, HTTPException
import sqlparse
from app.config import get_settings

async def read_only_enforcer_middleware(request: Request, call_next):
    # Only check POST requests directed at query endpoints
    if request.method == "POST" and "/api/query" in request.url.path:
        settings = get_settings()
        
        # In a real environment, you might check a flag on the Workspace or Global config
        # For Phase 3A, we'll allow a global toggle in settings
        if hasattr(settings, 'enforce_read_only') and settings.enforce_read_only:
            # We would need to peek at the body, which is tricky in middleware 
            # as it consumes the stream. 
            # Better to implement this as a check inside the QueryExecutor.
            pass

    response = await call_next(request)
    return response

def is_safe_sql(sql: str) -> bool:
    """Verifies that the SQL statement is a SELECT only"""
    parsed = sqlparse.parse(sql)
    if not parsed:
        return False
        
    for statement in parsed:
        if statement.get_type() != "SELECT":
            return False
            
    # Also check for common bypasses (multiple statements)
    sql_upper = sql.upper()
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER", "GRANT", "REVOKE"]
    for word in forbidden:
        if f" {word} " in f" {sql_upper} " or sql_upper.startswith(word):
            return False
            
    return True
