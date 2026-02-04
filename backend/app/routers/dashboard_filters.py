"""
Dashboard Filters Router - Management of global dashboard filters
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Dashboard, DashboardFilter, User
from app.models.schemas import DashboardFilterCreate, DashboardFilterResponse
from app.routers.auth_deps import get_current_user

router = APIRouter(prefix="/dashboards/{dashboard_id}/filters", tags=["Dashboard Filters"])

@router.post("/", response_model=DashboardFilterResponse)
async def add_filter(
    dashboard_id: UUID,
    filter_data: DashboardFilterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a global filter to a dashboard"""
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found or access denied")
        
    new_filter = DashboardFilter(
        dashboard_id=dashboard_id,
        filter_type=filter_data.filter_type,
        column_name=filter_data.column_name,
        label=filter_data.label,
        default_value=filter_data.default_value
    )
    db.add(new_filter)
    db.commit()
    db.refresh(new_filter)
    return new_filter

@router.get("/", response_model=List[DashboardFilterResponse])
async def list_filters(
    dashboard_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all filters for a dashboard"""
    # Check access (anyone who can see the dashboard can see the filters)
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if not dashboard.is_public and dashboard.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return dashboard.filters

@router.delete("/{filter_id}")
async def remove_filter(
    dashboard_id: UUID,
    filter_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a filter from a dashboard"""
    filter_obj = db.query(DashboardFilter).filter(
        DashboardFilter.id == filter_id,
        DashboardFilter.dashboard_id == dashboard_id
    ).first()
    
    if not filter_obj:
        raise HTTPException(status_code=404, detail="Filter not found")
        
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db.delete(filter_obj)
    db.commit()
    return {"message": "Filter removed"}
