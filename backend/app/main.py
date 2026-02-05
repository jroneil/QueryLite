"""
QueryLite Backend - FastAPI Application
Natural Language to SQL translation service
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import models as db_models
from app.db.database import SessionLocal, engine
from app.db.models import User
from app.routers import (
    auth,
    dashboard_filters,
    dashboards,
    data_sources,
    insights,
    local_files,
    query,
    scheduled_reports,
    threads,
    workspaces,
)
from app.services.auth_service import get_password_hash
from app.services.scheduler_service import scheduler_service
from app.middleware.error_handler import error_handler_middleware
from app.middleware.rate_limiter import rate_limit_middleware

# Create database tables
db_models.Base.metadata.create_all(bind=engine)


def seed_dummy_user():
    db = SessionLocal()
    try:
        admin_email = "admin@example.com"
        exists = db.query(User).filter(User.email == admin_email).first()
        if not exists:
            print(f"Creating dummy user: {admin_email}")
            user = User(
                email=admin_email,
                name="Admin User",
                hashed_password=get_password_hash("password")
            )
            db.add(user)
        else:
            print(f"Ensuring dummy user password is correct: {admin_email}")
            exists.hashed_password = get_password_hash("password")
        db.commit()
    finally:
        db.close()

seed_dummy_user()

app = FastAPI(
    title="QueryLite API",
    description="Natural Language to SQL translation service",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    scheduler_service.start()


@app.on_event("shutdown")
async def shutdown_event():
    scheduler_service.shutdown()

# Configure CORS - Must be outermost to ensure headers are added to all responses (including errors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(error_handler_middleware)
app.middleware("http")(rate_limit_middleware)


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(data_sources.router, prefix="/api/data-sources", tags=["Data Sources"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(workspaces.router, prefix="/api", tags=["Workspaces"])
app.include_router(scheduled_reports.router, prefix="/api", tags=["Scheduled Reports"])
app.include_router(dashboards.router, prefix="/api", tags=["Dashboards"])
app.include_router(insights.router, prefix="/api", tags=["Insights"])
app.include_router(dashboard_filters.router, prefix="/api", tags=["Dashboard Filters"])
app.include_router(threads.router, prefix="/api", tags=["Threads"])
app.include_router(local_files.router, prefix="/api", tags=["Local Files"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "querylite-backend"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to QueryLite API", "docs": "/docs"}
