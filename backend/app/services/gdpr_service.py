"""
GDPR Service - Orchestrate data deletion workflows for compliance

Handles Right to be Forgotten requests by:
1. Anonymizing user data in audit logs
2. Deleting personal data from queries, threads, and user records
3. Logging all actions for compliance proof
"""

import json
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import (
    User,
    DeletionRequest,
    AuditLog,
    QueryHistory,
    SavedQuery,
    ConversationThread,
    ThreadMessage,
    Comment,
    ScheduledReport,
    AlertRule,
)


class GDPRService:
    """Service for handling GDPR/CCPA compliance operations"""
    
    @staticmethod
    def create_deletion_request(
        db: Session,
        user_email: str,
        requested_by: User,
        notes: Optional[str] = None
    ) -> DeletionRequest:
        """Create a new deletion request for a user's data."""
        request = DeletionRequest(
            user_email=user_email,
            requested_by_id=requested_by.id,
            status="pending",
            notes=notes
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        return request
    
    @staticmethod
    def execute_deletion(
        db: Session,
        request_id: UUID,
        executor: User
    ) -> DeletionRequest:
        """
        Execute a deletion request by removing/anonymizing all user data.
        
        This operation:
        - Deletes query history
        - Deletes saved queries (cascades to comments, versions)
        - Deletes conversation threads
        - Deletes scheduled reports and alerts
        - Anonymizes audit logs (replaces email with "[DELETED]")
        - Optionally deletes the user account
        
        All actions are logged for compliance proof.
        """
        request = db.query(DeletionRequest).filter(DeletionRequest.id == request_id).first()
        if not request:
            raise ValueError(f"Deletion request {request_id} not found")
        
        if request.status == "completed":
            raise ValueError("Request has already been processed")
        
        request.status = "processing"
        db.commit()
        
        user_email = request.user_email
        actions_taken = []
        
        try:
            # Find the user by email
            user = db.query(User).filter(User.email == user_email).first()
            
            if user:
                # 1. Delete query history
                query_count = db.query(QueryHistory).filter(QueryHistory.user_id == user.id).count()
                db.query(QueryHistory).filter(QueryHistory.user_id == user.id).delete()
                actions_taken.append(f"Deleted {query_count} query history records")
                
                # 2. Delete saved queries (cascades to comments, versions, alerts, anomalies)
                saved_count = db.query(SavedQuery).filter(SavedQuery.user_id == user.id).count()
                db.query(SavedQuery).filter(SavedQuery.user_id == user.id).delete()
                actions_taken.append(f"Deleted {saved_count} saved queries")
                
                # 3. Delete conversation threads (cascades to messages)
                thread_count = db.query(ConversationThread).filter(ConversationThread.user_id == user.id).count()
                db.query(ConversationThread).filter(ConversationThread.user_id == user.id).delete()
                actions_taken.append(f"Deleted {thread_count} conversation threads")
                
                # 4. Delete scheduled reports
                report_count = db.query(ScheduledReport).filter(ScheduledReport.owner_id == user.id).count()
                db.query(ScheduledReport).filter(ScheduledReport.owner_id == user.id).delete()
                actions_taken.append(f"Deleted {report_count} scheduled reports")
                
                # 5. Delete alert rules
                alert_count = db.query(AlertRule).filter(AlertRule.owner_id == user.id).count()
                db.query(AlertRule).filter(AlertRule.owner_id == user.id).delete()
                actions_taken.append(f"Deleted {alert_count} alert rules")
                
                # 6. Anonymize user in audit logs (preserve logs for compliance, remove PII)
                audit_count = db.query(AuditLog).filter(AuditLog.user_id == user.id).count()
                # We can't easily anonymize with foreign key, so we update details instead
                for log in db.query(AuditLog).filter(AuditLog.user_id == user.id).all():
                    if log.details:
                        log.details = log.details.replace(user_email, "[ANONYMIZED]")
                actions_taken.append(f"Anonymized {audit_count} audit log entries")
                
                # 7. Anonymize the user account (keep record for FK integrity)
                user.email = f"deleted_{user.id}@anonymized.local"
                user.name = "[Deleted User]"
                user.hashed_password = None
                user.image = None
                actions_taken.append("Anonymized user account")
            else:
                actions_taken.append(f"No user found with email {user_email}")
            
            # Log the deletion for compliance
            audit_log = AuditLog(
                user_id=executor.id,
                action="gdpr_deletion_executed",
                details=json.dumps({
                    "request_id": str(request_id),
                    "target_email": user_email,
                    "actions": actions_taken
                })
            )
            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)
            
            # Update request status
            request.status = "completed"
            request.completed_at = datetime.now(timezone.utc)
            request.audit_log_id = audit_log.id
            db.commit()
            db.refresh(request)
            
        except Exception as e:
            request.status = "failed"
            request.notes = f"{request.notes or ''}\n\nError: {str(e)}"
            db.commit()
            raise
        
        return request
    
    @staticmethod
    def get_pending_requests(db: Session) -> list:
        """Get all pending deletion requests."""
        return db.query(DeletionRequest).filter(
            DeletionRequest.status == "pending"
        ).order_by(DeletionRequest.created_at.desc()).all()
    
    @staticmethod
    def get_all_requests(db: Session, limit: int = 50, offset: int = 0) -> list:
        """Get all deletion requests with pagination."""
        return db.query(DeletionRequest).order_by(
            DeletionRequest.created_at.desc()
        ).offset(offset).limit(limit).all()
