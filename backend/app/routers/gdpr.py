"""
GDPR/CCPA Compliance Router - APIs for data deletion requests
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, DeletionRequest, WorkspaceMember
from app.routers.auth_deps import get_current_user
from app.services.gdpr_service import GDPRService


router = APIRouter(prefix="/compliance", tags=["GDPR/CCPA Compliance"])


class DeletionRequestCreate(BaseModel):
    user_email: EmailStr
    notes: Optional[str] = None


class DeletionRequestResponse(BaseModel):
    id: UUID
    user_email: str
    status: str
    requested_by_id: UUID
    notes: Optional[str]
    created_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


def check_admin_access(db: Session, user: User) -> bool:
    """Check if user is admin in any workspace."""
    return db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.role == "admin"
    ).first() is not None


@router.post("/deletion-request", response_model=DeletionRequestResponse)
async def create_deletion_request(
    request_data: DeletionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new GDPR/CCPA deletion request.
    
    Admin access required.
    """
    if not check_admin_access(db, current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    request = GDPRService.create_deletion_request(
        db=db,
        user_email=request_data.user_email,
        requested_by=current_user,
        notes=request_data.notes
    )
    
    return DeletionRequestResponse(
        id=request.id,
        user_email=request.user_email,
        status=request.status,
        requested_by_id=request.requested_by_id,
        notes=request.notes,
        created_at=request.created_at.isoformat(),
        completed_at=request.completed_at.isoformat() if request.completed_at else None
    )


@router.get("/deletion-requests", response_model=List[DeletionRequestResponse])
async def list_deletion_requests(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all deletion requests.
    
    Admin access required.
    """
    if not check_admin_access(db, current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(DeletionRequest)
    if status:
        query = query.filter(DeletionRequest.status == status)
    
    requests = query.order_by(DeletionRequest.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        DeletionRequestResponse(
            id=r.id,
            user_email=r.user_email,
            status=r.status,
            requested_by_id=r.requested_by_id,
            notes=r.notes,
            created_at=r.created_at.isoformat(),
            completed_at=r.completed_at.isoformat() if r.completed_at else None
        )
        for r in requests
    ]


@router.post("/deletion-requests/{request_id}/execute", response_model=DeletionRequestResponse)
async def execute_deletion_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a pending deletion request.
    
    This will:
    - Delete the user's personal data
    - Anonymize audit logs
    - Log the action for compliance proof
    
    Admin access required.
    """
    if not check_admin_access(db, current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        request = GDPRService.execute_deletion(
            db=db,
            request_id=request_id,
            executor=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return DeletionRequestResponse(
        id=request.id,
        user_email=request.user_email,
        status=request.status,
        requested_by_id=request.requested_by_id,
        notes=request.notes,
        created_at=request.created_at.isoformat(),
        completed_at=request.completed_at.isoformat() if request.completed_at else None
    )
