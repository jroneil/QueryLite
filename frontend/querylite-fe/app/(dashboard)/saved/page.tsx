"use client";

import { useState, useEffect, Suspense } from "react";
import { Heart, Play, Trash2, Database, Code, BarChart3, Search, Calendar, Clock, MessageSquare, Send, User, LayoutDashboard, ArrowRight, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SavedQuery {
    id: string;
    user_id: string;
    data_source_id: string;
    name: string;
    natural_language_query: string;
    generated_sql: string | null;
    chart_type: string | null;
    created_at: string;
}

interface Comment {
    id: string;
    user_id: string;
    saved_query_id: string;
    content: string;
    created_at: string;
    user_name: string;
}

export default function SavedQueriesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-slate-500">Loading saved queries...</div>}>
            <SavedQueriesContent />
        </Suspense>
    );
}

function SavedQueriesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const dashId = searchParams.get("dashId");

    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Scheduling states
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
    const [scheduleName, setScheduleName] = useState("");
    const [scheduleCron, setScheduleCron] = useState("0 9 * * *");
    const [recipients, setRecipients] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);

    // Comments states
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);

    // Dashboard Pinning states
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");
    const [isPinning, setIsPinning] = useState(false);

    useEffect(() => {
        fetchSavedQueries();
    }, []);

    const fetchSavedQueries = async () => {
        try {
            const response = await authenticatedFetch("/api/saved-queries");
            if (response.ok) {
                const data = await response.json();
                setQueries(data);
            }
        } catch (error) {
            console.error("Failed to fetch saved queries:", error);
            toast.error("Failed to load saved queries");
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async (queryId: string) => {
        try {
            const res = await authenticatedFetch(`/api/saved-queries/${queryId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    };

    const handleAddComment = async () => {
        if (!selectedQuery || !newComment.trim()) return;
        setIsAddingComment(true);
        try {
            const res = await authenticatedFetch(`/api/saved-queries/${selectedQuery.id}/comments`, {
                method: "POST",
                body: JSON.stringify({ content: newComment.trim() }),
            });
            if (res.ok) {
                setNewComment("");
                fetchComments(selectedQuery.id);
                toast.success("Comment added");
            }
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setIsAddingComment(false);
        }
    };

    const fetchDashboards = async () => {
        try {
            const res = await authenticatedFetch("/api/dashboards/");
            if (res.ok) {
                const data = await res.json();
                setDashboards(data);
                if (dashId) {
                    setSelectedDashboardId(dashId);
                } else if (data.length > 0) {
                    setSelectedDashboardId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching dashboards:", error);
        }
    };

    useEffect(() => {
        if (dashId) {
            fetchDashboards();
        }
    }, [dashId]);

    const handlePinToDashboard = async () => {
        if (!selectedQuery || !selectedDashboardId) return;
        setIsPinning(true);
        try {
            const res = await authenticatedFetch(`/api/dashboards/${selectedDashboardId}/panels`, {
                method: "POST",
                body: JSON.stringify({
                    saved_query_id: selectedQuery.id,
                    title_override: selectedQuery.name
                }),
            });
            if (res.ok) {
                toast.success("Pinned to dashboard!");
                setIsPinDialogOpen(false);
                if (dashId) {
                    router.push(`/dashboards/${dashId}`);
                }
            } else {
                toast.error("Failed to pin to dashboard");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsPinning(false);
        }
    };

    const openPinDialog = (query: SavedQuery, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedQuery(query);
        fetchDashboards();
        setIsPinDialogOpen(true);
    };

    const deleteComment = async (commentId: string) => {
        try {
            const res = await authenticatedFetch(`/api/comments/${commentId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setComments(comments.filter(c => c.id !== commentId));
                toast.success("Comment deleted");
            }
        } catch (error) {
            toast.error("Failed to delete comment");
        }
    };

    const openComments = (query: SavedQuery, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedQuery(query);
        fetchComments(query.id);
        setIsCommentsOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this saved query?")) return;

        try {
            const response = await authenticatedFetch(`/api/saved-queries/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setQueries(queries.filter(q => q.id !== id));
                toast.success("Query deleted");
            }
        } catch (error) {
            console.error("Failed to delete saved query:", error);
            toast.error("Delete failed");
        }
    };

    const openScheduleDialog = (query: SavedQuery, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedQuery(query);
        setScheduleName(`Report: ${query.name}`);
        setIsScheduleDialogOpen(true);
    };

    const handleCreateSchedule = async () => {
        if (!selectedQuery) return;
        if (!scheduleName || !recipients) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsScheduling(true);
        try {
            const emailList = recipients.split(",").map(e => e.trim()).filter(e => e);
            const response = await authenticatedFetch("/api/scheduled-reports/", {
                method: "POST",
                body: JSON.stringify({
                    name: scheduleName,
                    saved_query_id: selectedQuery.id,
                    schedule_cron: scheduleCron,
                    recipient_emails: emailList,
                    is_active: true
                }),
            });

            if (response.ok) {
                toast.success("Schedule created successfully!");
                setIsScheduleDialogOpen(false);
                setRecipients("");
            } else {
                toast.error("Failed to create schedule");
            }
        } catch (error) {
            console.error("Failed to create schedule:", error);
            toast.error("A network error occurred");
        } finally {
            setIsScheduling(false);
        }
    };

    const filteredQueries = queries.filter(q =>
        q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.natural_language_query.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
                        Saved Queries
                    </h1>
                    <p className="text-slate-400">Your favorite insights and reports, ready to run anytime</p>
                </div>
            </div>

            {dashId && (
                <div className="mb-8 p-4 bg-violet-600/10 border border-violet-500/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-600 rounded-lg">
                            <LayoutDashboard className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-medium">Pinning to Dashboard</p>
                            <p className="text-violet-300 text-xs">Select a saved chart below to add it as a new panel.</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-violet-500 ml-2" />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/saved')}
                        className="text-violet-400 hover:text-white hover:bg-violet-500/20"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            )}

            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search favorites..."
                    className="bg-slate-900/50 border-slate-800 text-white pl-10 h-11 focus:ring-rose-500/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : filteredQueries.length === 0 ? (
                <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Heart className="h-16 w-16 text-slate-700 mb-6" />
                        <h3 className="text-xl font-medium text-slate-300">No saved queries yet</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm mb-8">
                            Save your favorite natural language queries to access them quickly here.
                        </p>
                        <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600">
                            <Link href="/ask">Run a new query</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredQueries.map((query) => (
                        <Card key={query.id} className="bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all group relative overflow-hidden flex flex-col">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className="bg-slate-800 text-slate-400 border-slate-700">
                                        {query.chart_type || 'Table'}
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                                            onClick={(e) => openComments(query, e)}
                                            title="Discussion"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
                                            onClick={(e) => openPinDialog(query, e)}
                                            title="Pin to Dashboard"
                                        >
                                            <LayoutDashboard className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                                            onClick={(e) => openScheduleDialog(query, e)}
                                            title="Schedule this query"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={(e) => handleDelete(query.id, e)}
                                            title="Delete favorite"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="text-white text-xl line-clamp-1">{query.name}</CardTitle>
                                <CardDescription className="line-clamp-2 text-slate-400 italic font-mono text-xs mt-1">
                                    "{query.natural_language_query}"
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 mt-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Database className="h-3 w-3" />
                                        <span>PostgreSQL Database</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <BarChart3 className="h-3 w-3" />
                                        <span>{query.chart_type ? `${query.chart_type.charAt(0).toUpperCase()}${query.chart_type.slice(1)}` : 'Table'} Visualization</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-6 px-6">
                                <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700 group-hover:bg-violet-600 group-hover:border-violet-500 transition-colors">
                                    <Link href={`/ask?query=${encodeURIComponent(query.natural_language_query)}&ds=${query.data_source_id}`}>
                                        <Play className="h-4 w-4 mr-2 text-emerald-400 group-hover:text-white" />
                                        Open & Run
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Schedule Dialog */}
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-violet-400" />
                            Schedule Automated Report
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Set up a recurring email report for "{selectedQuery?.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Report Name</Label>
                            <Input
                                id="name"
                                value={scheduleName}
                                onChange={(e) => setScheduleName(e.target.value)}
                                className="bg-slate-950 border-slate-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schedule">Schedule Frequency</Label>
                            <Select value={scheduleCron} onValueChange={setScheduleCron}>
                                <SelectTrigger className="bg-slate-950 border-slate-800">
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="0 9 * * *">Daily at 9:00 AM</SelectItem>
                                    <SelectItem value="0 9 * * 1">Every Monday at 9:00 AM</SelectItem>
                                    <SelectItem value="0 0 1 * *">First of every month</SelectItem>
                                    <SelectItem value="*/30 * * * *">Every 30 minutes (Testing)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emails">Recipient Emails (comma separated)</Label>
                            <Input
                                id="emails"
                                placeholder="team@example.com, boss@example.com"
                                value={recipients}
                                onChange={(e) => setRecipients(e.target.value)}
                                className="bg-slate-950 border-slate-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700"
                            onClick={handleCreateSchedule}
                            disabled={isScheduling}
                        >
                            {isScheduling ? "Creating..." : "Create Schedule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comments Dialog */}
            <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md flex flex-col h-[80vh] max-h-[600px] p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b border-slate-800">
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-indigo-400" />
                            Discussion: {selectedQuery?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Share insights or notes with your team.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {comments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                                <MessageSquare className="h-10 w-10 mb-2" />
                                <p className="text-sm">No comments yet. Start the conversation!</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="group relative">
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold uppercase text-slate-400 border border-slate-700">
                                            {comment.user_name[0]}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-200">{comment.user_name}</span>
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(comment.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg rounded-tl-none border border-slate-700/50">
                                                {comment.content}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity"
                                            onClick={() => deleteComment(comment.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                placeholder="Write a comment..."
                                className="bg-slate-900 border-slate-800 focus:ring-indigo-500"
                            />
                            <Button
                                size="icon"
                                className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                                onClick={handleAddComment}
                                disabled={isAddingComment || !newComment.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pin to Dashboard Dialog */}
            <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-violet-500" />
                            Pin to Dashboard
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Select a dashboard to add this chart to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dashboard" className="text-slate-300">Target Dashboard</Label>
                            {dashboards.length === 0 ? (
                                <p className="text-sm text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
                                    No dashboards found. Please create a dashboard first.
                                </p>
                            ) : (
                                <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue placeholder="Select a dashboard" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {dashboards.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPinDialogOpen(false)} className="text-slate-400">
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePinToDashboard}
                            className="bg-violet-600 hover:bg-violet-700"
                            disabled={isPinning || !selectedDashboardId}
                        >
                            {isPinning ? "Pinning..." : "Pin to Dashboard"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pin to Dashboard Dialog */}
            <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                <DialogContent className="sm:max-width-[425px] bg-slate-900 border-slate-800 text-white shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-violet-500" />
                            Pin to Dashboard
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Select a dashboard to add this chart to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dashboard" className="text-slate-300">Target Dashboard</Label>
                            {dashboards.length === 0 ? (
                                <p className="text-sm text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
                                    No dashboards found. Please create a dashboard first.
                                </p>
                            ) : (
                                <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue placeholder="Select a dashboard" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {dashboards.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPinDialogOpen(false)} className="text-slate-400 hover:text-white">
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePinToDashboard}
                            className="bg-violet-600 hover:bg-violet-700"
                            disabled={isPinning || !selectedDashboardId}
                        >
                            {isPinning ? "Pinning..." : "Pin to Dashboard"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
