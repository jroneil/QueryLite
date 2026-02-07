"""
Data Sources router - CRUD operations for database connections
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DataSource, User, WorkspaceMember
from app.models.schemas import (
    DataSourceCreate,
    DataSourceResponse,
    DataSourceTestResult,
)
from app.routers.auth_deps import get_current_user
from app.services.encryption import decrypt_connection_string, encrypt_connection_string
from app.services.query_executor import QueryExecutor
from app.services.rbac import RBACService

router = APIRouter()


@router.post("/", response_model=DataSourceResponse)
async def create_data_source(
    data_source: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new data source connection"""
    # Check workspace permissions if workspace_id provided
    if data_source.workspace_id:
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="editor")

    # Encrypt the connection string
    encrypted = encrypt_connection_string(data_source.connection_string)
    
    # Create database record
    db_data_source = DataSource(
        user_id=current_user.id,
        workspace_id=data_source.workspace_id,
        name=data_source.name,
        description=data_source.description,
        type=data_source.type,
        connection_string_encrypted=encrypted if data_source.connection_string else None,
        config=data_source.config,
        file_path=data_source.file_path
    )
    
    db.add(db_data_source)
    db.commit()
    db.refresh(db_data_source)
    
    return db_data_source


@router.get("/", response_model=List[DataSourceResponse])
async def list_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all data source connections accessible to the user (Private + Team Workspaces)"""
    # 1. Private data sources
    private = db.query(DataSource).filter(
        DataSource.user_id == current_user.id,
        DataSource.workspace_id.is_(None)
    ).all()
    
    # 2. Team data sources via workspace memberships
    team = db.query(DataSource).join(WorkspaceMember, DataSource.workspace_id == WorkspaceMember.workspace_id).filter(
        WorkspaceMember.user_id == current_user.id
    ).all()
    
    # Combine and unique
    results = list({ds.id: ds for ds in (private + team)}.values())
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


@router.get("/{data_source_id}", response_model=DataSourceResponse)
async def get_data_source(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific data source by ID, checking workspace permissions"""
    data_source = db.query(DataSource).get(data_source_id)
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
        
    # Check if owner or has workspace access
    if data_source.user_id != current_user.id:
        if not data_source.workspace_id:
             raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="viewer")
        
    return data_source


@router.delete("/{data_source_id}")
async def delete_data_source(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a data source connection (Owner or Workspace Admin/Editor)"""
    data_source = db.query(DataSource).get(data_source_id)
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
        
    # Permission check
    if data_source.user_id != current_user.id:
        if not data_source.workspace_id:
             raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="editor")
    
    db.delete(data_source)
    db.commit()
    
    return {"message": "Data source deleted successfully"}


@router.post("/{data_source_id}/test", response_model=DataSourceTestResult)
async def test_data_source_connection(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test a data source connection"""
    # Reuse get_data_source logic for permission check
    data_source = await get_data_source(data_source_id, db, current_user)
    
    try:
        if data_source.type == "duckdb":
            executor = QueryExecutor(ds_type="duckdb", file_path=data_source.file_path)
        elif data_source.type in ["bigquery", "snowflake"]:
            executor = QueryExecutor(ds_type=data_source.type, config=data_source.config)
        else:
            connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
            executor = QueryExecutor(connection_string, ds_type=data_source.type, config=data_source.config)
            
        success, message, tables = executor.test_connection()
        executor.close()
        
        return DataSourceTestResult(
            success=success,
            message=message,
            tables=tables if success else None
        )
    except Exception as e:
        return DataSourceTestResult(
            success=False,
            message=f"Error testing connection: {str(e)}",
            tables=None
        )

