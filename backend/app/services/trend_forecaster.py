import logging
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TrendForecaster:
    """Service to project future data points based on historical patterns"""

    @staticmethod
    def linear_forecast(data: List[Dict[str, Any]], date_col: str, value_col: str, periods: int = 7) -> Dict[str, Any]:
        """
        Fits a linear regression model and projects forward.
        periods: number of units (days/weeks/months) to project
        """
        if not data or len(data) < 3:
            return {"error": "Insufficient data for forecasting (min 3 points required)"}

        try:
            # Extract and parse data
            x_raw = []
            y = []
            valid_dates = []

            # Use indices as X if dates are not uniform, but better to use timestamp diffs
            # For simplicity in this SQL-to-chart context, we use ordinal index of the sorted data
            # Assume data is already chronologically sorted by the query
            
            for i, row in enumerate(data):
                val = row.get(value_col)
                dt_raw = row.get(date_col)
                
                if val is not None and dt_raw is not None:
                    try:
                        y.append(float(val))
                        x_raw.append(i)
                        valid_dates.append(dt_raw)
                    except (ValueError, TypeError):
                        continue

            if len(y) < 3:
                return {"error": "Insufficient numeric data for forecasting"}

            # Linear regression: y = mx + c
            x = np.array(x_raw)
            y = np.array(y)
            
            A = np.vstack([x, np.ones(len(x))]).T
            m, c = np.linalg.lstsq(A, y, rcond=None)[0]

            # Project forward
            last_index = x_raw[-1]
            projections = []
            
            # Try to infer time frequency (crude check)
            # In a real app, we'd use pandas or more sophisticated date parsing
            # For now, we'll return the projected values relative to the next indices
            
            for i in range(1, periods + 1):
                next_x = last_index + i
                next_y = m * next_x + c
                projections.append({
                    "index": next_x,
                    "value": float(max(0, next_y)) # Don't project negative for standard metrics
                })

            return {
                "method": "linear_regression",
                "slope": float(m),
                "intercept": float(c),
                "projections": projections,
                "trend": "up" if m > 0.01 else "down" if m < -0.01 else "stable"
            }

        except Exception as e:
            logger.error(f"Error in linear_forecast: {e}")
            return {"error": str(e)}

    @staticmethod
    def moving_average_forecast(data: List[Dict[str, Any]], value_col: str, window: int = 7, periods: int = 7) -> Dict[str, Any]:
        """
        Uses simple moving average of the last 'window' points to project.
        """
        if not data or len(data) < window:
            return {"error": f"Insufficient data for moving average (min {window} points required)"}

        try:
            values = []
            for row in data:
                val = row.get(value_col)
                if val is not None:
                    try:
                        values.append(float(val))
                    except (ValueError, TypeError):
                        continue

            if len(values) < window:
                return {"error": "Insufficient numeric data"}

            # For a truly simple forecast, we just take the average of the last window
            avg = sum(values[-window:]) / window
            
            projections = []
            last_index = len(data) - 1
            for i in range(1, periods + 1):
                projections.append({
                    "index": last_index + i,
                    "value": float(avg)
                })

            return {
                "method": "moving_average",
                "average": float(avg),
                "projections": projections,
                "window": window
            }

        except Exception as e:
            logger.error(f"Error in moving_average_forecast: {e}")
            return {"error": str(e)}
