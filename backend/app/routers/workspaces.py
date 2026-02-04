"""
Workspaces Router - Management of teams and collaboration spaces
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.db.models import Workspace, WorkspaceMember, User
from app.models.schemas import WorkspaceCreate, WorkspaceResponse, WorkspaceMemberResponse
from app.routers.auth_deps import get_current_user
from app.services.rbac import RBACService

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workspace and add creator as admin"""
    new_workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        owner_id=current_user.id
    )
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)
    
    # Add creator as Admin member
    member = WorkspaceMember(
        workspace_id=new_workspace.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    
    return new_workspace

@router.get("/", response_model=List[WorkspaceResponse])
async def get_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workspaces the user is a member of"""
    # Join with members table to find user's workspaces
    workspaces = db.query(Workspace).join(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user.id
    ).all()
    return workspaces

@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse)
async def add_member(
    workspace_id: UUID,
    email: str,
    role: str = "viewer",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new member to a workspace (Admin only)"""
    # Check permissions
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    
    # Find user by email
    user_to_add = db.query(User).filter(User.email == email).first()
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Check if already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_to_add.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace"
        )
        
    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_to_add.id,
        role=role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return {
        "user_id": user_to_add.id,
        "email": user_to_add.email,
        "name": user_to_add.name,
        "role": new_member.role
    }

@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from a workspace (Admin only)"""
    # Check permissions
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    
    # Can't remove yourself if owner
    workspace = db.query(Workspace).get(workspace_id)
    if workspace.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the owner from the workspace"
        )
        
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    db.delete(member)
    db.commit()
    
    return {"message": "Member removed successfully"}

from app.models.schemas import WebhookUpdate

@router.patch("/{workspace_id}/webhook", response_model=WorkspaceResponse)
async def update_webhook(
    workspace_id: UUID,
    webhook_data: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workspace webhook settings (Admin only)"""
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    workspace.webhook_url = webhook_data.webhook_url
    workspace.webhook_enabled = webhook_data.webhook_enabled
    db.commit()
    db.refresh(workspace)
    
    return workspace
