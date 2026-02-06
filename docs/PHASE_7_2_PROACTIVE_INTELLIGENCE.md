# Phase 7.2: Proactive Intelligence Engine

This phase transforms QueryLite from a passive visualization tool into a proactive intelligence platform that monitors data health and alerts users to critical changes automatically.

## Core Objectives

1.  **Automated Insight Detection**: Implement AI-driven anomaly detection to identify unexpected spikes, drops, or pattern shifts in time-series data.
2.  **Smart Global Alerting**: Enable users to define threshold-based rules (e.g., "Alert me if daily signups drop below 50") with multi-channel delivery (Email, Slack, Teams).
3.  **Data Observability**: Provide a centralized view of detected anomalies and triggered alerts to identify system-wide trends.

## Key Features

### 🔍 AI Anomaly Detection (7.2.1)
An automated scanning engine that analyzes query results for statistical outliers. Using rolling averages and Z-score analysis, QueryLite will flag "Interesting Data Points" that warrant immediate attention.

### 🚨 Threshold-Based Alerting (7.2.2)
A unified alerting framework where users can attach "Triggers" to any saved query. 
- **Conditions**: Greater Than, Less Than, Equal To, or % Change.
- **Schedule**: Evaluate alerts every hour, day, or week.
- **Routing**: Integrated with the Phase 6.4 Messaging Layer (Slack, Teams, Email).

### 🔔 Intelligence Center (7.2.3)
A new UI section for managing active alert rules and viewing a history of triggered anomalies across all workspaces.

## Technical Implementation Details

- **Anomaly Service**: A statistical utility in the backend that processes time-series JSON data to identify outliers.
- **Alert Evaluation Engine**: An extension to the `ReportScheduler` that runs alert-check jobs and compares current data against user-defined thresholds.
- **Alert Persistance**: New database models for `AlertRule` and `AlertHistory` to track performance over time.
## Status: Completed ✅

Phase 7.2 is fully implemented and operational across the platform.

### Implementation Checklist
- [x] **Backend Anomaly Engine**: Statistical scanning (Z-score) implemented in `services/anomaly_detector.py`.
- [x] **Alerting Engine**: Hourly global evaluation job integrated into `scheduler_service.py`.
- [x] **Database Schema**: Models for `AlertRule` and `DataAnomalyAlert` established in `db/models.py`.
- [x] **Intelligence Center UI**: Centralized dashboard for monitoring data health at `/intelligence`.
- [x] **In-Context Alerting**: "Set Smart Alert" modal added to the `Ask` query results.
- [x] **Real-time Observability**: Pulsing anomaly badges added to the primary dashboard panels.

### Manual Verification Steps
1. Navigate to "Intelligence" in the sidebar to view the empty insights state.
2. Run a query in "Ask Query" and save it.
3. Click "Set Smart Alert" to define a threshold trigger.
4. Verify the rule appears in the "Control Rules" tab of the Intelligence Center.
5. Manually trigger a scan (via scheduler test or waiting) to see anomalies flagged on the dashboard panels.
