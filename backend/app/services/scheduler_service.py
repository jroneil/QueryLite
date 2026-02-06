import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.database import SessionLocal
from app.db.models import DataSource, SavedQuery, ScheduledReport, AlertRule, DataAnomalyAlert
from app.services.encryption import decrypt_connection_string
from app.services.notifications.email_service import SMTPEmailProvider
from app.services.query_executor import QueryExecutor
from app.services.notification_integrations import SlackWebhookClient, TeamsWebhookClient
from app.services.anomaly_detector import AnomalyDetector

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
            
            # Add Global Alert & Anomaly Evaluation Job (Runs every hour)
            self.scheduler.add_job(
                self.evaluate_alerts_and_anomalies,
                CronTrigger(minute=0), # Top of every hour
                id="global_intelligence_job",
                replace_existing=True
            )
            
            logger.info(f"Loaded {len(active_reports)} reports and initialized Intelligence Engine.")
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
                if data_source.type == "duckdb":
                    executor = QueryExecutor(
                        ds_type="duckdb", 
                        file_path=data_source.file_path, 
                        data_source_id=str(data_source.id)
                    )
                else:
                    connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
                    executor = QueryExecutor(
                        connection_string, 
                        data_source_id=str(data_source.id)
                    )
                results, _ = executor.execute_query(saved_query.generated_sql)
                executor.close()
            except Exception as e:
                logger.error(f"SQL Execution failed for report {report_id}: {e}")
                return

            # 4. Deliver Report
            success = False
            if report.channel_type == "email" or not report.channel_type:
                success = await self.email_provider.send_report(
                    recipients=report.recipient_emails,
                    report_name=report.name,
                    query_text=saved_query.natural_language_query,
                    results=results,
                    chart_type=saved_query.chart_type
                )
            elif report.channel_type == "slack":
                if report.channel_webhook:
                    summary_text = f"Analyzed {len(results)} records from {data_source.name}."
                    success = await SlackWebhookClient.send_message(
                        webhook_url=report.channel_webhook,
                        text=f"*Scheduled Report:* {report.name}\n_Query: {saved_query.natural_language_query}_",
                        title=f"QueryLite Insight: {report.name}",
                        data_summary=summary_text
                    )
                else:
                    logger.error(f"Slack webhook missing for report {report_id}")
            elif report.channel_type == "teams":
                if report.channel_webhook:
                    success = await TeamsWebhookClient.send_message(
                        webhook_url=report.channel_webhook,
                        text=f"The scheduled report '{report.name}' has been executed. It captured {len(results)} rows based on your inquiry: '{saved_query.natural_language_query}'.",
                        title=f"QueryLite Report: {report.name}"
                    )
                else:
                    logger.error(f"Teams webhook missing for report {report_id}")

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

    async def evaluate_alerts_and_anomalies(self):
        """Background task to process smart alerts and scan for anomalies"""
        logger.info("Executing global intelligence scan (Alerts & Anomalies)...")
        db = SessionLocal()
        try:
            # 1. Process Threshold Alerts
            active_rules = db.query(AlertRule).filter(AlertRule.is_active).all()
            for rule in active_rules:
                try:
                    await self._evaluate_single_alert(rule, db)
                except Exception as e:
                    logger.error(f"Failed to evaluate alert rule {rule.id}: {e}")
            
            logger.info("Intelligence scan complete.")
        except Exception as e:
            logger.error(f"Error in evaluate_alerts_and_anomalies: {e}")
        finally:
            db.close()

    async def _evaluate_single_alert(self, rule: AlertRule, db):
        """Internal logic to check a single threshold rule"""
        query = db.query(SavedQuery).get(rule.saved_query_id)
        if not query: return
        
        data_source = db.query(DataSource).get(query.data_source_id)
        if not data_source: return

        # Execute Query
        try:
            if data_source.type == "duckdb":
                executor = QueryExecutor(ds_type="duckdb", file_path=data_source.file_path, data_source_id=str(data_source.id))
            else:
                conn = decrypt_connection_string(data_source.connection_string_encrypted)
                executor = QueryExecutor(conn, data_source_id=str(data_source.id))
            
            results, _ = executor.execute_query(query.generated_sql)
            executor.close()
        except Exception as e:
            logger.error(f"SQL failed for alert {rule.name}: {e}")
            return

        if not results: return

        # 1. Check for Threshold Triggers
        latest_val = None
        # Try to find the value in the first row per the condition_col
        if results and rule.condition_col in results[0]:
            try:
                latest_val = float(results[0][rule.condition_col])
            except (ValueError, TypeError):
                pass

        if latest_val is not None:
            triggered = AnomalyDetector.check_threshold(latest_val, rule.operator, rule.threshold)
            
            if triggered:
                logger.info(f"ALERT TRIGGERED: {rule.name} (Val: {latest_val} {rule.operator} {rule.threshold})")
                await self._deliver_alert_notification(rule, query, latest_val)
                
            rule.last_evaluated_at = datetime.now()
            db.commit()

        # 2. Check for Statistical Anomalies in the result set
        # We auto-scan numeric columns for anomalies
        numeric_cols = [k for k, v in results[0].items() if isinstance(v, (int, float))]
        for col in numeric_cols:
            anomalies = AnomalyDetector.detect_anomalies(results, col)
            if anomalies:
                # Create Anomaly Alert in DB
                new_anomaly = DataAnomalyAlert(
                    saved_query_id=query.id,
                    severity="high" if any(a['z_score'] > 5 for a in anomalies) else "medium",
                    details={"column": col, "anomalies": anomalies[:5]} # Limit to first 5
                )
                db.add(new_anomaly)
                db.commit()
                logger.info(f"ANOMALY PERSISTED for query {query.name} on column {col}")

    async def _deliver_alert_notification(self, rule: AlertRule, query: SavedQuery, current_val: float):
        """Route alert notifications to specified channels"""
        text = f"🚨 *Alert Triggered:* {rule.name}\n\n*Query:* {query.natural_language_query}\n*Condition:* {rule.condition_col} {rule.operator} {rule.threshold}\n*Current Value:* {current_val}"
        title = f"QueryLite ALERT: {rule.name}"
        
        if rule.channel_type == "slack" and rule.channel_webhook:
            await SlackWebhookClient.send_message(rule.channel_webhook, text, title=title)
        elif rule.channel_type == "teams" and rule.channel_webhook:
            await TeamsWebhookClient.send_message(rule.channel_webhook, text, title=title)
        elif rule.channel_type == "email":
            # Reuse email provider for simple text alert
            user = rule.owner
            if user:
                await self.email_provider.send_email(
                    recipients=[user.email],
                    subject=title,
                    body=text.replace("*", "").replace("🚨", "") # Strip markdown for plain email
                )

# Singleton instance
scheduler_service = ReportScheduler()
