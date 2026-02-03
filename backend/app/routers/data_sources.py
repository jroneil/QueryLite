"""
Data Sources router - CRUD operations for database connections
"""

from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DataSource
from app.models.schemas import DataSourceCreate, DataSourceResponse, DataSourceTestResult
from app.services.encryption import encrypt_connection_string, decrypt_connection_string
from app.services.query_executor import QueryExecutor

from app.routers.auth_deps import get_current_user
from app.db.models import User

router = APIRouter()


@router.post("/", response_model=DataSourceResponse)
async def create_data_source(
    data_source: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new data source connection"""
    # Encrypt the connection string
    encrypted = encrypt_connection_string(data_source.connection_string)
    
    # Create database record
    db_data_source = DataSource(
        user_id=current_user.id,
        name=data_source.name,
        description=data_source.description,
        connection_string_encrypted=encrypted
    )
    
    db.add(db_data_source)
    db.commit()
    db.refresh(db_data_source)
    
    return db_data_source


@router.get("/", response_model=List[DataSourceResponse])
async def list_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all data source connections for the current user"""
    return db.query(DataSource).filter(DataSource.user_id == current_user.id).order_by(DataSource.created_at.desc()).all()


@router.get("/{data_source_id}", response_model=DataSourceResponse)
async def get_data_source(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific data source by ID"""
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return data_source


@router.delete("/{data_source_id}")
async def delete_data_source(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a data source connection"""
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    db.delete(data_source)
    db.commit()
    
    return {"message": "Data source deleted successfully"}


@router.post("/{data_source_id}/test", response_model=DataSourceTestResult)
async def test_data_source_connection(
    data_source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test a data source connection"""
    data_source = db.query(DataSource).filter(
        DataSource.id == data_source_id,
        DataSource.user_id == current_user.id
    ).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    try:
        # Decrypt connection string
        connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
        
        # Test connection
        executor = QueryExecutor(connection_string)
        success, message, tables = executor.test_connection()
        executor.close()
        
        return DataSourceTestResult(
            success=success,
            message=message,
            tables=tables if success else None
        )
    except Exception as e:
        return DataSourceTestResult(
            success=False,
            message=f"Error testing connection: {str(e)}",
            tables=None
        )

