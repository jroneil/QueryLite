from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class TableRelationship(BaseModel):
    """Represents a foreign key relationship between tables"""
    from_table: str
    from_column: str
    to_table: str
    to_column: str

class EnhancedColumn(BaseModel):
    """Column information with inferred types and constraints"""
    name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    is_foreign_key: bool
    description: Optional[str] = None
    inferred_type: Optional[str] = None # e.g. "email", "url", "date_period"

class EnhancedTable(BaseModel):
    """Table information with enhanced column details and relationships"""
    name: str
    columns: List[EnhancedColumn]
    relationships: List[TableRelationship]
    row_count_estimate: Optional[int] = None

class CachedSchema(BaseModel):
    """Schema snapshot for caching"""
    data_source_id: str
    tables: List[EnhancedTable]
    created_at: datetime
    ttl_seconds: int = 3600
