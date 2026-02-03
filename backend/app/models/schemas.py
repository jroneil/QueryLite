"""
Pydantic schemas for API request/response models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


# User Schemas
class UserCreate(BaseModel):
    """Schema for user registration"""
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$")
    name: Optional[str] = None
    password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    """Schema for user response"""
    id: UUID
    email: str
    name: Optional[str]
    image: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for authentication token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for token payload"""
    email: Optional[str] = None


# Data Source Schemas
class DataSourceCreate(BaseModel):
    """Schema for creating a new data source"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    connection_string: str = Field(..., min_length=1)


class DataSourceResponse(BaseModel):
    """Schema for data source response"""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Saved Query Schemas
class SavedQueryCreate(BaseModel):
    """Schema for saving a query"""
    name: str = Field(..., min_length=1, max_length=255)
    data_source_id: UUID
    natural_language_query: str
    generated_sql: Optional[str] = None
    chart_type: Optional[str] = None


class SavedQueryResponse(BaseModel):
    """Schema for saved query response"""
    id: UUID
    user_id: UUID
    data_source_id: UUID
    name: str
    natural_language_query: str
    generated_sql: Optional[str]
    chart_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DataSourceTestResult(BaseModel):
    """Schema for connection test result"""
    success: bool
    message: str
    tables: Optional[List[str]] = None


# Query Schemas
class QueryRequest(BaseModel):
    """Schema for natural language query request"""
    question: str = Field(..., min_length=1)
    data_source_id: UUID


class QueryHistoryResponse(BaseModel):
    """Schema for query history item"""
    id: UUID
    data_source_id: UUID
    natural_language_query: str
    generated_sql: Optional[str]
    chart_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SQLGenerationResult(BaseModel):
    """Schema for structured LLM SQL generation output"""
    sql_query: str
    explanation: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ChartRecommendation(BaseModel):
    """Schema for chart type recommendation"""
    chart_type: str = Field(..., pattern="^(bar|line|donut|table)$")
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    category_column: Optional[str] = None
    value_column: Optional[str] = None


class QueryResponse(BaseModel):
    """Schema for query response with results and chart recommendation"""
    sql_query: str
    explanation: str
    results: List[dict[str, Any]]
    row_count: int
    chart_recommendation: ChartRecommendation
    execution_time_ms: float


class SchemaInfo(BaseModel):
    """Schema for database schema information"""
    tables: List[dict[str, Any]]
