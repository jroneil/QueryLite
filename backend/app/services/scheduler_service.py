import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.database import SessionLocal
from app.db.models import DataSource, SavedQuery, ScheduledReport
from app.services.encryption import decrypt_connection_string
from app.services.notifications.email_service import SMTPEmailProvider
from app.services.query_executor import QueryExecutor

logger = logging.getLogger(__name__)

class ReportScheduler:
    """Service to handle background execution of scheduled reports"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.email_provider = SMTPEmailProvider()

    def start(self):
        """Start the scheduler and load existing schedules"""
        if not self.scheduler.running:
            logger.info("Starting Report Scheduler...")
            self.scheduler.start()
            self.sync_schedules()

    def shutdown(self):
        """Gracefully shutdown the scheduler"""
        if self.scheduler.running:
            logger.info("Shutting down Report Scheduler...")
            self.scheduler.shutdown()

    def sync_schedules(self):
        """Synchronize APScheduler jobs with the database"""
        logger.info("Synchronizing report schedules from database...")
        # Remove all existing jobs to start fresh
        self.scheduler.remove_all_jobs()
        
        db = SessionLocal()
        try:
            active_reports = db.query(ScheduledReport).filter(ScheduledReport.is_active).all()
            for report in active_reports:
                self.add_report_job(report)
            logger.info(f"Loaded {len(active_reports)} active schedules.")
        except Exception as e:
            logger.error(f"Error synchronizing schedules: {e}")
        finally:
            db.close()

    def add_report_job(self, report: ScheduledReport):
        """Add a specific report to the APScheduler"""
        try:
            self.scheduler.add_job(
                self.execute_report,
                CronTrigger.from_crontab(report.schedule_cron),
                id=str(report.id),
                args=[str(report.id)],
                replace_existing=True,
                misfire_grace_time=3600 # 1 hour grace
            )
        except Exception as e:
            logger.error(f"Failed to add job for report {report.id}: {e}")

    def remove_report_job(self, report_id: str):
        """Remove a job from the scheduler"""
        try:
            if self.scheduler.get_job(report_id):
                self.scheduler.remove_job(report_id)
        except Exception as e:
            logger.error(f"Error removing job {report_id}: {e}")

    async def execute_report(self, report_id: str):
        """Task executed by the scheduler for a specific report"""
        logger.info(f"Executing scheduled report: {report_id}")
        db = SessionLocal()
        try:
            # 1. Fetch Report Metadata
            report = db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()
            if not report or not report.is_active:
                logger.warning(f"Report {report_id} not found or inactive, skipping.")
                return

            # 2. Fetch Query and Data Source
            saved_query = db.query(SavedQuery).filter(SavedQuery.id == report.saved_query_id).first()
            if not saved_query:
                logger.error(f"Saved query {report.saved_query_id} not found for report {report_id}")
                return
            
            data_source = db.query(DataSource).filter(DataSource.id == saved_query.data_source_id).first()
            if not data_source:
                logger.error(f"Data source not found for query {saved_query.id}")
                return

            # 3. Execute SQL Query
            try:
                connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
                executor = QueryExecutor(connection_string, data_source_id=str(data_source.id))
                results, _ = executor.execute_query(saved_query.generated_sql)
                executor.close()
            except Exception as e:
                logger.error(f"SQL Execution failed for report {report_id}: {e}")
                return

            # 4. Deliver Report
            success = await self.email_provider.send_report(
                recipients=report.recipient_emails,
                report_name=report.name,
                query_text=saved_query.natural_language_query,
                results=results,
                chart_type=saved_query.chart_type
            )

            if success:
                # 5. Update last run timestamp
                report.last_run_at = datetime.now()
                db.commit()
                logger.info(f"Successfully delivered report {report_id}")
            else:
                logger.error(f"Failed to deliver report {report_id}")
                
        except Exception as e:
            logger.error(f"Unexpected error in execute_report for {report_id}: {e}")
        finally:
            db.close()

# Singleton instance
scheduler_service = ReportScheduler()
