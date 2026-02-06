# Phase 7.3: Predictive Trend Forecasting & Discovery

## 🚀 Overview
Phase 7.3 transforms QueryLite from a tool that reports the past into one that anticipates the future. It introduces statistical forecasting models and automated "Data Discovery" to surface insights without user intervention.

### Key Capabilities

#### 1. Predictive Forecasting
*   **Engine**: A modular `TrendForecaster` service using Linear Regression and Moving Averages.
*   **Extrapolation**: Projects time-series data forward by a configurable number of periods (default: 7).
*   **Visualization**: Dashed line overlays in `AutoChart` that connect the last "Actual" point to the "Predicted" sequence.

#### 2. Automated Data Discovery
*   **Engine**: A `DataDiscovery` service that scans datasets for statistical significance.
*   **Signals**: Currently detects:
    *   **Growth/Decline**: Significant percentage shifts between start and end of series.
    *   **Metric Peaks**: Identifies if recent data represents a local or global maximum.
    *   **Volatility**: Detects high-variance metrics that may need stabilization.
*   **Discovery Feed**: A dedicated tab in the Intelligence Center surfacing these findings across all saved queries.

#### 3. UX Enhancements
*   **Ask Result Forecast**: A one-click "Predict Future" button in the Query Result view.
*   **Dashboard Projection**: A toggleable "Explore Future" mode for dashboard panels, allowing users to see projections in situ.

---

## 🛠️ Components Added/Modified

### Backend
*   `app/services/trend_forecaster.py`: The logic for regression and forecasting.
*   `app/services/discovery.py`: The logic for finding interesting patterns in data.
*   `app/routers/forecasts.py`: API for generating projections.
*   `app/routers/insights.py`: Extended with discovery endpoints.

### Frontend
*   `AutoChart.tsx`: Added support for `forecastData` prop and multi-series rendering.
*   `PanelCard.tsx`: Added forecast state and background fetching for dashboard widgets.
*   `Ask/page.tsx`: Integrated forecasting triggers.
*   `Intelligence/page.tsx`: Added the Data Discovery tab and feed.

---

## 🚦 Verification Steps

### 1. Manual Forecasting
1. Run a query that returns time-series data (e.g., "Monthly revenue 2005").
2. Click **Predict Future**.
3. Verify that the chart extends with a rose-colored dashed line.

### 2. Dashboard Widgets
1. Save the above query to a dashboard.
2. In the dashboard view, hover over the panel and click the **TrendingUp** icon.
3. Verify the forecast appears overlaid on the dashboard widget.

### 3. Discovery Feed
1. Ensure you have at least 3-4 saved queries with varying data.
2. Navigate to `/intelligence` -> **Data Discovery**.
3. Verify that cards appear summarizing trends, peaks, or volatility.
