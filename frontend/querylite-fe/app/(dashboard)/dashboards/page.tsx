"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Plus,
    Search,
    MoreVertical,
    ExternalLink,
    Trash2,
    Clock,
    Grid,
    BarChart3
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Dashboard {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    workspace_id: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    panels_count?: number;
}

export default function DashboardsPage() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newDashboardName, setNewDashboardName] = useState("");
    const [newDashboardDesc, setNewDashboardDesc] = useState("");

    useEffect(() => {
        fetchDashboards();
    }, []);

    const fetchDashboards = async () => {
        try {
            const response = await authenticatedFetch("/api/dashboards/");
            if (response.ok) {
                const data = await response.json();
                setDashboards(data);
            } else {
                toast.error("Failed to load dashboards");
            }
        } catch (error) {
            console.error("Error fetching dashboards:", error);
            toast.error("Connection error");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDashboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDashboardName.trim()) return;

        try {
            const response = await authenticatedFetch("/api/dashboards/", {
                method: "POST",
                body: JSON.stringify({
                    name: newDashboardName.trim(),
                    description: newDashboardDesc.trim(),
                    is_public: true
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setDashboards([data, ...dashboards]);
                setNewDashboardName("");
                setNewDashboardDesc("");
                setIsCreateDialogOpen(false);
                toast.success("Dashboard created successfully!");
            } else {
                toast.error("Failed to create dashboard");
            }
        } catch (error) {
            toast.error("A network error occurred");
        }
    };

    const handleDeleteDashboard = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this dashboard?")) return;

        try {
            const response = await authenticatedFetch(`/api/dashboards/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setDashboards(dashboards.filter(d => d.id !== id));
                toast.success("Dashboard deleted");
            }
        } catch (error) {
            toast.error("Failed to delete dashboard");
        }
    };

    const filteredDashboards = dashboards.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                            <LayoutDashboard className="h-6 w-6 text-violet-400" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Intelligence <span className="text-violet-500">Hub</span></h1>
                    </div>
                    <p className="text-slate-400 font-medium opacity-80 pl-1">Your centralized command center for data visualizations and insights.</p>
                </div>

                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="h-12 px-6 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-violet-600/20 transition-all border-t border-white/10 group"
                >
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                    New Dashboard
                </Button>
            </div>

            {/* Controls Bar */}
            <div className="relative group max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                </div>
                <Input
                    placeholder="Search your intelligence hub..."
                    className="bg-slate-900/40 border-slate-800 focus:border-violet-500/50 text-white pl-12 h-14 rounded-2xl shadow-inner backdrop-blur-sm transition-all text-base placeholder:text-slate-600"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-72 bg-slate-900/40 border border-slate-800/50 animate-pulse rounded-[2rem]" />
                    ))}
                </div>
            ) : filteredDashboards.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-violet-500/20 blur-[60px] rounded-full" />
                        <div className="relative h-24 w-24 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                            <Grid className="h-10 w-10 text-slate-700" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">No Command Centers Found</h3>
                    <p className="text-slate-500 font-medium max-w-sm mb-10 leading-relaxed">
                        Start your journey by creating a dashboard to synthesize query results into executive visuals.
                    </p>
                    <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="rounded-2xl h-12 px-8 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold uppercase tracking-widest text-xs"
                    >
                        <Plus className="h-4 w-4 mr-3" />
                        Create Initial Hub
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredDashboards.map((dashboard) => (
                        <Link key={dashboard.id} href={`/dashboards/${dashboard.id}`} className="group h-full">
                            <div className="relative h-full bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-violet-500/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.1)] flex flex-col">
                                <div className="p-8 pb-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="h-10 w-10 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-center group-hover:border-violet-500/40 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all">
                                            <LayoutDashboard className="h-5 w-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                                        </div>
                                        <Badge variant="outline" className="bg-slate-950/50 border-slate-800/50 text-slate-600 text-[9px] uppercase font-black tracking-widest rounded-lg px-2 group-hover:border-violet-500/20 group-hover:text-violet-500/60 transition-all">
                                            {dashboard.is_public ? "Public" : "Private"}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        <h2 className="text-xl font-black text-white group-hover:text-violet-400 transition-colors leading-tight">
                                            {dashboard.name}
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                            {dashboard.description || "Synthesizing ecosystem telemetry and insights."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 px-8 pt-2">
                                    <div className="h-24 relative overflow-hidden rounded-2xl bg-slate-950/20 border border-slate-800/30">
                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="h-full flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                                            <BarChart3 className="h-12 w-12 text-slate-800" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 mt-4 flex items-center justify-between border-t border-slate-800/50 bg-slate-900/40">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-slate-600" />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(dashboard.updated_at))} ago
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                            onClick={(e) => handleDeleteDashboard(dashboard.id, e)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <div className="h-8 w-8 rounded-full bg-slate-950 flex items-center justify-center text-slate-600 group-hover:text-white transition-all border border-transparent group-hover:border-violet-500/30">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Dialog Modal */}
            {isCreateDialogOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-indigo-600/5" onClick={() => setIsCreateDialogOpen(false)} />

                    <Card className="relative w-full max-w-lg bg-slate-900 border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 rounded-[2.5rem] overflow-hidden border-t border-white/5">
                        <CardHeader className="p-10 pb-6 text-center space-y-4">
                            <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shadow-inner">
                                <Plus className="h-8 w-8 text-violet-400" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl font-black text-white tracking-tight">Initiate Module</CardTitle>
                                <CardDescription className="text-slate-500 font-medium text-base">
                                    Configure your new command center parameters.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <form onSubmit={handleCreateDashboard}>
                            <CardContent className="px-10 space-y-6 pb-2">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Module Name</label>
                                    <Input
                                        autoFocus
                                        placeholder="E.g. Nexus Revenue Matrix"
                                        className="h-14 bg-slate-950 border-slate-800 text-white rounded-2xl focus:ring-violet-500/20 shadow-inner px-6 text-lg placeholder:text-slate-700"
                                        value={newDashboardName}
                                        onChange={(e) => setNewDashboardName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Operational Brief (Optional)</label>
                                    <Input
                                        placeholder="E.g. Real-time visualization of core revenue vectors..."
                                        className="h-14 bg-slate-950 border-slate-800 text-white rounded-2xl focus:ring-violet-500/20 shadow-inner px-6 text-base placeholder:text-slate-700"
                                        value={newDashboardDesc}
                                        onChange={(e) => setNewDashboardDesc(e.target.value)}
                                    />
                                </div>
                            </CardContent>

                            <CardFooter className="p-10 pt-4 flex gap-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                    className="flex-1 h-14 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    Abort
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-[2] h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-600/20 transition-all group"
                                    disabled={!newDashboardName.trim()}
                                >
                                    Provision Hub
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
