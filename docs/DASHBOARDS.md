# QueryLite - Dashboards

Customizable visualization dashboards for monitoring your key metrics.

## Overview

The Dashboard Builder allows users to combine multiple saved queries into a single, cohesive view. Each dashboard is composed of **Panels**, where each panel executes a saved query in real-time and renders its recommended visualization (Bar, Line, Area, Donut, etc.).

## Key Features

- **Dashboard Gallery**: View all your dashboards in one place with breadcrumbs and filtering.
- **Dynamic Panels**: Each panel automatically executes its underlying query when the dashboard is loaded or refreshed.
- **Auto-Visualization**: Panels leverage the QueryLite viz engine to automatically select and render the best chart type for the data.
- **Interactivity**: Refresh individual panels or the entire dashboard to see the latest data.
- **Pinning Workflow**: Easily add any chart from the "Saved Queries" page directly to a dashboard.

## Technical Architecture

### Data Models

- **Dashboard**: Stores name, description, and workspace/owner association.
- **DashboardPanel**: Join model between a Dashboard and a SavedQuery, storing layout metadata (grid position, size) and title overrides.

### API Endpoints

- `GET /api/dashboards/`: List dashboards.
- `POST /api/dashboards/`: Create a new dashboard.
- `GET /api/dashboards/{id}`: Get dashboard details and all integrated panels.
- `POST /api/dashboards/{id}/panels`: Add a new panel to a dashboard.
- `DELETE /api/dashboards/panels/{id}`: Remove a panel.
- `PATCH /api/dashboards/panels/{id}`: Update panel layout (grid X, Y, W, H).

### Frontend Components

- `DashboardGrid`: A responsive grid container for panels.
- `PanelCard`: The orchestration component for individual panels, handling data fetching, loading states, and chart rendering.

## Future Roadmap

- **Drag-and-Drop Layout**: Enable users to visually rearrange panels on a grid.
- **Global Dashboard Filters**: Apply filters (e.g., date range) across all panels simultaneously.
- **PDF Export**: Export the entire dashboard as a report.
- **Embedded Dashboards**: Embed dashboards in external applications or websites.
