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

    @staticmethod
    def get_user_role(db: Session, user_id: Union[str, UUID], workspace_id: Union[str, UUID]) -> Optional[str]:
        """Get user's role in a specific workspace."""
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()
        return member.role if member else None

    @staticmethod
    def get_masked_columns(
        db: Session,
        user_role: str,
        data_source_id: Union[str, UUID]
    ) -> list:
        """
        Get list of columns that should be masked for a given user role.
        
        Returns list of dicts with column_name and mask_strategy.
        """
        from app.db.models import ColumnPermission
        
        permissions = db.query(ColumnPermission).filter(
            ColumnPermission.data_source_id == data_source_id
        ).all()
        
        masked = []
        for perm in permissions:
            restricted_roles = perm.restricted_roles or []
            if user_role in restricted_roles:
                masked.append({
                    "column_name": perm.column_name,
                    "mask_strategy": perm.mask_strategy
                })
        
        return masked

    @staticmethod
    def apply_column_masking(
        results: list,
        masked_columns: list
    ) -> list:
        """
        Apply masking to query results based on column permissions.
        
        Strategies:
        - hide: Remove the column entirely
        - redact_partial: Replace value with partial stars (e.g., "Jo***")
        - hash: Replace with hashed representation
        """
        if not masked_columns or not results:
            return results
        
        # Build column lookup
        hide_cols = set()
        redact_cols = set()
        hash_cols = set()
        
        for col in masked_columns:
            name = col["column_name"].lower()
            strategy = col["mask_strategy"]
            if strategy == "hide":
                hide_cols.add(name)
            elif strategy == "redact_partial":
                redact_cols.add(name)
            elif strategy == "hash":
                hash_cols.add(name)
        
        masked_results = []
        for row in results:
            new_row = {}
            for key, value in row.items():
                key_lower = key.lower()
                
                if key_lower in hide_cols:
                    continue  # Skip hidden columns
                elif key_lower in redact_cols:
                    if isinstance(value, str) and len(value) > 2:
                        new_row[key] = value[:2] + "***"
                    else:
                        new_row[key] = "***"
                elif key_lower in hash_cols:
                    import hashlib
                    hash_val = hashlib.sha256(str(value).encode()).hexdigest()[:8]
                    new_row[key] = f"[HASH:{hash_val}]"
                else:
                    new_row[key] = value
            
            masked_results.append(new_row)
        
        return masked_results
