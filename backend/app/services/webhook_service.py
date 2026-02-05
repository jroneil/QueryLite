import asyncio
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.orm import Session

from app.db.models import Workspace


class WebhookService:
    """Service to handle outbound webhooks for workspace events"""

    @staticmethod
    async def send_event(db: Session, workspace_id: str, event_type: str, details: Dict[str, Any]):
        """Send a webhook event for a specific workspace"""
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        
        if not workspace or not workspace.webhook_enabled or not workspace.webhook_url:
            return

        payload = {
            "version": "1.0",
            "event": event_type,
            "workspace": workspace.name,
            "details": details,
            "timestamp": details.get("timestamp") or ""
        }

        try:
            async with httpx.AsyncClient() as client:
                # We don't wait for the response to keep the API fast
                # We use a 5 second timeout for the initial connection
                await client.post(
                    workspace.webhook_url, 
                    json=payload,
                    timeout=5.0
                )
        except Exception as e:
            print(f"Webhook delivery failed for workspace {workspace_id}: {e}")

    @staticmethod
    def trigger_event(db: Session, workspace_id: Optional[str], event_type: str, details: Dict[str, Any]):
        """Trigger a webhook event asynchronously"""
        if not workspace_id:
            return
            
        # Fire and forget
        asyncio.create_task(WebhookService.send_event(db, workspace_id, event_type, details))
