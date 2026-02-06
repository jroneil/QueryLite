"""
Audit Logging Service - Tracking security-relevant events
"""

import json
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import AuditLog


class AuditLogger:
    @staticmethod
    def log_event(
        db: Session,
        user_id: str,
        action: str,
        workspace_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        token_count: Optional[int] = None,
        response_time_ms: Optional[int] = None
    ):
        """Log a security-relevant event to the database"""
        try:
            details_str = json.dumps(details) if details else None
            audit_entry = AuditLog(
                user_id=user_id,
                workspace_id=workspace_id,
                action=action,
                details=details_str,
                ip_address=ip_address,
                token_count=token_count,
                response_time_ms=response_time_ms
            )
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
            return audit_entry
        except Exception as e:
            # We don't want to crash the request if logging fails, 
            # but in a production enterprise app, you might want to handle this more strictly.
            print(f"FAILED TO AUDIT LOG: {str(e)}")
            return None

    @staticmethod
    def log_query(
        db: Session,
        user_id: str,
        sql: str,
        workspace_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        token_count: Optional[int] = None,
        response_time_ms: Optional[int] = None
    ):
        """Specialized helper for logging query executions"""
        AuditLogger.log_event(
            db=db,
            user_id=user_id,
            action="query_execution",
            workspace_id=workspace_id,
            details={"sql": sql},
            ip_address=ip_address,
            token_count=token_count,
            response_time_ms=response_time_ms
        )
