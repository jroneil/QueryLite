"""
Notification Integrations - Slack and Microsoft Teams Webhook Clients
"""

import json
import httpx
import logging
from typing import Optional

class SlackWebhookClient:
    """Delivers messages and insights to Slack via Incoming Webhooks"""
    
    @staticmethod
    async def send_message(webhook_url: str, text: str, title: Optional[str] = None, data_summary: Optional[str] = None):
        """Send a formatted message to Slack"""
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": title or "QueryLite Intelligent Alert",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }
        ]
        
        if data_summary:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Insights Index:*\n{data_summary}"
                }
            })
            
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Sent via QueryLite Engine v1.0.4"
                }
            ]
        })

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(webhook_url, json={"blocks": blocks})
                response.raise_for_status()
                return True
            except Exception as e:
                logging.error(f"Slack Notification Failed: {str(e)}")
                return False


class TeamsWebhookClient:
    """Delivers adaptive cards to Microsoft Teams via Incoming Webhooks"""
    
    @staticmethod
    async def send_message(webhook_url: str, text: str, title: Optional[str] = None):
        """Send an adaptive card to Microsoft Teams"""
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "TextBlock",
                                "size": "Medium",
                                "weight": "Bolder",
                                "text": title or "QueryLite Strategic Insight"
                            },
                            {
                                "type": "TextBlock",
                                "text": text,
                                "wrap": True
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "version": "1.0"
                    }
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
                return True
            except Exception as e:
                logging.error(f"Teams Notification Failed: {str(e)}")
                return False
