"""
Column Permissions Router - APIs for configuring column-level access control
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, DataSource, ColumnPermission
from app.routers.auth_deps import get_current_user
from app.services.rbac import RBACService


router = APIRouter(prefix="/column-permissions", tags=["Column Permissions"])


class ColumnPermissionCreate(BaseModel):
    column_name: str
    restricted_roles: List[str] = []  # ["viewer", "editor"]
    mask_strategy: str = "hide"  # hide, redact_partial, hash


class ColumnPermissionResponse(BaseModel):
    id: UUID
    data_source_id: UUID
    column_name: str
    restricted_roles: List[str]
    mask_strategy: str

    class Config:
        from_attributes = True


@router.get("/{data_source_id}", response_model=List[ColumnPermissionResponse])
async def list_column_permissions(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all column permissions for a data source.
    
    Requires admin access to the data source's workspace.
    """
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if data_source.workspace_id:
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="admin")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    permissions = db.query(ColumnPermission).filter(
        ColumnPermission.data_source_id == data_source_id
    ).all()
    
    return permissions


@router.post("/{data_source_id}", response_model=ColumnPermissionResponse)
async def create_column_permission(
    data_source_id: UUID,
    permission_data: ColumnPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new column permission rule.
    
    Requires admin access.
    """
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if data_source.workspace_id:
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="admin")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for existing rule on same column
    existing = db.query(ColumnPermission).filter(
        ColumnPermission.data_source_id == data_source_id,
        ColumnPermission.column_name == permission_data.column_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Permission rule already exists for column '{permission_data.column_name}'")
    
    permission = ColumnPermission(
        data_source_id=data_source_id,
        column_name=permission_data.column_name,
        restricted_roles=permission_data.restricted_roles,
        mask_strategy=permission_data.mask_strategy
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return permission


@router.put("/{data_source_id}/{permission_id}", response_model=ColumnPermissionResponse)
async def update_column_permission(
    data_source_id: UUID,
    permission_id: UUID,
    permission_data: ColumnPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing column permission rule.
    
    Requires admin access.
    """
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if data_source.workspace_id:
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="admin")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    permission = db.query(ColumnPermission).filter(
        ColumnPermission.id == permission_id,
        ColumnPermission.data_source_id == data_source_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    permission.column_name = permission_data.column_name
    permission.restricted_roles = permission_data.restricted_roles
    permission.mask_strategy = permission_data.mask_strategy
    db.commit()
    db.refresh(permission)
    
    return permission


@router.delete("/{data_source_id}/{permission_id}")
async def delete_column_permission(
    data_source_id: UUID,
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a column permission rule.
    
    Requires admin access.
    """
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if data_source.workspace_id:
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="admin")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    permission = db.query(ColumnPermission).filter(
        ColumnPermission.id == permission_id,
        ColumnPermission.data_source_id == data_source_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    db.delete(permission)
    db.commit()
    
    return {"message": "Permission deleted successfully"}
