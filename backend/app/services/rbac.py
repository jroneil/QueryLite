"""
RBAC Service - Granular permission enforcement
"""

from enum import Enum
from typing import Optional, Union
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.db.models import WorkspaceMember, User
from uuid import UUID

class Role(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

# Hierarchy: higher index means more permissions
ROLE_HIERARCHY = [Role.VIEWER, Role.EDITOR, Role.ADMIN]

class RBACService:
    @staticmethod
    def get_role_weight(role: str) -> int:
        try:
            return ROLE_HIERARCHY.index(Role(role))
        except (ValueError, KeyError):
            return -1

    @staticmethod
    def check_permission(
        db: Session, 
        user_id: Union[str, UUID],
        workspace_id: Union[str, UUID], 
        required_role: str = "viewer"
    ) -> bool:
        """
        Check if a user has at least the minimum required role in a workspace.
        Returns True if permitted, raises HTTPException if not.
        """
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this workspace"
            )
            
        user_weight = RBACService.get_role_weight(member.role)
        required_weight = RBACService.get_role_weight(required_role)
        
        if user_weight < required_weight:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
            
        return True

    @staticmethod
    def is_admin(db: Session, user_id: Union[str, UUID], workspace_id: Optional[Union[str, UUID]] = None) -> bool:
        """Check if user is admin in a specific workspace or any workspace (if None)"""
        query = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.role == Role.ADMIN
        )
        if workspace_id:
            query = query.filter(WorkspaceMember.workspace_id == workspace_id)
        
        return query.first() is not None
