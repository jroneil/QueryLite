"""
Local Files Router - Handles upload and management of local CSV/Excel files for analysis via DuckDB
"""
import os
import shutil
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DataSource, User, Workspace
from app.models.schemas import DataSourceResponse
from app.routers.auth_deps import get_current_user

router = APIRouter(prefix="/local-files", tags=["Local Files"])

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@router.post("/upload", response_model=DataSourceResponse)
async def upload_local_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    workspace_id: Optional[uuid.UUID] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a local file (CSV, Excel, Parquet) and register it as a DuckDB data source
    """
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".parquet"]:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload CSV, Excel, or Parquet."
        )

    # If workspace specified, verify membership
    if workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        # In a real app, we'd check if user has 'editor' permissions here
        # For now, we allow any member of a workspace to connect data if RBAC allows

    # Generate unique filename to avoid collisions
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    file_path = os.path.abspath(os.path.join(UPLOAD_DIR, filename))
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create data source entry in database
    # For DuckDB, we store the absolute file path in the file_path column
    new_ds = DataSource(
        user_id=current_user.id,
        workspace_id=workspace_id,
        name=name,
        description=description,
        type="duckdb",
        file_path=file_path,
        connection_string_encrypted="" # Dummy value, not used for DuckDB
    )
    
    db.add(new_ds)
    db.commit()
    db.refresh(new_ds)
    
    return new_ds
