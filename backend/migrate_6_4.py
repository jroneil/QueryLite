"""
Manual Migration Script for Phase 6.4
Adds missing columns to existing PostgreSQL tables.
"""

from sqlalchemy import text
from app.db.database import engine, SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    logger.info("Starting manual migration for Phase 6.4...")
    
    # We use raw SQL for ALTER TABLE since create_all doesn't handle existing tables
    commands = [
        # Workspaces
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slack_webhook_url VARCHAR(512);",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS teams_webhook_url VARCHAR(512);",
        
        # Audit Logs
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS feedback_score INTEGER;",
        
        # Scheduled Reports
        "ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50) DEFAULT 'email';",
        "ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS channel_webhook VARCHAR(512);",
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                logger.info(f"Executing: {cmd}")
                conn.execute(text(cmd))
                conn.commit()
            except Exception as e:
                logger.error(f"Failed to execute {cmd}: {e}")
    
    logger.info("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
