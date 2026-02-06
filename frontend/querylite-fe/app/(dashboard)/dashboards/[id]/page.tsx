"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ArrowLeft,
    Settings,
    Share2,
    RefreshCw,
    Plus,
    Loader2,
    Sparkles,
    BookOpen,
    X,
    FileDown,
    FileJson,
    Presentation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { exportDashboardToPDF, exportDashboardToPPT } from "@/lib/export-service";

interface Dashboard {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    workspace_id: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    panels: any[];
}

export default function DashboardDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

    const [summary, setSummary] = useState<string | null>(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [exporting, setExporting] = useState(false);

    const fetchDashboard = async () => {
        try {
            const response = await authenticatedFetch(`/api/dashboards/${params.id}`);
            if (response.ok) {
                console.log("Response is ok" + response);
                const data = await response.json();
                setDashboard(data);
            } else {
                toast.error("Dashboard not found");
                router.push("/dashboards");
            }
        } catch (error) {
            console.error("Error fetching dashboard:", error);
            toast.error("Connection error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const generateDashboardSummary = async () => {
        setGeneratingSummary(true);
        setSummary(null);
        try {
            const res = await authenticatedFetch(`/api/insights/dashboard-summary/${params.id}`, {
                method: "POST"
            });
            if (res.ok) {
                const data = await res.json();
                setSummary(data.narrative);
            } else {
                toast.error("Could not generate summary");
            }
        } catch (err) {
            toast.error("Insight service unavailable");
        } finally {
            setGeneratingSummary(false);
        }
    };

    useEffect(() => {
        if (params.id) {
            fetchDashboard();
        }
    }, [params.id]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const handleExportPDF = async () => {
        if (!dashboard) return;
        setExporting(true);
        const tid = toast.loading("Capturing dashboard state for PDF...");
        try {
            await exportDashboardToPDF(dashboard.id, dashboard.name);
            toast.success("PDF Export complete", { id: tid });
        } catch (err) {
            toast.error("PDF Export failed", { id: tid });
        } finally {
            setExporting(false);
        }
    };

    const handleExportPPT = async () => {
        if (!dashboard) return;
        setExporting(true);
        const tid = toast.loading("Assembling PowerPoint slides...");
        try {
            const panels = dashboard.panels.map(p => ({
                id: p.id,
                title: p.title_override || "Panel"
            }));
            await exportDashboardToPPT(dashboard.id, dashboard.name, panels);
            toast.success("PowerPoint generated", { id: tid });
        } catch (err) {
            toast.error("PowerPoint assembly failed", { id: tid });
        } finally {
            setExporting(false);
        }
    };

    const handleChartInteraction = (filter: { column: string, value: any }) => {
        const newFilters = { ...activeFilters, [filter.column]: filter.value };
        setActiveFilters(newFilters);
        toast.info(`Filtering dashboard by ${filter.column}: ${filter.value}`, {
            icon: <RefreshCw className="h-3 w-3 animate-spin" />,
            duration: 2000
        });
    };

    const handleRemovePanel = async (panelId: string) => {
        if (!confirm("Remove this panel from the dashboard?")) return;

        try {
            const response = await authenticatedFetch(`/api/dashboards/panels/${panelId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setDashboard(prev => prev ? ({
                    ...prev,
                    panels: prev.panels.filter(p => p.id !== panelId)
                }) : null);
                toast.success("Panel removed");
            } else {
                toast.error("Failed to remove panel");
            }
        } catch (error) {
            toast.error("A network error occurred");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="h-12 w-12 animate-spin text-violet-500 mb-4" />
                <p className="text-slate-400 animate-pulse">Loading dashboard charts...</p>
            </div>
        );
    }

    if (!dashboard) return null;

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 pb-32 space-y-8 animate-in fade-in duration-700">
            {/* Navigation & Header */}
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-12 w-12 rounded-2xl bg-slate-900/40 border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Link href="/dashboards">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                                    {dashboard.name}
                                </h1>
                                <Badge variant="outline" className="bg-violet-500/5 text-violet-400 border-violet-500/20 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-lg">
                                    LIVE
                                </Badge>
                            </div>
                            <p className="text-slate-400 text-sm md:text-base font-medium opacity-80 max-w-2xl leading-relaxed">
                                {dashboard.description || "Synthesizing real-time analytics for your ecosystem."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/50 shadow-xl">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 font-bold text-xs uppercase tracking-wider"
                            onClick={generateDashboardSummary}
                            disabled={generatingSummary}
                        >
                            <Sparkles className={`h-4 w-4 mr-2 ${generatingSummary ? "animate-pulse" : ""}`} />
                            {generatingSummary ? "Synthesizing..." : "Executive Intel"}
                        </Button>
                        <div className="w-[1px] h-6 bg-slate-800" />
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={exporting}
                            className="h-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 font-bold text-[10px] uppercase tracking-wider"
                            onClick={handleExportPDF}
                        >
                            <FileJson className="h-3.5 w-3.5 mr-1" />
                            PDF
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={exporting}
                            className="h-10 rounded-xl text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 font-bold text-[10px] uppercase tracking-wider"
                            onClick={handleExportPPT}
                        >
                            <Presentation className="h-3.5 w-3.5 mr-1" />
                            PPT
                        </Button>
                        <div className="w-[1px] h-6 bg-slate-800" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs uppercase tracking-wider"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button asChild className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-violet-600/20 transition-all border-t border-white/10">
                            <Link href={`/saved?dashId=${dashboard.id}`}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Insight
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="p-4 rounded-3xl bg-slate-900/20 border border-slate-800/30 backdrop-blur-sm shadow-inner">
                    <DashboardFilters
                        dashboardId={dashboard.id}
                        onFiltersChange={setActiveFilters}
                        externalFilters={activeFilters}
                    />
                </div>
            </div>

            {/* Dashboard Visual Content for Export */}
            <div id={`dashboard-content-${dashboard.id}`} className="space-y-8 p-4 bg-slate-950 rounded-[2rem]">
                {/* Dashboard Summary Narrative */}
                {summary && (
                    <div className="animate-in slide-in-from-top-4 duration-500">
                        <div className="relative p-8 rounded-[2rem] bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/20 shadow-2xl overflow-hidden group">
                            <div className="absolute -top-12 -right-12 h-48 w-48 bg-violet-600/20 blur-[80px] rounded-full animate-pulse" />

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                                            <BookOpen className="h-5 w-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight leading-tight">Executive Intelligence Report</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-1.5 w-1.5 rounded-full bg-violet-500 animate-ping" />
                                                <span className="text-[10px] text-violet-400/80 font-bold uppercase tracking-[0.2em]">Live Synthesis</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-slate-500 hover:text-white hover:bg-white/10"
                                        onClick={() => setSummary(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <p className="text-base md:text-lg text-slate-300 leading-relaxed font-medium pl-1 tracking-tight">
                                    {summary}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Visualizations Grid */}
                <div className="space-y-6">
                    <DashboardGrid
                        panels={dashboard.panels}
                        onRemovePanel={handleRemovePanel}
                        activeFilters={activeFilters}
                        onChartInteraction={handleChartInteraction}
                    />
                </div>
            </div>

            {/* System Status Footer */}
            <div className="mt-20 py-10 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Architecture</span>
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                            <LayoutDashboard className="h-4 w-4 text-violet-500" />
                            {dashboard.panels.length} Modular Units
                        </div>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-800/50 hidden md:block" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Telemetry</span>
                        <span className="text-slate-300 font-bold text-sm">Sync: {new Date(dashboard.updated_at).toLocaleTimeString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">QueryLite Engine v1.0.4</span>
                </div>
            </div>
        </div>
    );
}
