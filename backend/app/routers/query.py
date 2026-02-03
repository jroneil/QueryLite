"""
Query router - Natural language to SQL endpoint
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DataSource, QueryHistory
from app.models.schemas import QueryRequest, QueryResponse
from app.services.encryption import decrypt_connection_string
from app.services.llm_service import get_llm_service
from app.services.query_executor import QueryExecutor

router = APIRouter()


from app.routers.auth_deps import get_current_user
from app.db.models import User, SavedQuery
from app.models.schemas import QueryRequest, QueryResponse, QueryHistoryResponse, SavedQueryCreate, SavedQueryResponse
from typing import List


@router.post("/query", response_model=QueryResponse)
async def execute_natural_language_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a natural language query against a connected data source.
    """
    # Get data source and verify ownership
    data_source = db.query(DataSource).filter(
        DataSource.id == request.data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found or access denied")
    
    # ... rest of the logic remains similar but with user scope ...
    try:
        connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
        executor = QueryExecutor(connection_string)
        schema_info = executor.get_schema_info()
        table_names = executor.get_table_names()
        
        if not table_names:
            raise HTTPException(status_code=400, detail="No tables found in the database")
        
        llm_service = get_llm_service()
        if not llm_service.is_configured():
            raise HTTPException(status_code=503, detail="LLM service not configured")
        
        sql_result = llm_service.generate_sql(request.question, schema_info, table_names)
        if not sql_result.sql_query:
            raise HTTPException(status_code=400, detail=f"LLM Error: {sql_result.explanation}")
            
        results, execution_time = executor.execute_query(sql_result.sql_query)
        chart_recommendation = executor.recommend_chart_type(results)
        
        # Save to query history with user_id
        history = QueryHistory(
            user_id=current_user.id,
            data_source_id=request.data_source_id,
            natural_language_query=request.question,
            generated_sql=sql_result.sql_query,
            chart_type=chart_recommendation.chart_type
        )
        db.add(history)
        db.commit()
        executor.close()
        
        return QueryResponse(
            sql_query=sql_result.sql_query,
            explanation=sql_result.explanation,
            results=results,
            row_count=len(results),
            chart_recommendation=chart_recommendation,
            execution_time_ms=execution_time
        )
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[QueryHistoryResponse])
async def get_query_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    """Get query history for the current user"""
    return db.query(QueryHistory).filter(
        QueryHistory.user_id == current_user.id
    ).order_by(QueryHistory.created_at.desc()).limit(limit).all()


@router.post("/saved-queries", response_model=SavedQueryResponse)
async def save_query(
    request: SavedQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a query as a favorite"""
    # Verify data source ownership
    ds = db.query(DataSource).filter(
        DataSource.id == request.data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    saved = SavedQuery(
        user_id=current_user.id,
        data_source_id=request.data_source_id,
        name=request.name,
        natural_language_query=request.natural_language_query,
        generated_sql=request.generated_sql,
        chart_type=request.chart_type
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.get("/saved-queries", response_model=List[SavedQueryResponse])
async def list_saved_queries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all saved queries for the current user"""
    return db.query(SavedQuery).filter(SavedQuery.user_id == current_user.id).order_by(SavedQuery.created_at.desc()).all()


@router.delete("/saved-queries/{query_id}")
async def delete_saved_query(
    query_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a saved query"""
    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    db.delete(query)
    db.commit()
    return {"message": "Query deleted"}


@router.get("/llm/status")
async def check_llm_status():
    """Check if LLM service is properly configured"""
    llm_service = get_llm_service()
    is_configured = llm_service.is_configured()
    return {"configured": is_configured, "message": "Ready" if is_configured else "Key missing"}

