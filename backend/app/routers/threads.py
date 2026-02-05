"""
Threads Router - Management of multi-turn conversation threads
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ConversationThread, DataSource, ThreadMessage, User
from app.models.schemas import (
    ConversationThreadCreate,
    ConversationThreadResponse,
    ThreadUpdate,
)
from app.routers.auth_deps import get_current_user

router = APIRouter(prefix="/threads", tags=["Threads"])

@router.post("/", response_model=ConversationThreadResponse)
async def create_thread(
    thread_data: ConversationThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation thread"""
    # Verify data source ownership
    ds = db.query(DataSource).filter(
        DataSource.id == thread_data.data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    new_thread = ConversationThread(
        user_id=current_user.id,
        data_source_id=thread_data.data_source_id,
        workspace_id=thread_data.workspace_id or ds.workspace_id,
        title=thread_data.title
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    return new_thread

@router.get("/", response_model=List[ConversationThreadResponse])
async def list_threads(
    data_source_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List threads for the current user"""
    query = db.query(ConversationThread).filter(ConversationThread.user_id == current_user.id)
    if data_source_id:
        query = query.filter(ConversationThread.data_source_id == data_source_id)
    
    return query.order_by(ConversationThread.updated_at.desc()).all()

@router.get("/{thread_id}", response_model=ConversationThreadResponse)
async def get_thread_details(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full details of a thread including messages"""
    thread = db.query(ConversationThread).filter(
        ConversationThread.id == thread_id,
        ConversationThread.user_id == current_user.id
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    return thread

@router.patch("/{thread_id}", response_model=ConversationThreadResponse)
async def update_thread(
    thread_id: UUID,
    thread_data: ThreadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update thread metadata (e.g. title)"""
    thread = db.query(ConversationThread).filter(
        ConversationThread.id == thread_id,
        ConversationThread.user_id == current_user.id
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread.title = thread_data.title
    db.commit()
    db.refresh(thread)
    return thread

@router.delete("/{thread_id}")
async def delete_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation thread"""
    thread = db.query(ConversationThread).filter(
        ConversationThread.id == thread_id,
        ConversationThread.user_id == current_user.id
    ).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    db.delete(thread)
    db.commit()
    return {"message": "Thread deleted"}
