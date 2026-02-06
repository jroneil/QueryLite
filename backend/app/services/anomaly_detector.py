import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class AnomalyDetector:
    """Service to detect statistical anomalies in time-series query results"""

    @staticmethod
    def detect_anomalies(data: List[Dict[str, Any]], value_col: str, threshold: float = 3.0) -> List[Dict[str, Any]]:
        """
        Detect anomalies using Z-score analysis.
        threshold: number of standard deviations from mean (default: 3.0)
        """
        if not data or len(data) < 5:
            return []

        try:
            # Extract values, ensuring they are numbers
            values = []
            valid_rows_indices = []
            
            for i, row in enumerate(data):
                val = row.get(value_col)
                if val is not None:
                    try:
                        values.append(float(val))
                        valid_rows_indices.append(i)
                    except (ValueError, TypeError):
                        continue
                        
        except Exception as e:
            logger.error(f"Error extracting values for anomaly detection: {e}")
            return []

        if len(values) < 5:
            return []

        # Convert to numpy array for vector operations
        vals_array = np.array(values)
        mean = np.mean(vals_array)
        std = np.std(vals_array)

        if std == 0:
            return []

        # Calculate Z-scores
        z_scores = np.abs((vals_array - mean) / std)
        
        anomalies = []
        for idx, z in enumerate(z_scores):
            if z > threshold:
                original_index = valid_rows_indices[idx]
                anomalies.append({
                    "index": original_index,
                    "value": values[idx],
                    "z_score": float(z),
                    "mean": float(mean),
                    "std": float(std),
                    "row": data[original_index]
                })

        if anomalies:
            logger.info(f"Detected {len(anomalies)} anomalies in column '{value_col}'")
            
        return anomalies

    @staticmethod
    def check_threshold(current_value: float, operator: str, threshold: float) -> bool:
        """
        Check if a value triggers a threshold-based alert.
        operator: gt, lt, eq
        """
        if operator == "gt":
            return current_value > threshold
        elif operator == "lt":
            return current_value < threshold
        elif operator == "eq":
            return abs(current_value - threshold) < 1e-9
        return False
