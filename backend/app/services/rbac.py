"""
RBAC Service - Role-Based Access Control logic
"""

from sqlalchemy.orm import Session
from app.db.models import WorkspaceMember, Workspace
from fastapi import HTTPException, status
from uuid import UUID

class RBACService:
    @staticmethod
    def get_user_role(db: Session, user_id: UUID, workspace_id: UUID) -> str:
        """Get the role of a user in a specific workspace"""
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.workspace_id == workspace_id
        ).first()
        
        if not member:
            return None
        return member.role

    @staticmethod
    def check_permission(db: Session, user_id: UUID, workspace_id: UUID, required_role: str = "viewer"):
        """Check if a user has at least the required role in a workspace"""
        role = RBACService.get_user_role(db, user_id, workspace_id)
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this workspace"
            )
            
        roles_hierarchy = ["viewer", "editor", "admin"]
        try:
            if roles_hierarchy.index(role) < roles_hierarchy.index(required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required role: {required_role}"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid role assigned"
            )
            
        return role

    @staticmethod
    def is_workspace_owner(db: Session, user_id: UUID, workspace_id: UUID) -> bool:
        """Check if a user is the owner of a workspace"""
        workspace = db.query(Workspace).filter(
            Workspace.id == workspace_id,
            Workspace.owner_id == user_id
        ).first()
        return workspace is not None
