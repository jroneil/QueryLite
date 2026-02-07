from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import SSOConfig, Workspace, User
from app.models.schemas import SSOConfigCreate, SSOConfigResponse
from app.routers.auth_deps import get_current_user
from app.services.encryption import encrypt_connection_string, decrypt_connection_string
from app.services.rbac import RBACService

router = APIRouter(prefix="/sso", tags=["SSO"])

@router.post("/{workspace_id}", response_model=SSOConfigResponse)
async def create_or_update_sso_config(
    workspace_id: UUID,
    config_in: SSOConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update OIDC SSO configuration for a workspace (Admin only)"""
    # Check if workspace exists
    workspace = db.query(Workspace).get(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Permission check: Must be Workspace Admin
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    
    # Check if existing config
    db_config = db.query(SSOConfig).filter(SSOConfig.workspace_id == workspace_id).first()
    
    # Encrypt client secret
    encrypted_secret = encrypt_connection_string(config_in.client_secret)
    
    if db_config:
        db_config.provider_name = config_in.provider_name
        db_config.issuer_url = config_in.issuer_url
        db_config.client_id = config_in.client_id
        db_config.client_secret_encrypted = encrypted_secret
        db_config.domain_allowlist = config_in.domain_allowlist
        db_config.group_mapping = config_in.group_mapping
    else:
        db_config = SSOConfig(
            workspace_id=workspace_id,
            provider_name=config_in.provider_name,
            issuer_url=config_in.issuer_url,
            client_id=config_in.client_id,
            client_secret_encrypted=encrypted_secret,
            domain_allowlist=config_in.domain_allowlist,
            group_mapping=config_in.group_mapping
        )
        db.add(db_config)
    
    db.commit()
    db.refresh(db_config)
    return db_config

@router.get("/{workspace_id}", response_model=Optional[SSOConfigResponse])
async def get_sso_config(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve SSO configuration for a workspace (Admin/Editor)"""
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="editor")
    
    config = db.query(SSOConfig).filter(SSOConfig.workspace_id == workspace_id).first()
    return config

@router.delete("/{workspace_id}")
async def delete_sso_config(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete SSO configuration for a workspace (Admin only)"""
    RBACService.check_permission(db, current_user.id, workspace_id, required_role="admin")
    
    config = db.query(SSOConfig).filter(SSOConfig.workspace_id == workspace_id).first()
    if config:
        db.delete(config)
        db.commit()
    
    return {"message": "SSO configuration deleted"}

@router.get("/discover/{domain}", response_model=Optional[dict])
async def discover_sso_by_domain(
    domain: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to discover OIDC issuer based on email domain.
    Used by the login page to direct users to their SSO provider.
    """
    # This is a bit expensive, in prod we'd index domains
    # For now, we search configs with the domain in allowlist
    configs = db.query(SSOConfig).filter(SSOConfig.is_active == True).all()
    for config in configs:
        if config.domain_allowlist and domain in config.domain_allowlist:
            return {
                "workspace_id": config.workspace_id,
                "provider_name": config.provider_name,
                "issuer_url": config.issuer_url,
                "client_id": config.client_id
            }
    
    return None
