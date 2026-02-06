"""
Audit Router - Administrative interface for system logs
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog, User, WorkspaceMember
from app.routers.auth_deps import get_current_user
from app.services.rbac import RBACService

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/logs")
async def get_audit_logs(
    workspace_id: Optional[UUID] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve audit logs with filtering (Admin only)"""
    # Check if user is admin in any workspace if global, or specific workspace
    is_admin = False
    if workspace_id:
        try:
            RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
            is_admin = True
        except HTTPException:
            pass
    
    if not is_admin:
        # Check if they are admin ANYWHERE to see global logs (simplified for now)
        is_global_admin = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.role == "admin"
        ).first() is not None
        
        if not is_global_admin:
            raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(AuditLog, User.email).join(User, AuditLog.user_id == User.id)
    
    if workspace_id:
        query = query.filter(AuditLog.workspace_id == workspace_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
        
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for log, email in logs:
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": email,
            "workspace_id": log.workspace_id,
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "token_count": log.token_count,
            "response_time_ms": log.response_time_ms,
            "created_at": log.created_at
        })
        
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": result
    }

@router.get("/stats")
async def get_audit_stats(
    workspace_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregate audit statistics (Admin only)"""
    # Permission check (reuse logic or helper)
    if workspace_id:
        RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    else:
        # Check global admin status
        admin_anywhere = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.role == "admin"
        ).first()
        if not admin_anywhere:
             raise HTTPException(status_code=403, detail="Admin access required")

    # Base filter
    filters = []
    if workspace_id:
        filters.append(AuditLog.workspace_id == workspace_id)

    # 1. Total tokens used
    total_tokens = db.query(func.sum(AuditLog.token_count)).filter(*filters).scalar() or 0
    
    # 2. Avg response time
    avg_perf = db.query(func.avg(AuditLog.response_time_ms)).filter(*filters, AuditLog.action == "query_complete").scalar() or 0
    
    # 3. Success vs Failure (simplified)
    total_queries = db.query(func.count(AuditLog.id)).filter(*filters, AuditLog.action == "query_complete").scalar() or 0
    
    # 4. Top users
    top_users = db.query(User.email, func.count(AuditLog.id)).join(User).filter(*filters).group_by(User.email).order_by(func.count(AuditLog.id).desc()).limit(5).all()
    
    return {
        "total_tokens": total_tokens,
        "avg_response_time_ms": round(float(avg_perf), 2),
        "total_queries": total_queries,
        "top_users": [{"email": email, "count": count} for email, count in top_users]
    }
