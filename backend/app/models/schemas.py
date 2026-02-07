"""
Pydantic schemas for API request/response models
"""

import json
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
    connection_string: Optional[str] = None
    type: str = "postgresql" # postgresql, duckdb, mongodb, bigquery, snowflake
    file_path: Optional[str] = None
    config: Optional[dict] = None # Added for Enterprise warehouses
    workspace_id: Optional[UUID] = None


class DataSourceResponse(BaseModel):
    """Schema for data source response"""
    id: UUID
    user_id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    description: Optional[str]
    type: str
    file_path: Optional[str] = None
    config: Optional[dict] = None # Added for Enterprise warehouses
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# SSO Schemas
class SSOConfigCreate(BaseModel):
    """Schema for creating workspace SSO config"""
    provider_name: str
    issuer_url: str
    client_id: str
    client_secret: str
    domain_allowlist: Optional[List[str]] = None
    group_mapping: Optional[dict] = None


class SSOConfigResponse(BaseModel):
    """Schema for SSO config response"""
    id: UUID
    workspace_id: UUID
    provider_name: str
    issuer_url: str
    client_id: str
    domain_allowlist: Optional[List[str]] = None
    group_mapping: Optional[dict] = None
    is_active: bool
    created_at: datetime

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
    filters: Optional[dict[str, Any]] = None
    thread_id: Optional[UUID] = None # Added for Phase 6.1
    run_async: bool = False # Flag to explicitly request background execution


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
    requires_confirmation: bool = False
    token_usage: Optional[int] = None


class ChartRecommendation(BaseModel):
    """Schema for chart type recommendation"""
    chart_type: str = Field(..., pattern="^(bar|line|donut|area|table)$")
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
    confidence: float
    requires_confirmation: bool = False
    refinement_suggestion: Optional[str] = None
    audit_log_id: Optional[UUID] = None
    job_id: Optional[str] = None # Added for Phase 7.1
    status: str = "completed" # completed, processing, failed
    is_cached: bool = False # Flag for performance telemetry
    is_healed: bool = False # Flag for Phase 8.3
    original_error: Optional[str] = None # Original error before healing


class FeedbackSubmission(BaseModel):
    """Schema for submitting feedback on a query"""
    score: int = Field(..., ge=-1, le=1) # -1, 0, or 1


class QueryJobStatus(BaseModel):
    """Schema for polling background query status"""
    job_id: str
    status: str # processing, completed, failed
    progress: int = 0
    result: Optional[QueryResponse] = None
    error: Optional[str] = None


class SchemaInfo(BaseModel):
    """Schema for database schema information"""
    tables: List[dict[str, Any]]


class WorkspaceThemeBase(BaseModel):
    primary_color: str = Field("#7c3aed", pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
    secondary_color: str = Field("#4f46e5", pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
    logo_url: Optional[str] = None
    dark_mode: bool = True

class WorkspaceThemeCreate(WorkspaceThemeBase):
    pass

class WorkspaceThemeResponse(WorkspaceThemeBase):
    id: UUID
    workspace_id: UUID

    class Config:
        from_attributes = True

class AdminMetrics(BaseModel):
    total_queries: int
    active_data_sources: int
    member_count: int
    role_distribution: dict[str, int]
    storage_usage_bytes: int = 0

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_enabled: bool = False

class WebhookUpdate(BaseModel):
    webhook_url: Optional[str]
    webhook_enabled: bool


class WorkspaceMemberResponse(BaseModel):
    """Schema for workspace member info"""
    user_id: UUID
    email: str
    name: Optional[str] = None
    role: str # admin, editor, viewer

    class Config:
        from_attributes = True


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    owner_id: UUID
    webhook_url: Optional[str] = None
    webhook_enabled: bool = False
    created_at: datetime
    members: List[WorkspaceMemberResponse] = []
    theme: Optional[WorkspaceThemeResponse] = None

    class Config:
        from_attributes = True


# Comment Schemas
class CommentCreate(BaseModel):
    """Schema for creating a new comment"""
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: UUID
    user_id: UUID
    saved_query_id: UUID
    content: str
    created_at: datetime
    user_name: Optional[str] = None # Added via property or join

    class Config:
        from_attributes = True


# Scheduled Report Schemas
class ScheduledReportCreate(BaseModel):
    """Schema for creating a new scheduled report"""
    name: str = Field(..., min_length=1, max_length=255)
    saved_query_id: UUID
    schedule_cron: str = Field(..., min_length=5)
    recipient_emails: List[str] # Expecting a list from the frontend
    channel_type: Optional[str] = "email" # email, slack, teams
    channel_webhook: Optional[str] = None
    is_active: bool = True

    @field_validator("recipient_emails", mode="before")
    @classmethod
    def validate_recipient_emails(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return [email.strip() for email in v.split(",") if email.strip()]
        return v


class ScheduledReportResponse(BaseModel):
    """Schema for scheduled report response"""
    id: UUID
    owner_id: UUID
    saved_query_id: UUID
    name: str
    schedule_cron: str
    recipient_emails: List[str]
    is_active: bool
    channel_type: str
    channel_webhook: Optional[str]
    last_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    @field_validator("recipient_emails", mode="before")
    @classmethod
    def validate_recipient_emails(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                # Fallback for comma-separated strings if JSON parsing fails
                return [email.strip() for email in v.split(",") if email.strip()]
        return v

    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardPanelBase(BaseModel):
    saved_query_id: UUID
    title_override: Optional[str] = None
    grid_x: int = 0
    grid_y: int = 0
    grid_w: int = 4
    grid_h: int = 3

class DashboardPanelCreate(DashboardPanelBase):
    pass

class DashboardPanelResponse(DashboardPanelBase):
    id: UUID
    dashboard_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    workspace_id: Optional[UUID] = None
    is_public: bool = True

class DashboardCreate(DashboardBase):
    pass

    class Config:
        from_attributes = True


# Insight Schemas (Phase 5)
class ChartNarrativeRequest(BaseModel):
    """Schema for requesting a narrative for a single chart"""
    data: List[dict[str, Any]]
    chart_type: str
    question: str
    explanation: Optional[str] = None


class DashboardNarrativeRequest(BaseModel):
    """Schema for requesting an aggregate narrative for a dashboard"""
    dashboard_id: UUID


class NarrativeResponse(BaseModel):
    """Schema for AI-generated narrative response"""
    narrative: str
    generated_at: datetime


# Dashboard Filter Schemas (Phase 5)
class DashboardFilterBase(BaseModel):
    filter_type: str = Field(..., pattern="^(date_range|category)$")
    column_name: str
    label: str
    default_value: Optional[str] = None


class DashboardFilterCreate(DashboardFilterBase):
    pass


class DashboardFilterResponse(DashboardFilterBase):
    id: UUID
    dashboard_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Updated Dashboard Schemas to include filters
class DashboardResponse(DashboardBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    panels: List[DashboardPanelResponse] = []
    filters: List[DashboardFilterResponse] = []

    class Config:
        from_attributes = True

# Conversational Memory Schemas (Phase 6.1)
class ThreadMessageCreate(BaseModel):
    role: str # "user" | "assistant"
    content: str
    sql_query: Optional[str] = None
    chart_recommendation: Optional[ChartRecommendation] = None


class ThreadMessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    role: str
    content: str
    sql_query: Optional[str]
    chart_recommendation: Optional[ChartRecommendation] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationThreadCreate(BaseModel):
    data_source_id: UUID
    title: str
    workspace_id: Optional[UUID] = None


class ConversationThreadResponse(BaseModel):
    id: UUID
    user_id: UUID
    data_source_id: UUID
    workspace_id: Optional[UUID]
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ThreadMessageResponse] = []

    class Config:
        from_attributes = True


class ThreadUpdate(BaseModel):
    title: str


class SavedQueryVersionResponse(BaseModel):
    """Schema for saved query version history"""
    id: UUID
    saved_query_id: UUID
    version_number: int
    sql_query: str
    natural_language_query: str
    chart_settings: Optional[dict[str, Any]] = None
    created_at: datetime
    created_by_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# Alert Schemas (Phase 7.2)
class AlertRuleCreate(BaseModel):
    """Schema for creating a new alert rule"""
    name: str = Field(..., min_length=1, max_length=255)
    saved_query_id: UUID
    condition_col: str
    operator: str # gt, lt, eq, pct_change
    threshold: float
    channel_type: Optional[str] = "email"
    channel_webhook: Optional[str] = None
    is_active: bool = True


class AlertRuleResponse(BaseModel):
    """Schema for alert rule response"""
    id: UUID
    owner_id: UUID
    saved_query_id: UUID
    name: str
    condition_col: str
    operator: str
    threshold: float
    channel_type: str
    channel_webhook: Optional[str]
    is_active: bool
    last_evaluated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataAnomalyAlertResponse(BaseModel):
    """Schema for anomaly alert response"""
    id: UUID
    saved_query_id: UUID
    severity: str
    details: Optional[dict[str, Any]]
    is_acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Forecast Schemas (Phase 7.3)
class ForecastRequest(BaseModel):
    """Schema for requesting a time-series forecast"""
    date_col: str
    value_col: str
    periods: int = 7
    data: Optional[List[dict[str, Any]]] = None # Optional: can provide raw data or use saved_query_id
    saved_query_id: Optional[UUID] = None

class ForecastProjection(BaseModel):
    """Schema for a single projected data point"""
    index: int
    value: float

class ForecastResponse(BaseModel):
    """Schema for forecasting results"""
    method: str
    projections: List[ForecastProjection]
    trend: str # up, down, stable
    slope: Optional[float] = None
    intercept: Optional[float] = None
    error: Optional[str] = None


# Discovery Schemas (Phase 7.3)
class DiscoveryInsight(BaseModel):
    """Schema for a single discovered insight"""
    type: str # trend, peak, volatility
    severity: str # low, medium, high
    message: str
    metadata: Optional[dict[str, Any]] = None

class DiscoveryResponse(BaseModel):
    """Schema for a collection of discovered insights"""
    insights: List[DiscoveryInsight]
    saved_query_id: UUID
    generated_at: datetime
