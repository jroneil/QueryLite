"""
QueryLite Backend - FastAPI Application
Natural Language to SQL translation service
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import data_sources, query
from app.db.database import engine
from app.db import models as db_models

# Create database tables
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="QueryLite API",
    description="Natural Language to SQL translation service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import data_sources, query, auth

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(data_sources.router, prefix="/api/data-sources", tags=["Data Sources"])
app.include_router(query.router, prefix="/api", tags=["Query"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "querylite-backend"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to QueryLite API", "docs": "/docs"}
