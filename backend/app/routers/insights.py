"""
Insights Router - Endpoints for AI-generated narratives
"""

from typing import List
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import ChartNarrativeRequest, NarrativeResponse, DiscoveryResponse
from app.routers.auth_deps import get_current_user
from app.services.insights_service import InsightsService

import logging
logger = logging.getLogger(__name__)

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

@router.get("/discover-query-insights/{saved_query_id}", response_model=DiscoveryResponse)
async def discover_query_insights(
    saved_query_id: UUID,
    value_col: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Scan query results and return discovered ' Smart Insights'"""
    from app.db.models import SavedQuery, DataSource
    from app.services.query_executor import QueryExecutor
    from app.services.encryption import decrypt_connection_string
    from app.services.discovery import DataDiscovery
    
    saved_query = db.query(SavedQuery).get(saved_query_id)
    if not saved_query:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    data_source = db.query(DataSource).get(saved_query.data_source_id)
    
    # Simple executor logic
    if data_source.type == "duckdb":
        executor = QueryExecutor(ds_type="duckdb", file_path=data_source.file_path, data_source_id=str(data_source.id))
    elif data_source.type in ["bigquery", "snowflake"]:
        executor = QueryExecutor(ds_type=data_source.type, config=data_source.config, data_source_id=str(data_source.id))
    else:
        connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
        executor = QueryExecutor(connection_string, ds_type=data_source.type, data_source_id=str(data_source.id), config=data_source.config)
        
    results = executor.execute_sql(saved_query.generated_sql)
    data = results["rows"]
    
    insights = DataDiscovery.discover_insights(data, value_col=value_col)
    
    return DiscoveryResponse(
        insights=insights,
        saved_query_id=saved_query_id,
        generated_at=datetime.utcnow()
    )

@router.get("/discover-all", response_model=List[DiscoveryResponse])
async def discover_all_insights(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Scan top saved queries and return a feed of discovered insights"""
    from app.db.models import SavedQuery, DataSource
    from app.services.query_executor import QueryExecutor
    from app.services.encryption import decrypt_connection_string
    from app.services.discovery import DataDiscovery
    
    # Get top 5 saved queries by the user
    saved_queries = db.query(SavedQuery).filter(SavedQuery.user_id == current_user.id).limit(5).all()
    
    all_responses = []
    
    for saved_query in saved_queries:
        try:
            # We don't know the value_col, so we'll try to guess or use the one from chart_recommendation if available
            # In a real app, we'd store the metric column in the SavedQuery model
            # For now, we'll try to find a numeric column
            
            data_source = db.query(DataSource).get(saved_query.data_source_id)
            if not data_source: continue
            
            if data_source.type == "duckdb":
                executor = QueryExecutor(ds_type="duckdb", file_path=data_source.file_path, data_source_id=str(data_source.id))
            elif data_source.type in ["bigquery", "snowflake"]:
                executor = QueryExecutor(ds_type=data_source.type, config=data_source.config, data_source_id=str(data_source.id))
            else:
                connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
                executor = QueryExecutor(connection_string, ds_type=data_source.type, data_source_id=str(data_source.id), config=data_source.config)
                
            results = executor.execute_sql(saved_query.generated_sql)
            data = results["rows"]
            
            if not data: continue
            
            # Find first numeric column
            value_col = None
            for col, val in data[0].items():
                if isinstance(val, (int, float)):
                    value_col = col
                    break
            
            if not value_col: continue
            
            insights = DataDiscovery.discover_insights(data, value_col=value_col)
            
            if insights:
                all_responses.append(DiscoveryResponse(
                    insights=insights,
                    saved_query_id=saved_query.id,
                    generated_at=datetime.utcnow()
                ))
        except Exception as e:
            logger.error(f"Error discovering insights for query {saved_query.id}: {e}")
            continue
            
    return all_responses
