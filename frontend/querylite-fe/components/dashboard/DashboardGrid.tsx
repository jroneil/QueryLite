"use client";

import { PanelCard } from "./PanelCard";

interface Panel {
    id: string;
    saved_query_id: string;
    title_override: string | null;
    grid_x: number;
    grid_y: number;
    grid_w: number;
    grid_h: number;
}

interface DashboardGridProps {
    panels: Panel[];
    onRemovePanel?: (panelId: string) => void;
    activeFilters?: Record<string, any>;
    onChartInteraction?: (filter: { column: string, value: any }) => void;
}

export function DashboardGrid({ panels, onRemovePanel, activeFilters, onChartInteraction }: DashboardGridProps) {
    if (panels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500">This dashboard has no panels yet.</p>
                <p className="text-sm text-slate-600 mt-2">Go to Saved Queries to pin charts to this dashboard.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 items-start">
            {panels.map((panel) => {
                // Map grid_w (1-12) to col-span
                // Our grid has 12 columns for maximum flexibility
                const colSpan = panel.grid_w || 4; // Default to 4 (1/3 of row)

                return (
                    <div
                        key={panel.id}
                        className="flex flex-col"
                        style={{
                            gridColumn: `span ${colSpan}`
                        }}
                    >
                        <PanelCard
                            panelId={panel.id}
                            savedQueryId={panel.saved_query_id}
                            gridH={panel.grid_h}
                            title={panel.title_override || undefined}
                            onRemove={onRemovePanel}
                            activeFilters={activeFilters}
                            onChartInteraction={onChartInteraction}
                        />
                    </div>
                );
            })}
        </div>
    );
}
