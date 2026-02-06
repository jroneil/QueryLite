from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.db.database import get_db
from app.db.models import AlertRule, DataAnomalyAlert, User, SavedQuery
from app.models.schemas import AlertRuleCreate, AlertRuleResponse, DataAnomalyAlertResponse
from app.routers.auth_deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=AlertRuleResponse)
async def create_alert_rule(
    request: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new smart threshold-based alert rule"""
    # Verify saved query exists and user has access
    query = db.query(SavedQuery).get(request.saved_query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    if query.user_id != current_user.id:
        # Check workspace permissions if needed, but for now owner-only create
        raise HTTPException(status_code=403, detail="Access denied")

    alert = AlertRule(
        owner_id=current_user.id,
        saved_query_id=request.saved_query_id,
        name=request.name,
        condition_col=request.condition_col,
        operator=request.operator,
        threshold=request.threshold,
        channel_type=request.channel_type,
        channel_webhook=request.channel_webhook,
        is_active=request.is_active
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/", response_model=List[AlertRuleResponse])
async def list_alert_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all alert rules for the current user"""
    return db.query(AlertRule).filter(AlertRule.owner_id == current_user.id).all()

@router.get("/anomalies", response_model=List[DataAnomalyAlertResponse])
async def list_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List detected anomalies for the current user's saved queries"""
    return db.query(DataAnomalyAlert).join(SavedQuery).filter(
        SavedQuery.user_id == current_user.id
    ).order_by(DataAnomalyAlert.created_at.desc()).all()

@router.delete("/{alert_id}")
async def delete_alert_rule(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an alert rule"""
    alert = db.query(AlertRule).filter(AlertRule.id == alert_id, AlertRule.owner_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert rule not found")
        
    db.delete(alert)
    db.commit()
    return {"message": "Alert rule deleted"}

@router.post("/anomalies/{anomaly_id}/acknowledge")
async def acknowledge_anomaly(
    anomaly_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an anomaly as acknowledged"""
    anomaly = db.query(DataAnomalyAlert).get(anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")
        
    # Verify access via saved query owner
    query = db.query(SavedQuery).get(anomaly.saved_query_id)
    if query.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Access denied")

    anomaly.is_acknowledged = True
    db.commit()
    return {"message": "Anomaly acknowledged"}
