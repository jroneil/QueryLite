from abc import ABC, abstractmethod
from typing import Any, List, Optional


class BaseNotificationProvider(ABC):
    """Abstract base class for notification providers (Email, Webhooks, etc.)"""
    
    @abstractmethod
    async def send_report(self, 
                          recipients: List[str], 
                          report_name: str, 
                          query_text: str, 
                          results: List[dict[str, Any]],
                          chart_type: Optional[str] = None,
                          theme: Optional[dict[str, Any]] = None) -> bool:
        """Send a formatted query report"""
        pass
