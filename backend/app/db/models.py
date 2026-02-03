"""
SQLAlchemy database models
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


from sqlalchemy.orm import relationship


class User(Base):
    """Model for storing application users"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    image = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    data_sources = relationship("DataSource", back_populates="user", cascade="all, delete-orphan")
    queries = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")
    saved_queries = relationship("SavedQuery", back_populates="user", cascade="all, delete-orphan")


class DataSource(Base):
    """Model for storing connected data sources"""
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    connection_string_encrypted = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="data_sources")
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

    user = relationship("User", back_populates="saved_queries")

