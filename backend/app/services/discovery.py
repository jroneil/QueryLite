import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class DataDiscovery:
    """Service to automatically surface 'interesting' facts and trends from data"""

    @staticmethod
    def discover_insights(data: List[Dict[str, Any]], value_col: str, label_col: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scans data and returns a list of human-readable insights.
        """
        if not data or len(data) < 2:
            return []

        insights = []
        try:
            # Extract values
            values = []
            for row in data:
                val = row.get(value_col)
                if val is not None:
                    try:
                        values.append(float(val))
                    except (ValueError, TypeError):
                        continue

            if len(values) < 2:
                return []

            # Insight 1: Growth/Decline compare first and last
            first = values[0]
            last = values[-1]
            if first != 0:
                pct_change = ((last - first) / abs(first)) * 100
                if abs(pct_change) > 10:
                    insights.append({
                        "type": "trend",
                        "severity": "medium" if abs(pct_change) > 25 else "low",
                        "message": f"This dataset shows a {abs(pct_change):.1f}% {'increase' if pct_change > 0 else 'decrease'} from start to finish.",
                        "metadata": {"pct_change": pct_change, "first": first, "last": last}
                    })

            # Insight 2: Peak detection
            max_val = max(values)
            max_idx = values.index(max_val)
            if max_idx == len(values) - 1:
                insights.append({
                    "type": "peak",
                    "severity": "medium",
                    "message": "The most recent data point is the highest in the current series.",
                    "metadata": {"max_value": max_val}
                })

            # Insight 3: Volatility (standard deviation vs mean)
            import numpy as np
            vals_array = np.array(values)
            mean = np.mean(vals_array)
            std = np.std(vals_array)
            if mean != 0 and (std / abs(mean)) > 0.5:
                insights.append({
                    "type": "volatility",
                    "severity": "low",
                    "message": "High variance detected. This metric currently fluctuates significantly.",
                    "metadata": {"std_dev": float(std), "coefficient_of_variation": float(std/abs(mean))}
                })

        except Exception as e:
            logger.error(f"Error in discover_insights: {e}")

        return insights
