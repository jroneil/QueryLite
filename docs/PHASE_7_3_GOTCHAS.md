# Phase 7.3 Lessons Learned & "Gotchas"

## ⚠️ Known Implementation Details

### 1. Ordinal vs. Chronological Forecasting
*   **The Issue**: The `linear_forecast` uses the ordinal index of rows as the independent variable (X). 
*   **The Gotcha**: This assumes that the data returned by the SQL query is already sorted chronologically. If the query result is random or sorted by value, the forecast will be mathematically correct relative to the sequence but logically useless.
*   **Future Guard**: We should eventually force a secondary sort in the `TrendForecaster` if a date column is identified.

### 2. Chart Continuity
*   **The Issue**: Standard charts would show a gap between the last historical point and the first forecast point if handled as separate series.
*   **The Solution**: We manually duplicate the last historical data point into the "Forecast" series in `AutoChart.tsx` to ensure a continuous line stroke.

### 3. Forecast Visibility
*   **The Issue**: Users might try to forecast on categorical data (e.g., "Count by Country").
*   **The Constraint**: The "Predict Future" button and dashboard toggle are conditionally rendered based on the `chart_type` (must be `line` or `area`) and the presence of numeric/date columns.

### 4. System Load - Discovery Scan
*   **The Issue**: The `discover-all` endpoint in `insights.py` iterates over the user's top 5 saved queries, executing each SQL query against the database.
*   **Performance**: On large datasets, this could slow down the Intelligence Center load significantly.
*   **Mitigation**: The Intelligent Scanning should ideally be moved to the background `scheduler_service` (like anomalies) and results written to an `insights` table, rather than computed on-the-fly.

### 5. Frontend Badge Clutter
*   **The Issue**: With Anomaly badges and Forecast toggles, the `PanelCard` header is becoming crowded. 
*   **Design Decision**: Forecast toggles are ghost icons that only appear on hover, while anomaly badges remain pulsing persistent indicators due to their high priority.
