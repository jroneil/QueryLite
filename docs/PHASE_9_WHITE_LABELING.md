# Phase 9: White-Labeling & Multi-Tenancy

## 🚀 Overview
Phase 9 transforms QueryLite into a multi-tenant platform, allowing organizations to manage isolated workspaces and fully customize the user experience with their own branding.

### Key Capabilities

#### 1. Multi-Tenant Workspaces
*   **Isolation**: Every resource (Data Sources, Dashboards, Reports, Audit Logs) is now scoped to a `workspace_id`.
*   **RBAC**: Per-workspace roles (Admin, Editor, Viewer) ensure users only access and modify what they are authorized for.
*   **Workspace Switcher**: A seamless UI in the sidebar allowing users to pivot between different teams or clients.

#### 2. Branded Theming Engine
*   **Customization**: Organizations can configure their primary color, secondary color, logo URL, and default theme (Dark/Light).
*   **Dynamic UI**: The frontend uses CSS variables and a global `ThemeProvider` to apply organization branding in real-time across all components.
*   **Branded Components**: Buttons, gradients, and active states automatically inherit the workspace's primary accent color.

#### 3. Organization Admin Console
*   **Usage Metrics**: High-level dashboard showing total query execution tokens, active connectors, and team growth.
*   **Member Management**: Interface for inviting team members and managing their access levels.
*   **Live Preview**: Real-time editor for branding that allows administrators to see exactly how the platform will look before saving.

#### 4. Branded External Communications
*   **Scheduled Reports**: Automated email reports now feature the organization's logo and primary color in the template.
*   **Webhooks**: Outgoing notifications for alerts and insights include workspace branding metadata.

---

## 🛠️ Components Added/Modified

### Backend
*   `app/db/models.py`: Added `WorkspaceTheme` model.
*   `app/routers/workspaces.py`: Added admin metrics and theme management endpoints.
*   `app/services/scheduler_service.py`: Updated to inject theme data into report delivery.
*   `app/services/notifications/email_service.py`: Added support for dynamic HTML templates using workspace colors and logos.

### Frontend
*   `components/workspace-context.tsx`: Global state for the active workspace.
*   `components/workspace-theme-provider.tsx`: Dynamic CSS variable injector and theme manager.
*   `app/(dashboard)/workspaces/[id]/admin/page.tsx`: The centralized Organization Admin Console.
*   `components/sidebar.tsx`: Integrated Workspace Switcher and branded header.

---

## 🚦 Verification Steps

### 1. Workspace Isolation
1. Create a workspace named "Client A".
2. Link a data source to "Client A".
3. Switch to "Personal Workspace".
4. Verify that the "Client A" data source is invisible.

### 2. Live Branding Change
1. Navigate to /workspaces/[id]/admin -> **Branded Theme**.
2. Change the **Primary Accent Color** to red (#EF4444).
3. Click **Preserve Branding**.
4. Observe the sidebar and buttons immediately turn red without a page reload.

### 3. Branded Report Verification
1. Configure a **Scheduled Report** for a query.
2. Ensure you have a custom logo set in the Admin Console.
3. Trigger the report and check **MailHog** (http://localhost:8025).
4. Verify the email uses your custom logo and the primary accent color.
