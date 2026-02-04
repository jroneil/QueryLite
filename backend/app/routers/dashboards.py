"""
Dashboards Router - Management of query dashboards and panels
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.db.models import Dashboard, DashboardPanel, SavedQuery, User
from app.models.schemas import DashboardCreate, DashboardResponse, DashboardPanelCreate, DashboardPanelResponse
from app.routers.auth_deps import get_current_user

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])

@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    dashboard_data: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new dashboard"""
    new_dashboard = Dashboard(
        name=dashboard_data.name,
        description=dashboard_data.description,
        workspace_id=dashboard_data.workspace_id,
        owner_id=current_user.id,
        is_public=dashboard_data.is_public
    )
    db.add(new_dashboard)
    db.commit()
    db.refresh(new_dashboard)
    return new_dashboard

@router.get("/", response_model=List[DashboardResponse])
async def list_dashboards(
    workspace_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List dashboards accessible to the user"""
    query = db.query(Dashboard)
    if workspace_id:
        query = query.filter(Dashboard.workspace_id == workspace_id)
    else:
        # Default to user's private dashboards or those they created
        query = query.filter(Dashboard.owner_id == current_user.id)
    
    return query.all()

@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard_details(
    dashboard_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full details of a dashboard including panels"""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Check access (basic check for now)
    # If it's private and not owned by user, block
    if not dashboard.is_public and dashboard.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return dashboard

@router.patch("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: UUID,
    dashboard_data: DashboardCreate, # Minimal patch for now
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update dashboard metadata"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found or access denied")
    
    dashboard.name = dashboard_data.name
    dashboard.description = dashboard_data.description
    dashboard.is_public = dashboard_data.is_public
    if dashboard_data.workspace_id:
        dashboard.workspace_id = dashboard_data.workspace_id
        
    db.commit()
    db.refresh(dashboard)
    return dashboard

@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a dashboard"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found or access denied")
    
    db.delete(dashboard)
    db.commit()
    return {"message": "Dashboard deleted"}

# Panel Management Endpoints

@router.post("/{dashboard_id}/panels", response_model=DashboardPanelResponse)
async def add_panel_to_dashboard(
    dashboard_id: UUID,
    panel_data: DashboardPanelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a panel to an existing dashboard"""
    # Verify dashboard ownership/access
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found or access denied")
        
    # Verify saved query exists
    saved_query = db.query(SavedQuery).filter(SavedQuery.id == panel_data.saved_query_id).first()
    if not saved_query:
        raise HTTPException(status_code=404, detail="Saved query not found")

    new_panel = DashboardPanel(
        dashboard_id=dashboard_id,
        saved_query_id=panel_data.saved_query_id,
        title_override=panel_data.title_override,
        grid_x=panel_data.grid_x,
        grid_y=panel_data.grid_y,
        grid_w=panel_data.grid_w,
        grid_h=panel_data.grid_h
    )
    db.add(new_panel)
    db.commit()
    db.refresh(new_panel)
    return new_panel

@router.patch("/panels/{panel_id}", response_model=DashboardPanelResponse)
async def update_panel_layout(
    panel_id: UUID,
    panel_data: DashboardPanelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update panel positioning/size"""
    panel = db.query(DashboardPanel).filter(DashboardPanel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
        
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == panel.dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=403, detail="Access denied")

    panel.grid_x = panel_data.grid_x
    panel.grid_y = panel_data.grid_y
    panel.grid_w = panel_data.grid_w
    panel.grid_h = panel_data.grid_h
    panel.title_override = panel_data.title_override
    
    db.commit()
    db.refresh(panel)
    return panel

@router.delete("/panels/{panel_id}")
async def remove_panel(
    panel_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a panel from dashboard"""
    panel = db.query(DashboardPanel).filter(DashboardPanel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
        
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == panel.dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=403, detail="Access denied")
        
    db.delete(panel)
    db.commit()
    return {"message": "Panel removed"}
