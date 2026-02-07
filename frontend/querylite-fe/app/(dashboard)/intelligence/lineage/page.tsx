"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/lib/api";
import { Network, AlertTriangle, ArrowRight, Database, FileCode, LayoutDashboard, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DataSource {
    id: string;
    name: string;
    db_type: string;
}

interface LineageNode {
    id: string;
    type: string;
    name: string;
    uuid?: string;
}

interface LineageLink {
    source: string;
    target: string;
}

interface LineageGraph {
    nodes: LineageNode[];
    links: LineageLink[];
}

interface ImpactResult {
    table: string;
    affected_queries: { id: string; name: string; query: string }[];
    affected_panels: { id: string; dashboard_id: string; title: string }[];
    total_impact: number;
}

export default function LineagePage() {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [graph, setGraph] = useState<LineageGraph | null>(null);
    const [loading, setLoading] = useState(false);
    const [impactTable, setImpactTable] = useState("");
    const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchDataSources();
    }, []);

    useEffect(() => {
        if (selectedSource && mounted) {
            fetchLineage();
        }
    }, [selectedSource, mounted]);

    const fetchDataSources = async () => {
        try {
            const response = await authenticatedFetch("/data-sources");
            const data = await response.json();
            if (Array.isArray(data)) {
                setDataSources(data);
                if (data.length > 0 && !selectedSource) {
                    setSelectedSource(data[0].id);
                }
            } else {
                setDataSources([]);
            }
        } catch (error) {
            toast.error("Failed to load data sources");
            setDataSources([]);
        }
    };

    const fetchLineage = async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch(`/lineage/${selectedSource}`);
            const data = await response.json();
            setGraph(data);
        } catch (error) {
            toast.error("Failed to load lineage data");
        } finally {
            setLoading(false);
        }
    };

    const runImpactAnalysis = async () => {
        if (!impactTable.trim() || !selectedSource) {
            toast.error("Please enter a table name");
            return;
        }
        setLoadingImpact(true);
        try {
            const response = await authenticatedFetch(`/lineage/${selectedSource}/impact/${impactTable}`);
            const data = await response.json();
            setImpactResult(data);
        } catch (error) {
            toast.error("Failed to run impact analysis");
        } finally {
            setLoadingImpact(false);
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case "table":
            case "column":
                return <Database className="w-4 h-4" />;
            case "saved_query":
                return <FileCode className="w-4 h-4" />;
            case "dashboard_panel":
                return <LayoutDashboard className="w-4 h-4" />;
            default:
                return <Network className="w-4 h-4" />;
        }
    };

    const getNodeColor = (type: string) => {
        switch (type) {
            case "table":
                return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
            case "column":
                return "bg-cyan-500/20 border-cyan-500/30 text-cyan-400";
            case "saved_query":
                return "bg-violet-500/20 border-violet-500/30 text-violet-400";
            case "dashboard_panel":
                return "bg-amber-500/20 border-amber-500/30 text-amber-400";
            default:
                return "bg-slate-500/20 border-slate-500/30 text-slate-400";
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-600/20">
                    <Network className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Data Lineage</h1>
                    <p className="text-slate-400 text-sm">Visualize relationships between tables, queries, and dashboards</p>
                </div>
            </div>

            {/* Data Source Selector */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Select data source" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {mounted && dataSources?.map((ds) => (
                                        <SelectItem key={ds.id} value={ds.id}>
                                            {ds.name} ({ds.db_type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={fetchLineage} disabled={loading} variant="outline" className="border-slate-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lineage Graph */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Lineage Graph</CardTitle>
                    <CardDescription>Tables and columns connected to saved queries and dashboard panels</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        </div>
                    ) : !graph || graph.nodes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No lineage data available for this data source</p>
                            <p className="text-sm mt-1">Save queries to start building lineage relationships</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Simple node layout */}
                            <div className="flex flex-wrap gap-3">
                                {graph.nodes.map((node) => (
                                    <div
                                        key={node.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getNodeColor(node.type)}`}
                                    >
                                        {getNodeIcon(node.type)}
                                        <span className="text-sm font-medium">{node.name}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Links */}
                            <div className="border-t border-slate-700 pt-4">
                                <p className="text-xs text-slate-500 mb-2">Relationships ({graph.links.length})</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {graph.links.map((link, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs">{link.source}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-500" />
                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs">{link.target}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Impact Analysis */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        Impact Analysis
                    </CardTitle>
                    <CardDescription>See which queries and dashboards are affected by schema changes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Input
                            placeholder="Enter table name (e.g., customers)"
                            value={impactTable}
                            onChange={(e) => setImpactTable(e.target.value)}
                            className="max-w-xs bg-slate-800 border-slate-700 text-white"
                        />
                        <Button onClick={runImpactAnalysis} disabled={loadingImpact} className="bg-amber-600 hover:bg-amber-700">
                            {loadingImpact ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                        </Button>
                    </div>

                    {impactResult && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-white">
                                    {impactResult.total_impact} item(s) affected by changes to "{impactResult.table}"
                                </span>
                            </div>
                            {impactResult.affected_queries.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-violet-400 mb-2">Affected Queries</p>
                                    <div className="space-y-2">
                                        {impactResult.affected_queries.map((q) => (
                                            <div key={q.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                <p className="font-medium text-white">{q.name}</p>
                                                <p className="text-sm text-slate-400 mt-1 truncate">{q.query}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {impactResult.affected_panels.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-amber-400 mb-2">Affected Dashboard Panels</p>
                                    <div className="space-y-2">
                                        {impactResult.affected_panels.map((p) => (
                                            <div key={p.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                <p className="font-medium text-white">{p.title || "Untitled Panel"}</p>
                                                <p className="text-sm text-slate-400">Dashboard: {p.dashboard_id}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
