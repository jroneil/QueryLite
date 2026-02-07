"""
SQLAlchemy database models
"""

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from app.db.database import Base


class User(Base):
    """Model for storing application users"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    image = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    workspaces = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")
    data_sources = relationship("DataSource", back_populates="user", cascade="all, delete-orphan")
    queries = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")
    saved_queries = relationship("SavedQuery", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    scheduled_reports = relationship("ScheduledReport", back_populates="owner", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="owner", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    threads = relationship("ConversationThread", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    """Model for organizational workspaces"""
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    webhook_url = Column(String(512), nullable=True) # General webhook
    webhook_enabled = Column(Boolean, default=False)
    slack_webhook_url = Column(String(512), nullable=True)
    teams_webhook_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    data_sources = relationship("DataSource", back_populates="workspace", cascade="all, delete-orphan")
    theme = relationship("WorkspaceTheme", back_populates="workspace", cascade="all, delete-orphan", uselist=False)


class WorkspaceTheme(Base):
    """Model for workspace-level branding and themes"""
    __tablename__ = "workspace_themes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), unique=True, nullable=False)
    primary_color = Column(String(7), default="#7c3aed")  # Hex color
    secondary_color = Column(String(7), default="#4f46e5")
    logo_url = Column(String(512), nullable=True)
    dark_mode = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="theme")


class WorkspaceMember(Base):
    """Join table for users and workspaces with role-based access"""
    __tablename__ = "workspace_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False, default="viewer") # admin, editor, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspaces")

    @property
    def email(self):
        return self.user.email if self.user else ""

    @property
    def name(self):
        return self.user.name if self.user else ""


class DataSource(Base):
    """Model for storing connected data sources, now scoped to workspaces"""
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True) # Temporarily nullable for migration
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False, default="postgresql") # postgresql, duckdb, mongodb, bigquery, snowflake
    connection_string_encrypted = Column(Text, nullable=True) # Nullable for local files or cloud warehouses
    config = Column(JSON, nullable=True) # For enterprise configs (BigQuery JSON, Snowflake params)
    file_path = Column(Text, nullable=True) # Path to local CSV/Excel file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="data_sources")
    workspace = relationship("Workspace", back_populates="data_sources")
    queries = relationship("QueryHistory", back_populates="data_source", cascade="all, delete-orphan")


class SSOConfig(Base):
    """Model for workspace-level OIDC configuration"""
    __tablename__ = "sso_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, unique=True)
    provider_name = Column(String(100), nullable=False) # e.g. "Okta", "Azure AD"
    issuer_url = Column(String(512), nullable=False)
    client_id = Column(String(255), nullable=False)
    client_secret_encrypted = Column(Text, nullable=False)
    domain_allowlist = Column(JSON, nullable=True) # ["company.com"]
    group_mapping = Column(JSON, nullable=True) # {"admin_group": "admin", "dev_group": "editor"}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace")


class QueryHistory(Base):
    """Model for storing query history"""
    __tablename__ = "query_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    natural_language_query = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    chart_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="queries")
    data_source = relationship("DataSource", back_populates="queries")


class SavedQuery(Base):
    """Model for storing saved queries (favorites)"""
    __tablename__ = "saved_queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    name = Column(String(255), nullable=False)
    natural_language_query = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    chart_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    data_source = relationship("DataSource")
    comments = relationship("Comment", back_populates="saved_query", cascade="all, delete-orphan")
    versions = relationship("SavedQueryVersion", back_populates="saved_query", cascade="all, delete-orphan", order_by="SavedQueryVersion.version_number.desc()")
    alert_rules = relationship("AlertRule", back_populates="saved_query", cascade="all, delete-orphan")
    anomalies = relationship("DataAnomalyAlert", back_populates="saved_query", cascade="all, delete-orphan")


class AuditLog(Base):
    """Model for security and compliance audit logging"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    action = Column(String(255), nullable=False) # query_execution, data_source_create, member_invite, etc.
    details = Column(Text, nullable=True) # Store JSON or raw SQL executed
    ip_address = Column(String(50), nullable=True)
    token_count = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    feedback_score = Column(Integer, nullable=True) # -1 (poor), 0 (neutral), 1 (good)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")


class ScheduledReport(Base):
    """Model for scheduled query reports delivered via email"""
    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    name = Column(String(255), nullable=False)
    schedule_cron = Column(String(100), nullable=False) # Cron expression
    recipient_emails = Column(JSON, nullable=False) # List of strings
    channel_type = Column(String(50), default="email") # email, slack, teams
    channel_webhook = Column(String(512), nullable=True) # Override workspace webhook if set
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="scheduled_reports")
    saved_query = relationship("SavedQuery")


class Comment(Base):
    """Model for comments on saved queries"""
    __tablename__ = "query_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="comments")
    saved_query = relationship("SavedQuery", back_populates="comments")


class Dashboard(Base):
    """Model for dashboards containing multiple query panels"""
    __tablename__ = "dashboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True) # Shared within workspace
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="dashboards")
    workspace = relationship("Workspace")
    panels = relationship("DashboardPanel", back_populates="dashboard", cascade="all, delete-orphan")
    filters = relationship("DashboardFilter", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardFilter(Base):
    """Model for global dashboard filters (e.g. date range, category)"""
    __tablename__ = "dashboard_filters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False)
    filter_type = Column(String(50), nullable=False) # date_range, category
    column_name = Column(String(255), nullable=False) # The column name to filter on
    label = Column(String(255), nullable=False) # User-facing label
    default_value = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dashboard = relationship("Dashboard", back_populates="filters")


class DashboardPanel(Base):
    """Model for individual panels within a dashboard"""
    __tablename__ = "dashboard_panels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    title_override = Column(String(255), nullable=True)
    
    # Layout positioning (grid units)
    grid_x = Column(Integer, default=0)
    grid_y = Column(Integer, default=0)
    grid_w = Column(Integer, default=4)
    grid_h = Column(Integer, default=3)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dashboard = relationship("Dashboard", back_populates="panels")
    saved_query = relationship("SavedQuery")


class ConversationThread(Base):
    """Model for multi-turn conversation threads"""
    __tablename__ = "conversation_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="threads")
    messages = relationship("ThreadMessage", back_populates="thread", cascade="all, delete-orphan", order_by="ThreadMessage.created_at")
    data_source = relationship("DataSource")


class ThreadMessage(Base):
    """Model for individual messages within a conversation thread"""
    __tablename__ = "thread_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("conversation_threads.id"), nullable=False)
    role = Column(String(50), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)    # The text question or explanation
    sql_query = Column(Text, nullable=True)    # The generated SQL if applicable
    chart_recommendation = Column(JSON, nullable=True) # Recommended chart settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    thread = relationship("ConversationThread", back_populates="messages")


class SavedQueryVersion(Base):
    """Model for tracking versions of a saved query (Time Machine)"""
    __tablename__ = "saved_query_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    sql_query = Column(Text, nullable=False)
    natural_language_query = Column(Text, nullable=False)
    chart_settings = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    saved_query = relationship("SavedQuery", back_populates="versions")
    created_by = relationship("User")


class AlertRule(Base):
    """Model for smart threshold-based alerting"""
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    name = Column(String(255), nullable=False)
    condition_col = Column(String(255), nullable=False)
    operator = Column(String(50), nullable=False) # gt, lt, eq, pct_change
    threshold = Column(Float, nullable=False)
    channel_type = Column(String(50), default="email") # email, slack, teams
    channel_webhook = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    last_evaluated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="alert_rules")
    saved_query = relationship("SavedQuery", back_populates="alert_rules")


class DataAnomalyAlert(Base):
    """Model for AI-detected anomalies in time-series data"""
    __tablename__ = "data_anomaly_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_query_id = Column(UUID(as_uuid=True), ForeignKey("saved_queries.id"), nullable=False)
    severity = Column(String(50), default="medium") # low, medium, high
    details = Column(JSON, nullable=True) # JSON with anomalous points
    is_acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    saved_query = relationship("SavedQuery", back_populates="anomalies")


class SchemaEmbedding(Base):
    """Model for storing vector embeddings of schema elements"""
    __tablename__ = "schema_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    element_type = Column(String(50), nullable=False) # table, column
    name = Column(String(255), nullable=False)
    embedding = Column(Vector(1536), nullable=False) # OpenAI text-embedding-3-small uses 1536 dims
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    data_source = relationship("DataSource")


# =============================================================================
# Phase 10: Data Governance & Compliance Models
# =============================================================================


class DataLineageEdge(Base):
    """Model for tracking data lineage relationships between schema elements and queries/dashboards"""
    __tablename__ = "data_lineage_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    source_type = Column(String(50), nullable=False)  # table, column
    source_name = Column(String(255), nullable=False)
    target_type = Column(String(50), nullable=False)  # saved_query, dashboard_panel
    target_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    data_source = relationship("DataSource")


class DeletionRequest(Base):
    """Model for GDPR/CCPA Right to be Forgotten requests"""
    __tablename__ = "deletion_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String(255), nullable=False, index=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    audit_log_id = Column(UUID(as_uuid=True), ForeignKey("audit_logs.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    requested_by = relationship("User")
    audit_log = relationship("AuditLog")


class ColumnPermission(Base):
    """Model for column-level access control and masking rules"""
    __tablename__ = "column_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    column_name = Column(String(255), nullable=False)
    restricted_roles = Column(JSON, default=[])  # ["viewer", "editor"]
    mask_strategy = Column(String(50), default="hide")  # hide, redact_partial, hash
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    data_source = relationship("DataSource")
