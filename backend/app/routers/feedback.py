"""
Feedback Router - Quality tracking for AI-generated SQL
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog, User
from app.models.schemas import FeedbackSubmission
from app.routers.auth_deps import get_current_user

router = APIRouter(prefix="/query", tags=["Feedback"])

@router.post("/{audit_log_id}/feedback")
async def submit_query_feedback(
    audit_log_id: UUID,
    submission: FeedbackSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit quality feedback for a specific query event"""
    # Find the audit log entry
    log_entry = db.query(AuditLog).filter(
        AuditLog.id == audit_log_id,
        AuditLog.user_id == current_user.id
    ).first()
    
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query event not found or unauthorized"
        )
    
    # Update the feedback score
    log_entry.feedback_score = submission.score
    db.commit()
    
    return {"message": "Feedback recorded successfully", "score": submission.score}
