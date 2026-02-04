# QueryLite Visualization Guide

This document outlines how charts and visualizations work within QueryLite, from AI-driven recommendations to the technical frontend implementation.

## Overview

QueryLite is designed to turn natural language into visual insights. Instead of just returning raw rows, the system analyzes the result set and recommends the most appropriate visualization to help users understand their data at a glance.

## How it Works

1. **Query Execution**: User sends a natural language question.
2. **AI Analysis**: The LLM generates the SQL and analyzes the schema to determine if a chart is appropriate.
3. **Recommendation**: The backend returns a `chart_recommendation` object containing:
   - `chart_type`: The suggested visualization (Bar, Line, Area, Donut, or Table).
   - `x_column`: The column for the X-axis (usually time or categories).
   - `y_column`: The column for the Y-axis (numeric values).
   - `category_column`: Used for grouping (Donut/Pie).
   - `value_column`: The metric for grouping.
4. **Rendering**: The frontend `AutoChart` component receives the data and recommendation, rendering the visualization using the Tremor library.

## Supported Chart Types

| Type | Best For | Requirement |
|------|----------|-------------|
| **Bar Chart** | Comparing quantities across categories. | 1 Category, 1 Numeric value |
| **Line Chart** | Visualizing trends over time. | 1 Time/Sequence column, 1 Numeric value |
| **Area Chart** | Showing cumulative totals or volume over time. | 1 Time column, 1 Numeric value |
| **Donut Chart** | Displaying proportions and parts-of-a-whole. | 1 Category column, 1 Numeric value |
| **Table** | Viewing raw data or complex multi-column results. | Default fallback |

## Where to Find Charts

### 1. Live Results (`/ask`)
Immediately after running a query, the results are displayed in the **Analysis Results** card. You can toggle between the generated SQL and the visual chart.

### 2. Saved Queries (`/saved`)
Favorite queries are saved with their recommended chart type. 
- **Metadata**: Each saved query card shows a badge (e.g., "Bar Chart") to indicate how it's best visualized.
- **Re-running**: Clicking **Open & Run** will take you back to the Ask page and re-execute the query to show the live chart.

### 3. Scheduled Reports
When queries are sent via email (Scheduled Reports), the results are currently sent as formatted tables. Future iterations will include embedded chart images.

## Technical Implementation

- **Library**: [Tremor](https://tremor.so/) (built on top of Recharts).
- **Core Component**: `frontend/querylite-fe/app/components/charts/auto-chart.tsx`.
- **Backend Schema**: Defined in `backend/app/models/schemas.py` as `ChartRecommendation`.

## Customization

Currently, the AI automatically selects the best colors and axes based on the data. 
- **Colors**: Uses a premium violet/indigo/emerald palette consistent with the QueryLite brand.
- **Responsiveness**: All charts are fully responsive and designed for dark mode.

## Roadmap

- [ ] **Dashboard Builder**: Ability to pin multiple saved charts to a single custom dashboard.
- [ ] **Manual Overrides**: Allow users to manually change the chart type if they prefer a different visualization.
- [ ] **Image Export**: Button to download the currently visible chart as a PNG or SVG.
