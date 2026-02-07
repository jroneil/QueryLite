"""
Query router - Natural language to SQL endpoint
"""

import logging
import traceback

logger = logging.getLogger(__name__)
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import Comment, ConversationThread, DataSource, QueryHistory, SavedQuery, SavedQueryVersion, ThreadMessage, User
from app.models.schemas import (
    ChartRecommendation,
    CommentCreate,
    CommentResponse,
    QueryHistoryResponse,
    QueryRequest,
    QueryResponse,
    SavedQueryCreate,
    SavedQueryResponse,
    SavedQueryVersionResponse,
    QueryJobStatus,
)
from app.routers.auth_deps import get_current_user
from app.services.encryption import decrypt_connection_string
from app.services.llm_service import get_llm_service
from app.services.pii_masker import PIIMasker
from app.services.query_executor import QueryExecutor
from app.services.rbac import RBACService
from app.services.webhook_service import WebhookService
from app.services.cache_service import cache_service
from app.services.background_executor import background_executor

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

    # Get data source
    data_source = db.query(DataSource).get(request.data_source_id)
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
        
    # Permission check: Owner or has workspace access
    if data_source.user_id != current_user.id:
        if not data_source.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, data_source.workspace_id, required_role="viewer")
    
    # Audit trail for the request
    AuditLogger.log_event(
        db=db,
        user_id=str(current_user.id),
        action="query_request",
        workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
        details={"question": request.question, "data_source_id": str(data_source.id)}
    )

    requires_heal_flag = False
    original_error_msg = None

    try:
        # Simplified Factory Logic: Pass config for all types
        if data_source.type == "duckdb":
            executor = QueryExecutor(
                ds_type="duckdb", 
                file_path=data_source.file_path, 
                data_source_id=str(data_source.id)
            )
        elif data_source.type in ["bigquery", "snowflake"]:
            executor = QueryExecutor(
                ds_type=data_source.type,
                config=data_source.config,
                data_source_id=str(data_source.id)
            )
        else: # postgresql, mysql, mongodb
            connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
            executor = QueryExecutor(
                connection_string,
                ds_type=data_source.type,
                data_source_id=str(data_source.id),
                config=data_source.config
            )
            
        schema_info = executor.get_schema_info()
        table_names = executor.get_table_names()
        
        if not table_names:
            detail = "No tables found in the database" if data_source.type != "mongodb" else "No collections found in MongoDB"
            raise HTTPException(status_code=400, detail=detail)
        
        # Incorporate global filters into the natural language question for the LLM
        refined_question = request.question
        if request.filters:
            filter_strs = []
            for col, val in request.filters.items():
                if val:
                    if col == "__date_range":
                        refined_question += f" for the period {val}"
                    else:
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
        
        sql_result = llm_service.generate_sql(
            refined_question, 
            schema_info, 
            table_names, 
            conversation_history,
            db_type=data_source.type,
            data_source_id=data_source.id
        )
        if not sql_result.sql_query:
            raise HTTPException(status_code=400, detail=f"LLM Error: {sql_result.explanation}")

        # Phase 3A: Read-Only Enforcement (SQL only)
        if data_source.type != "mongodb":
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
            
        # Audit log the execution (we'll update this with real numbers after execution)
        AuditLogger.log_query(
            db=db,
            user_id=str(current_user.id),
            sql=sql_result.sql_query,
            workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
            token_count=sql_result.token_usage
        )

        # Phase 7.1: Query Result Caching (Enterprise Layer)
        cached_data = await cache_service.get_query_result(str(data_source.id), sql_result.sql_query)
        
        if cached_data:
            # We still want to log that a cached query happened
            log_entry = AuditLogger.log_event(
                db=db,
                user_id=str(current_user.id),
                action="query_cache_hit",
                workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
                details={"question": request.question, "sql": sql_result.sql_query}
            )
            # Reconstruct QueryResponse from cache
            resp = QueryResponse(**cached_data)
            resp.is_cached = True
            if log_entry:
                resp.audit_log_id = log_entry.id
            return resp

        # Phase 7.1: Background Execution
        if request.run_async:
            job_id = await background_executor.create_job()
            
            # Prepare response template (static metadata)
            response_template = {
                "sql_query": sql_result.sql_query,
                "explanation": sql_result.explanation,
                "results": [],
                "row_count": 0,
                "chart_recommendation": ChartRecommendation(chart_type="table"),
                "execution_time_ms": 0,
                "confidence": sql_result.confidence,
                "job_id": job_id,
                "status": "processing"
            }
            
            # Offload to background helper
            background_executor.start_query_task(job_id, executor, sql_result.sql_query, response_template)
            
            return QueryResponse(**response_template)

        try:
            results, execution_time = executor.execute_query(sql_result.sql_query)
        except Exception as e:
            # Phase 8.3: Self-Healing Logic
            error_msg = str(e)
            logger.warning(f"Query failed, attempting self-healing: {error_msg}")
            
            from app.services.query_healer import query_healer
            fixed_sql, fix_explanation = query_healer.heal_query(
                request.question,
                sql_result.sql_query,
                error_msg,
                schema_info,
                db_type=data_source.type
            )
            
            if fixed_sql and fixed_sql != sql_result.sql_query:
                try:
                    logger.info(f"Retrying with fixed SQL: {fixed_sql}")
                    results, execution_time = executor.execute_query(fixed_sql)
                    
                    # Update sql_result so the rest of the logic uses the fixed query
                    sql_result.sql_query = fixed_sql
                    sql_result.explanation = f"Query was automatically fixed. Original error: {error_msg}. \n\nFix: {fix_explanation}"
                    
                    # Mark as healed in response
                    requires_heal_flag = True 
                    original_error_msg = error_msg
                except Exception as retry_err:
                    logger.error(f"Self-healing failed: {str(retry_err)}")
                    raise HTTPException(status_code=400, detail=f"Query failed and could not be auto-fixed. Error: {error_msg}")
            else:
                raise HTTPException(status_code=400, detail=f"Database Error: {error_msg}")
        
        # Apply PII Masking
        settings = get_settings()
        results = PIIMasker.mask_results(results, enabled=settings.enable_pii_masking)
        
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
            confidence=sql_result.confidence,
            is_healed=requires_heal_flag,
            original_error=original_error_msg
        )

        # Final audit log update with execution time
        log_entry = AuditLogger.log_event(
            db=db,
            user_id=str(current_user.id),
            action="query_complete",
            workspace_id=str(data_source.workspace_id) if data_source.workspace_id else None,
            details={"sql": sql_result.sql_query, "row_count": len(results)},
            token_count=sql_result.token_usage,
            response_time_ms=int(execution_time)
        )
        
        if log_entry:
            response_data.audit_log_id = log_entry.id
        
        # Store in cache for future recurring performance
        await cache_service.set_query_result(str(data_source.id), sql_result.sql_query, response_data.dict())

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
    # Get data source
    ds = db.query(DataSource).get(request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
        
    # Permission check: Owner or Editor in workspace
    if ds.user_id != current_user.id:
        if not ds.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, ds.workspace_id, required_role="editor")

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

    # Create first version
    first_version = SavedQueryVersion(
        saved_query_id=saved.id,
        version_number=1,
        sql_query=saved.generated_sql or "",
        natural_language_query=saved.natural_language_query,
        chart_settings={"chart_type": saved.chart_type},
        created_by_id=current_user.id
    )
    db.add(first_version)
    db.commit()

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
    query = db.query(SavedQuery).get(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    # Permission check: Owner or has workspace access
    if query.user_id != current_user.id:
        ds = db.query(DataSource).get(query.data_source_id)
        if not ds or not ds.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, ds.workspace_id, required_role="viewer")
        
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


# --- Query Versioning (Time Machine) Endpoints ---

@router.get("/saved-queries/{query_id}/versions", response_model=List[SavedQueryVersionResponse])
async def list_query_versions(
    query_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List historical versions of a saved query"""
    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    return db.query(SavedQueryVersion).filter(
        SavedQueryVersion.saved_query_id == query_id
    ).order_by(SavedQueryVersion.version_number.desc()).all()


@router.post("/saved-queries/{query_id}/revert/{version_id}", response_model=SavedQueryResponse)
async def revert_query_version(
    query_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revert a saved query to a specific historical version"""
    query = db.query(SavedQuery).filter(
        SavedQuery.id == query_id,
        SavedQuery.user_id == current_user.id
    ).first()
    
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    version = db.query(SavedQueryVersion).filter(
        SavedQueryVersion.id == version_id,
        SavedQueryVersion.saved_query_id == query_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    # Revert query fields
    query.generated_sql = version.sql_query
    query.natural_language_query = version.natural_language_query
    if version.chart_settings:
        query.chart_type = version.chart_settings.get("chart_type")
    
    # Create a NEW version record for the revert action itself to maintain complete audit trail
    # We increment from current max
    last_v = db.query(SavedQueryVersion).filter(
        SavedQueryVersion.saved_query_id == query.id
    ).order_by(SavedQueryVersion.version_number.desc()).first()
    
    new_v = SavedQueryVersion(
        saved_query_id=query.id,
        version_number=(last_v.version_number + 1) if last_v else 1,
        sql_query=query.generated_sql,
        natural_language_query=query.natural_language_query,
        chart_settings={"chart_type": query.chart_type, "reverted_from_version": version.version_number},
        created_by_id=current_user.id
    )
    
    db.add(new_v)
    db.commit()
    db.refresh(query)
    return query


@router.put("/saved-queries/{query_id}", response_model=SavedQueryResponse)
async def update_saved_query(
    query_id: UUID,
    request: SavedQueryCreate, # Reuse create schema for update
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a saved query and create a new version"""
    query = db.query(SavedQuery).get(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    # Permission check: Owner or has editor workspace access
    if query.user_id != current_user.id:
        ds = db.query(DataSource).get(query.data_source_id)
        if not ds or not ds.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied")
        RBACService.check_permission(db, current_user.id, ds.workspace_id, required_role="editor")
        
    # Update fields
    query.name = request.name
    query.natural_language_query = request.natural_language_query
    query.generated_sql = request.generated_sql
    query.chart_type = request.chart_type
    
    # Create new version
    last_v = db.query(SavedQueryVersion).filter(
        SavedQueryVersion.saved_query_id == query.id
    ).order_by(SavedQueryVersion.version_number.desc()).first()
    
    new_v = SavedQueryVersion(
        saved_query_id=query.id,
        version_number=(last_v.version_number + 1) if last_v else 1,
        sql_query=query.generated_sql,
        natural_language_query=query.natural_language_query,
        chart_settings={"chart_type": query.chart_type},
        created_by_id=current_user.id
    )
    
    db.add(new_v)
    db.commit()
    db.refresh(query)
    
    return query


@router.get("/jobs/{job_id}", response_model=QueryJobStatus)
async def get_query_job_status(job_id: str):
    """Poll for the status and results of a background query"""
    job = await background_executor.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return QueryJobStatus(**job)
