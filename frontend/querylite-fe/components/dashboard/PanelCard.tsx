"use client";

import { useState, useEffect } from "react";
import {
    Loader2,
    AlertCircle,
    Maximize2,
    MoreHorizontal,
    RefreshCw,
    Trash2,
    Sparkles,
    Info
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";
import { AutoChart } from "@/app/components/charts/auto-chart";
import { toast } from "sonner";
import { DrillDownModal } from "./DrillDownModal";

interface PanelCardProps {
    panelId: string;
    savedQueryId: string;
    gridH?: number;
    title?: string;
    onRemove?: (id: string) => void;
    activeFilters?: Record<string, any>;
    onChartInteraction?: (filter: { column: string, value: any }) => void;
}

export function PanelCard({ panelId, savedQueryId, gridH = 3, title, onRemove, activeFilters, onChartInteraction }: PanelCardProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [queryName, setQueryName] = useState<string>("");
    const [naturalQuery, setNaturalQuery] = useState<string>("");
    const [dataSourceId, setDataSourceId] = useState<string>("");
    const [explanation, setExplanation] = useState<string>("");

    // Phase 5 States
    const [narrative, setNarrative] = useState<string | null>(null);
    const [loadingNarrative, setLoadingNarrative] = useState(false);
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
    const [drillDownContext, setDrillDownContext] = useState<{ column: string, value: any } | undefined>();

    // Calculate height based on grid_h units (1 unit ≈ 80px)
    const contentHeight = Math.max(160, gridH * 80);

    const fetchPanelData = async () => {
        setLoading(true);
        setError(null);
        setNarrative(null);
        try {
            // 1. Get the saved query details
            const queryRes = await authenticatedFetch(`/api/saved-queries/${savedQueryId}`);
            if (!queryRes.ok) throw new Error("Failed to load query details");
            const queryData = await queryRes.json();
            setQueryName(queryData.name);
            setNaturalQuery(queryData.natural_language_query);
            setDataSourceId(queryData.data_source_id);

            // 2. Execute the query
            const runRes = await authenticatedFetch("/api/query", {
                method: "POST",
                body: JSON.stringify({
                    question: queryData.natural_language_query,
                    data_source_id: queryData.data_source_id,
                    filters: activeFilters // Pass active filters to the backend
                }),
            });

            if (runRes.ok) {
                const result = await runRes.json();
                setData(result.results);
                setRecommendation(result.chart_recommendation);
                setExplanation(result.explanation);
            } else {
                const errData = await runRes.json();
                setError(errData.detail || "Failed to execute query");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const generateNarrative = async () => {
        if (!data || !recommendation) return;
        setLoadingNarrative(true);
        try {
            const res = await authenticatedFetch("/api/insights/chart-narrative", {
                method: "POST",
                body: JSON.stringify({
                    data,
                    chart_type: recommendation.chart_type,
                    question: naturalQuery,
                    explanation
                })
            });
            if (res.ok) {
                const result = await res.json();
                setNarrative(result.narrative);
            } else {
                toast.error("Could not generate summary");
            }
        } catch (err) {
            toast.error("Insight engine unavailable");
        } finally {
            setLoadingNarrative(false);
        }
    };

    const handleDataClick = (column: string, value: any) => {
        setDrillDownContext({ column, value });
        setIsDrillDownOpen(true);
        if (onChartInteraction) {
            onChartInteraction({ column, value });
        }
    };

    useEffect(() => {
        fetchPanelData();
    }, [savedQueryId, activeFilters]);

    return (
        <>
            <Card
                id={`panel-content-${panelId}`}
                className="h-full w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/50 flex flex-col overflow-hidden group hover:border-violet-500/30 transition-all duration-300 shadow-2xl rounded-2xl"
                style={{ minHeight: `${contentHeight + 80}px` }}
            >
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 bg-gradient-to-b from-slate-900/50 to-transparent">
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                        <CardTitle className="text-sm font-bold text-slate-100 truncate tracking-tight">
                            {title || queryName || "Untitled Panel"}
                        </CardTitle>
                        <p className="text-[10px] text-slate-500 truncate font-medium">
                            {naturalQuery}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                            onClick={generateNarrative}
                            disabled={loading || loadingNarrative || !data}
                            title="Auto-Narrative"
                        >
                            <Sparkles className={`h-3.5 w-3.5 ${loadingNarrative ? "animate-pulse" : ""}`} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                            onClick={fetchPanelData}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        {onRemove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                onClick={() => onRemove(panelId)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 pt-2 min-h-0 relative flex flex-col">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute h-12 w-12 rounded-full border-t-2 border-violet-500 animate-spin" />
                                <div className="h-10 w-10 rounded-full border-t-2 border-indigo-500 animate-spin-reverse opacity-50" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            <div className="bg-rose-500/10 p-2.5 rounded-full mb-3">
                                <AlertCircle className="h-5 w-5 text-rose-500" />
                            </div>
                            <p className="text-xs text-slate-400 mb-4 px-4 line-clamp-3 leading-relaxed">{error}</p>
                            <Button
                                variant="outline"
                                className="border-slate-800 text-slate-300 hover:text-white text-[10px] h-8 px-4"
                                onClick={fetchPanelData}
                            >
                                Reconnect data
                            </Button>
                        </div>
                    ) : data && recommendation ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            {narrative && (
                                <div className="mb-4 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl text-[11px] text-violet-200/90 leading-relaxed shadow-inner flex gap-3 animate-in slide-in-from-top-2 duration-300">
                                    <Sparkles className="h-3.5 w-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                                    <p>{narrative}</p>
                                </div>
                            )}
                            <div
                                className="w-full bg-slate-950/20 rounded-xl border border-slate-800/30 p-2"
                                style={{ height: `${contentHeight}px` }}
                            >
                                <AutoChart
                                    data={data}
                                    recommendation={recommendation}
                                    compact={false}
                                    onDataPointClick={handleDataClick}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-600 text-[11px] font-medium italic">
                            No visualization available
                        </div>
                    )}
                </CardContent>
            </Card>

            <DrillDownModal
                isOpen={isDrillDownOpen}
                onClose={() => setIsDrillDownOpen(false)}
                title={title || queryName}
                question={naturalQuery}
                dataSourceId={dataSourceId}
                filterContext={drillDownContext}
            />
        </>
    );
}
