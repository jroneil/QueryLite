import logging

from app.exceptions import QueryLiteException
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except QueryLiteException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "detail": None
            }
        )
    except Exception as exc:
        logger.exception("Unhandled exception occurred")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred",
                "detail": str(exc) if "dev" in str(request.url) else None
            }
        )
