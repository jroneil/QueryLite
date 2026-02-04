"use client";

import { useState, useEffect } from "react";
import {
    Loader2,
    AlertCircle,
    Maximize2,
    MoreHorizontal,
    RefreshCw,
    Trash2
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

interface PanelCardProps {
    panelId: string;
    savedQueryId: string;
    gridH?: number;
    title?: string;
    onRemove?: (id: string) => void;
}

export function PanelCard({ panelId, savedQueryId, gridH = 3, title, onRemove }: PanelCardProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [queryName, setQueryName] = useState<string>("");

    // Calculate height based on grid_h units (1 unit ≈ 80px)
    const contentHeight = Math.max(160, gridH * 80);

    const fetchPanelData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get the saved query details to get the question and DS
            const queryRes = await authenticatedFetch(`/api/saved-queries/${savedQueryId}`);
            if (!queryRes.ok) throw new Error("Failed to load query details");
            const queryData = await queryRes.json();
            setQueryName(queryData.name);

            // 2. Execute the query
            const runRes = await authenticatedFetch("/api/query", {
                method: "POST",
                body: JSON.stringify({
                    question: queryData.natural_language_query,
                    data_source_id: queryData.data_source_id,
                }),
            });

            if (runRes.ok) {
                const result = await runRes.json();
                setData(result.results);
                setRecommendation(result.chart_recommendation);
            } else {
                const errData = await runRes.json();
                setError(errData.detail || "Failed to execute query");
            }
        } catch (err: any) {
            console.error("Panel error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPanelData();
    }, [savedQueryId]);

    return (
        <Card className="h-full w-full bg-slate-900/40 border-slate-800 flex flex-col overflow-hidden group hover:border-slate-700 transition-colors shadow-xl">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-300 truncate pr-8">
                    {title || queryName || "Untitled Panel"}
                </CardTitle>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-white"
                        onClick={fetchPanelData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    {onRemove && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            onClick={() => onRemove(panelId)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 pt-1 min-h-0 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="h-6 w-6 text-rose-500 mb-2 opacity-50" />
                        <p className="text-[10px] text-slate-400 line-clamp-3">{error}</p>
                        <Button
                            variant="link"
                            className="text-violet-400 text-[10px] h-auto p-0 mt-1"
                            onClick={fetchPanelData}
                        >
                            Try again
                        </Button>
                    </div>
                ) : data && recommendation ? (
                    <div className="w-full" style={{ height: `${contentHeight}px` }}>
                        <AutoChart data={data} recommendation={recommendation} compact={true} />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-[10px]">
                        No data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
