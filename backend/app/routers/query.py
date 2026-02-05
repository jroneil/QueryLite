"""
Query router - Natural language to SQL endpoint
"""

import logging
import traceback
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import Comment, ConversationThread, DataSource, QueryHistory, SavedQuery, ThreadMessage, User
from app.models.schemas import (
    ChartRecommendation,
    CommentCreate,
    CommentResponse,
    QueryHistoryResponse,
    QueryRequest,
    QueryResponse,
    SavedQueryCreate,
    SavedQueryResponse,
)
from app.routers.auth_deps import get_current_user
from app.services.encryption import decrypt_connection_string
from app.services.llm_service import get_llm_service
from app.services.query_executor import QueryExecutor
from app.services.webhook_service import WebhookService

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def execute_natural_language_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a natural language query against a connected data source.
    """
    from app.middleware.read_only_enforcer import is_safe_sql
    from app.services.audit_logger import AuditLogger

    # Get data source and verify ownership
    data_source = db.query(DataSource).filter(
        DataSource.id == request.data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    
    if not data_source:
        raise HTTPException(status_code= status.HTTP_404_NOT_FOUND, detail="Data source not found or access denied")
    
    # Audit trail for the request
    AuditLogger.log_event(
        db=db,
        user_id=str(current_user.id),
        action="query_request",
        workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
        details={"question": request.question, "data_source_id": str(data_source.id)}
    )

    try:
        connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
        executor = QueryExecutor(connection_string, data_source_id=str(data_source.id))
        schema_info = executor.get_schema_info()
        table_names = executor.get_table_names()
        
        if not table_names:
            raise HTTPException(status_code=400, detail="No tables found in the database")
        
        # Incorporate global filters into the natural language question for the LLM
        refined_question = request.question
        if request.filters:
            filter_strs = []
            for col, val in request.filters.items():
                if val:
                    filter_strs.append(f"{col} is {val}")
            if filter_strs:
                refined_question += " where " + " and ".join(filter_strs)

        # Phase 6.1: Conversational Memory
        conversation_history = []
        thread = None
        if request.thread_id:
            thread = db.query(ConversationThread).filter(
                ConversationThread.id == request.thread_id,
                ConversationThread.user_id == current_user.id
            ).first()
            if thread:
                # Build history for LLM - limit to last 10 messages for context window
                for msg in thread.messages[-10:]:
                    conversation_history.append({
                        "role": msg.role,
                        "content": msg.content
                    })

        llm_service = get_llm_service()
        if not llm_service.is_configured():
            raise HTTPException(status_code=503, detail="LLM service not configured")
        
        sql_result = llm_service.generate_sql(refined_question, schema_info, table_names, conversation_history)
        if not sql_result.sql_query:
            raise HTTPException(status_code=400, detail=f"LLM Error: {sql_result.explanation}")

        # Phase 3A: Read-Only Enforcement
        settings = get_settings()
        if settings.enforce_read_only and not is_safe_sql(sql_result.sql_query):
            AuditLogger.log_event(
                db=db,
                user_id=str(current_user.id),
                action="security_violation_blocked",
                details={"sql": sql_result.sql_query, "reason": "Non-SELECT statement in read-only mode"}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Security Policy Violation: Only SELECT queries are allowed."
            )

        # Check for confidence
        if sql_result.confidence < settings.confidence_threshold:
            return QueryResponse(
                sql_query=sql_result.sql_query,
                explanation=sql_result.explanation,
                results=[],
                row_count=0,
                chart_recommendation=ChartRecommendation(chart_type="table"),
                execution_time_ms=0,
                confidence=sql_result.confidence,
                requires_confirmation=True,
                refinement_suggestion=llm_service.refine_query(request.question, "", schema_info)
            )
            
        # Audit log the execution
        AuditLogger.log_query(
            db=db,
            user_id=str(current_user.id),
            sql=sql_result.sql_query,
            workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None
        )

        # Phase 5: Query Result Caching
        import hashlib

        from app.services.cache_service import cache_service
        
        cache_key = hashlib.md5(f"{data_source.id}:{sql_result.sql_query}".encode(), usedforsecurity=False).hexdigest()  # nosec B324
        cached_response = cache_service.get(cache_key)
        
        if cached_response:
            # We still want to log that a cached query happened
            AuditLogger.log_event(
                db=db,
                user_id=str(current_user.id),
                action="query_cache_hit",
                details={"question": request.question, "sql": sql_result.sql_query}
            )
            # Reconstruct QueryResponse from cache
            return QueryResponse(**cached_response)

        results, execution_time = executor.execute_query(sql_result.sql_query)
        chart_recommendation = executor.recommend_chart_type(results)
        
        # Save to query history
        history = QueryHistory(
            user_id=current_user.id,
            data_source_id=request.data_source_id,
            natural_language_query=request.question,
            generated_sql=sql_result.sql_query,
            chart_type=chart_recommendation.chart_type
        )
        db.add(history)
        
        # Save to conversation thread if applicable
        if thread:
            # Add user message
            user_msg = ThreadMessage(
                thread_id=thread.id,
                role="user",
                content=request.question
            )
            db.add(user_msg)
            
            # Add assistant message
            assistant_msg = ThreadMessage(
                thread_id=thread.id,
                role="assistant",
                content=sql_result.explanation,
                sql_query=sql_result.sql_query,
                chart_recommendation=chart_recommendation.dict()
            )
            db.add(assistant_msg)
            
            # Update thread timing
            from sqlalchemy.sql import func
            thread.updated_at = func.now()

        db.commit()
        executor.close()
        
        # Trigger Webhook
        WebhookService.trigger_event(
            db=db,
            workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
            event_type="query_executed",
            details={
                "user": current_user.email,
                "question": request.question,
                "row_count": len(results),
                "execution_time_ms": execution_time
            }
        )

        print(f"Query executed successfully. Rows: {len(results)}, Execution time: {execution_time}ms")
        print(f"Chart recommendation: {chart_recommendation.chart_type} (x: {chart_recommendation.x_column}, y: {chart_recommendation.y_column})")

        response_data = QueryResponse(
            sql_query=sql_result.sql_query,
            explanation=sql_result.explanation,
            results=results,
            row_count=len(results),
            chart_recommendation=chart_recommendation,
            execution_time_ms=execution_time,
            confidence=sql_result.confidence
        )
        
        # Store in cache
        cache_service.set(cache_key, response_data.dict())

        return response_data
    except HTTPException: 
        raise
    except Exception as e: 
        logging.error(f"Error in execute_natural_language_query: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


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

    # Trigger Webhook
    WebhookService.trigger_event(
        db=db,
        workspace_id=str(ds.workspace_id) if ds.workspace_id else None,
        event_type="query_saved",
        details={
            "user": current_user.email,
            "query_name": saved.name,
            "natural_language_query": saved.natural_language_query
        }
    )

    return saved


@router.get("/saved-queries", response_model=List[SavedQueryResponse])
async def list_saved_queries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all saved queries for the current user"""
    return db.query(SavedQuery).filter(SavedQuery.user_id == current_user.id).order_by(SavedQuery.created_at.desc()).all()


@router.get("/saved-queries/{query_id}", response_model=SavedQueryResponse)
async def get_saved_query(
    query_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details for a specific saved query"""
    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    return query


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


# --- Comments Endpoints ---

@router.get("/saved-queries/{query_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    query_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all comments for a specific saved query"""
    # Verify query exists (visibility check)
    query = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
        
    comments = db.query(Comment, User.email).join(User, Comment.user_id == User.id).filter(
        Comment.saved_query_id == query_id
    ).order_by(Comment.created_at.asc()).all()
    
    result = []
    for c, email in comments:
        res = CommentResponse.from_orm(c)
        res.user_name = email.split('@')[0] # Simple username from email
        result.append(res)
    return result


@router.post("/saved-queries/{query_id}/comments", response_model=CommentResponse)
async def add_comment(
    query_id: UUID,
    request: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a saved query"""
    query = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
        
    comment = Comment(
        user_id=current_user.id,
        saved_query_id=query_id,
        content=request.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    res = CommentResponse.from_orm(comment)
    res.user_name = current_user.email.split('@')[0]
    return res


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment (owner only)"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.user_id == current_user.id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or access denied")
        
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
