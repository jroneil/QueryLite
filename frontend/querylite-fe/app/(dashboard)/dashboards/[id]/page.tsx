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
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { toast } from "sonner";
import Link from "next/link";

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

    const fetchDashboard = async () => {
        try {
            const response = await authenticatedFetch(`/api/dashboards/${params.id}`);
            if (response.ok) {
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

    useEffect(() => {
        if (params.id) {
            fetchDashboard();
        }
    }, [params.id]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
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
        <div className="p-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <Link href="/dashboards">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                            {dashboard.name}
                        </h1>
                        <p className="text-slate-400 text-sm">{dashboard.description || "Interactive monitoring dashboard"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button asChild className="bg-violet-600 hover:bg-violet-700">
                        <Link href={`/saved?dashId=${dashboard.id}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Chart
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Dashboard Content */}
            <DashboardGrid
                panels={dashboard.panels}
                onRemovePanel={handleRemovePanel}
            />

            {/* Footer / Status */}
            <div className="mt-12 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
                <div className="flex items-center gap-4">
                    <span>{dashboard.panels.length} active panels</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Last updated: {new Date(dashboard.updated_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                    <LayoutDashboard className="h-3 w-3" />
                    <span className="font-bold uppercase tracking-wider opacity-50">QueryLite Dashboard Engine</span>
                </div>
            </div>
        </div>
    );
}
