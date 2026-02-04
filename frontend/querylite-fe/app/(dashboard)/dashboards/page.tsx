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
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <LayoutDashboard className="h-8 w-8 text-violet-500" />
                        Dashboards
                    </h1>
                    <p className="text-slate-400">Visualize your key metrics in one place</p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Dashboard
                </Button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search dashboards..."
                    className="bg-slate-900/50 border-slate-800 text-white pl-10 h-11 focus:ring-violet-500/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : filteredDashboards.length === 0 ? (
                <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <Grid className="h-16 w-16 text-slate-700 mb-6" />
                        <h3 className="text-xl font-medium text-slate-300">No dashboards found</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm mb-8">
                            Create your first dashboard to combine multiple query results into a single view.
                        </p>
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Dashboard
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDashboards.map((dashboard) => (
                        <Link key={dashboard.id} href={`/dashboards/${dashboard.id}`}>
                            <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all duration-300 group cursor-pointer overflow-hidden h-full flex flex-col shadow-lg hover:shadow-violet-500/5">
                                <CardHeader className="pb-3 px-6 pt-6">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-white text-xl group-hover:text-violet-400 transition-colors">
                                            {dashboard.name}
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-slate-950/50 border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                                            {dashboard.is_public ? "Public" : "Private"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-slate-400 line-clamp-2 mt-2">
                                        {dashboard.description || "No description provided"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 py-4 px-6">
                                    <div className="h-32 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center justify-center group-hover:bg-slate-950/80 transition-all duration-300">
                                        <LayoutDashboard className="h-10 w-10 text-slate-800 group-hover:text-violet-500/20 transition-all duration-300" />
                                    </div>
                                </CardContent>
                                <CardFooter className="px-6 py-4 flex justify-between items-center bg-slate-900/80 border-t border-slate-800/50">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(dashboard.updated_at))} ago
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={(e) => handleDeleteDashboard(dashboard.id, e)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Simple Create Dialog */}
            {isCreateDialogOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Plus className="h-5 w-5 text-violet-500" />
                                Create New Dashboard
                            </CardTitle>
                            <CardDescription>
                                Give your dashboard a name and description to get started.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCreateDashboard}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Name</label>
                                    <Input
                                        autoFocus
                                        placeholder="E.g. Sales Metrics"
                                        className="bg-slate-950 border-slate-800 text-white focus:ring-violet-500/50"
                                        value={newDashboardName}
                                        onChange={(e) => setNewDashboardName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
                                    <Input
                                        placeholder="E.g. Internal tracking for Q1 sales..."
                                        className="bg-slate-950 border-slate-800 text-white focus:ring-violet-500/50"
                                        value={newDashboardDesc}
                                        onChange={(e) => setNewDashboardDesc(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-violet-600 hover:bg-violet-700"
                                    disabled={!newDashboardName.trim()}
                                >
                                    Create Dashboard
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
