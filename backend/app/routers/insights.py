"""
Insights Router - Endpoints for AI-generated narratives
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import ChartNarrativeRequest, NarrativeResponse
from app.routers.auth_deps import get_current_user
from app.services.insights_service import InsightsService

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.post("/chart-narrative", response_model=NarrativeResponse)
async def get_chart_narrative(
    request: ChartNarrativeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate a narrative summary for a single chart's data"""
    service = InsightsService(db)
    narrative = await service.get_chart_narrative(request)
    
    return NarrativeResponse(
        narrative=narrative,
        generated_at=datetime.utcnow()
    )

@router.post("/dashboard-summary/{dashboard_id}", response_model=NarrativeResponse)
async def get_dashboard_summary(
    dashboard_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate an aggregate executive summary for an entire dashboard"""
    service = InsightsService(db)
    narrative = await service.get_dashboard_summary(dashboard_id)
    
    return NarrativeResponse(
        narrative=narrative,
        generated_at=datetime.utcnow()
    )
