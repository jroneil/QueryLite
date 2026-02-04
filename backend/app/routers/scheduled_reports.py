"""
Scheduled Reports Router - Management of automated query reporting
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import SavedQuery, ScheduledReport, User
from app.models.schemas import ScheduledReportCreate, ScheduledReportResponse
from app.routers.auth_deps import get_current_user
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/scheduled-reports", tags=["Scheduled Reports"])

@router.post("/", response_model=ScheduledReportResponse)
async def create_scheduled_report(
    report_data: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new scheduled report"""
    # Verify saved query exists and user has access (for now, must be owner)
    saved_query = db.query(SavedQuery).filter(
        SavedQuery.id == report_data.saved_query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    
    if not saved_query:
        raise HTTPException(status_code=404, detail="Saved query not found or access denied")

    new_report = ScheduledReport(
        name=report_data.name,
        owner_id=current_user.id,
        saved_query_id=report_data.saved_query_id,
        schedule_cron=report_data.schedule_cron,
        recipient_emails=report_data.recipient_emails,
        is_active=report_data.is_active
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    # Sync with scheduler
    if new_report.is_active:
        scheduler_service.add_report_job(new_report)
    
    return new_report

@router.get("/", response_model=List[ScheduledReportResponse])
async def list_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all scheduled reports owned by the current user"""
    return db.query(ScheduledReport).filter(
        ScheduledReport.owner_id == current_user.id
    ).all()

@router.get("/{report_id}", response_model=ScheduledReportResponse)
async def get_scheduled_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific scheduled report"""
    report = db.query(ScheduledReport).filter(
        ScheduledReport.id == report_id,
        ScheduledReport.owner_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    
    return report

@router.patch("/{report_id}", response_model=ScheduledReportResponse)
async def update_scheduled_report(
    report_id: UUID,
    report_data: ScheduledReportCreate, # In a full app, we'd use a PartialUpdate schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled report"""
    report = db.query(ScheduledReport).filter(
        ScheduledReport.id == report_id,
        ScheduledReport.owner_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    
    report.name = report_data.name
    report.schedule_cron = report_data.schedule_cron
    report.recipient_emails = report_data.recipient_emails
    report.is_active = report_data.is_active
    
    db.commit()
    db.refresh(report)
    
    # Sync with scheduler
    if report.is_active:
        scheduler_service.add_report_job(report)
    else:
        scheduler_service.remove_report_job(str(report.id))
    
    return report

@router.delete("/{report_id}")
async def delete_scheduled_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scheduled report"""
    report = db.query(ScheduledReport).filter(
        ScheduledReport.id == report_id,
        ScheduledReport.owner_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    
    # Sync with scheduler
    scheduler_service.remove_report_job(str(report_id))
    
    db.delete(report)
    db.commit()
    
    return {"message": "Scheduled report deleted"}
