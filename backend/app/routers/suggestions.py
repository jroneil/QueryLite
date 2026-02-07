from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from app.routers.auth_deps import get_current_user
from app.db.models import User
from app.services.suggestion_service import suggestion_service

router = APIRouter()

@router.get("/autocomplete", response_model=List[str])
async def get_autocomplete(
    q: str = Query(..., min_length=2),
    workspace_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """Get natural language query suggestions as the user types"""
    return suggestion_service.get_autocomplete_suggestions(q, workspace_id)

@router.get("/popular", response_model=List[str])
async def get_popular(
    data_source_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """Get popular queries for a specific data source or globally"""
    return suggestion_service.get_popular_queries(data_source_id)
