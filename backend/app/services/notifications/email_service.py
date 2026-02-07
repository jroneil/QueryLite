import csv
import io
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, List, Optional

from app.config import get_settings

from .base import BaseNotificationProvider


class SMTPEmailProvider(BaseNotificationProvider):
    """SMTP Implementation of the notification provider"""
    
    async def send_report(self, 
                          recipients: List[str], 
                          report_name: str, 
                          query_text: str, 
                          results: List[dict[str, Any]],
                          chart_type: Optional[str] = None,
                          theme: Optional[dict[str, Any]] = None) -> bool:
        settings = get_settings()
        
        primary_color = theme.get("primary_color", "#6366f1") if theme else "#6366f1"
        logo_url = theme.get("logo_url") if theme else None
        
        if not settings.smtp_host:
            print(f"SMTP not configured, would have sent to: {recipients}")
            return True

        msg = MIMEMultipart()
        msg['Subject'] = f"QueryLite Report: {report_name}"
        msg['From'] = settings.smtp_from
        msg['To'] = ", ".join(recipients)

        logo_html = f'<img src="{logo_url}" height="32" style="margin-bottom: 5px;">' if logo_url else '<h1 style="color: white; margin: 0;">QueryLite</h1>'

        html = f"""
        <html>
            <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: {primary_color}; padding: 20px; text-align: center;">
                        {logo_html}
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #1e293b;">Automated Report: {report_name}</h2>
                        <p>Your scheduled query was executed successfully.</p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid {primary_color}; font-family: monospace;">
                            {query_text}
                        </div>
                        <p style="margin-top: 20px;"><strong>Results:</strong> {len(results)} rows found.</p>
                        <p>The full data set has been attached as a CSV file to this email.</p>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                        Sent by QueryLite - The Natural Language Data Platform
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, 'html'))

        # Create CSV Attachment if there are results
        if results:
            try:
                output = io.StringIO()
                # Get field names from the first dict
                fieldnames = results[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(results)
                
                attachment = MIMEApplication(output.getvalue().encode('utf-8'), Name=f"{report_name}.csv")
                attachment['Content-Disposition'] = f'attachment; filename="{report_name}.csv"'
                msg.attach(attachment)
            except Exception as e:
                print(f"Error generating CSV attachment: {e}")

        # Send Email via SMTP
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_starttls:
                    server.starttls()
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Failed to send email via SMTP: {e}")
            return False
