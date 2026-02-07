"""
Data Lineage Router - APIs for viewing query-to-schema relationships
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, DataSource, WorkspaceMember
from app.routers.auth_deps import get_current_user
from app.services.lineage_service import LineageService

router = APIRouter(prefix="/lineage", tags=["Data Lineage"])


@router.get("/{data_source_id}")
async def get_lineage_graph(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the full lineage graph for a data source.
    
    Returns a graph with nodes (tables, queries, panels) and edges.
    """
    # Verify access to data source
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Check workspace membership
    if data_source.workspace_id:
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == data_source.workspace_id,
            WorkspaceMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    graph = LineageService.get_lineage_graph(db, data_source_id)
    return graph


@router.get("/{data_source_id}/impact/{table_name}")
async def get_impact_analysis(
    data_source_id: UUID,
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze the impact of changes to a specific table.
    
    Returns all saved queries and dashboard panels that reference the table.
    """
    # Verify access to data source
    data_source = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Check workspace membership
    if data_source.workspace_id:
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == data_source.workspace_id,
            WorkspaceMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")
    elif data_source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    impact = LineageService.get_impact_analysis(db, data_source_id, table_name)
    return impact
