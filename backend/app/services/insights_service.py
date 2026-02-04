"""
Insights Service for generating natural language narratives and summaries
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Dashboard
from app.models.schemas import ChartNarrativeRequest
from app.services.llm_service import LLMService


class InsightsService:
    """Service for high-level AI insight orchestration"""
    
    def __init__(self, db: Session):
        self.db = db
        self.llm = LLMService()
    
    async def get_chart_narrative(self, request: ChartNarrativeRequest) -> str:
        """Generate narrative for a single chart"""
        return self.llm.generate_insight(
            data_sample=request.data,
            question=request.question,
            chart_type=request.chart_type,
            explanation=request.explanation
        )
    
    async def get_dashboard_summary(self, dashboard_id: UUID) -> str:
        """Generate an aggregate summary for an entire dashboard"""
        dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
        if not dashboard:
            return "Dashboard not found."
            
        # For a full dashboard summary, we could gather summaries of each panel
        # and then ask the LLM to synthesize them.
        # For now, let's just list the panels and their intent.
        
        panel_summaries = []
        for panel in dashboard.panels:
            query = panel.saved_query
            panel_summaries.append(f"- Panel: {panel.title_override or query.name}\n  Intent: {query.natural_language_query}")
            
        if not panel_summaries:
            return "This dashboard is empty."

        # We'll use the LLM provider directly for this custom synthesis

        # Actually, let's use the LLM service to keep it cleaner
        # For now, just return a synthesized prompt

        
        try:
            # We don't have a direct "synthesize" method, so we'll just use the first available provider logic
            # or add a generic method to LLMService.
            # Let's add a generic 'get_completion' to LLMService or just use OpenAI/whatever is configured.
            
            # For simplicity, we'll leverage the generate_insight with a special "dashboard" chart_type
            result = self.llm._provider.generate_insight(
                data_sample=[], # No raw data for synthesis
                question=f"Synthesize this dashboard: {dashboard.name}",
                chart_type="dashboard",
                explanation=chr(10).join(panel_summaries)
            )
            return result
        except Exception as e:
            return f"Failed to synthesize dashboard summary: {str(e)}"
