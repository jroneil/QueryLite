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
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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
    webhook_url = Column(String(512), nullable=True)
    webhook_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    data_sources = relationship("DataSource", back_populates="workspace", cascade="all, delete-orphan")


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
    type = Column(String(50), nullable=False, default="postgresql") # postgresql, duckdb
    connection_string_encrypted = Column(Text, nullable=True) # Nullable for local files
    file_path = Column(Text, nullable=True) # Path to local CSV/Excel file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="data_sources")
    workspace = relationship("Workspace", back_populates="data_sources")
    queries = relationship("QueryHistory", back_populates="data_source", cascade="all, delete-orphan")


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


class AuditLog(Base):
    """Model for security and compliance audit logging"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    action = Column(String(255), nullable=False) # query_execution, data_source_create, member_invite, etc.
    details = Column(Text, nullable=True) # Store JSON or raw SQL executed
    ip_address = Column(String(50), nullable=True)
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
