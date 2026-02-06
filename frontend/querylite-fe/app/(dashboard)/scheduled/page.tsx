"use client";

import { useState, useEffect } from "react";
import {
    Calendar,
    Trash2,
    Clock,
    Mail,
    Play,
    Pause,
    Search,
    ExternalLink,
    AlertCircle,
    CheckCircle2
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

interface ScheduledReport {
    id: string;
    owner_id: string;
    saved_query_id: string;
    name: string;
    schedule_cron: string;
    recipient_emails: string[];
    is_active: boolean;
    last_run_at: string | null;
    channel_type: string;
    channel_webhook: string | null;
    created_at: string;
    updated_at: string;
    panels: any[];
}

export default function ScheduledReportsPage() {
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await authenticatedFetch("/api/scheduled-reports/");
            if (response.ok) {
                const data = await response.json();
                setReports(data);
            } else {
                toast.error("Failed to load schedules");
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Connection error");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (report: ScheduledReport) => {
        try {
            const response = await authenticatedFetch(`/api/scheduled-reports/${report.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    ...report,
                    is_active: !report.is_active
                }),
            });

            if (response.ok) {
                setReports(reports.map(r =>
                    r.id === report.id ? { ...r, is_active: !r.is_active } : r
                ));
                toast.success(report.is_active ? "Schedule paused" : "Schedule resumed");
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this scheduled report?")) return;

        try {
            const response = await authenticatedFetch(`/api/scheduled-reports/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setReports(reports.filter(r => r.id !== id));
                toast.success("Schedule deleted");
            }
        } catch (error) {
            toast.error("Failed to delete schedule");
        }
    };

    const filteredReports = reports.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const getCronDescription = (cron: string) => {
        if (cron === "0 9 * * *") return "Daily at 9:00 AM";
        if (cron === "0 9 * * 1") return "Mondays at 9:00 AM";
        if (cron === "0 0 1 * *") return "Monthly on the 1st";
        if (cron.includes("*/30")) return "Every 30 minutes";
        return cron;
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-violet-500" />
                        Scheduled Reports
                    </h1>
                    <p className="text-slate-400">Manage your automated query deliveries</p>
                </div>
                <Button asChild className="bg-violet-600 hover:bg-violet-700">
                    <Link href="/saved">
                        Create New Schedule
                    </Link>
                </Button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search schedules..."
                    className="bg-slate-900/50 border-slate-800 text-white pl-10 h-11 focus:ring-violet-500/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="h-48 bg-slate-900/50 border border-slate-800 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : filteredReports.length === 0 ? (
                <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Clock className="h-16 w-16 text-slate-700 mb-6" />
                        <h3 className="text-xl font-medium text-slate-300">No scheduled reports</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm mb-8">
                            Go to your Saved Queries and click the calendar icon to schedule a recurring report.
                        </p>
                        <Button asChild variant="outline" className="border-slate-700 text-slate-300">
                            <Link href="/saved">View Saved Queries</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredReports.map((report) => (
                        <Card key={report.id} className={cn(
                            "bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all group overflow-hidden",
                            !report.is_active && "opacity-75 grayscale-[0.5]"
                        )}>
                            <CardHeader className="pb-3 px-6 pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-white text-xl flex items-center gap-2">
                                            {report.name}
                                            {!report.is_active && (
                                                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-700 uppercase">
                                                    Paused
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-xs text-violet-400 font-medium">
                                            <Clock className="h-3 w-3" />
                                            {getCronDescription(report.schedule_cron)}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800"
                                            onClick={() => toggleStatus(report)}
                                        >
                                            {report.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={() => handleDelete(report.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 py-4 border-y border-slate-800/50 bg-slate-950/30">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        {report.channel_type === "slack" ? (
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Slack</Badge>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{report.channel_webhook}</span>
                                            </div>
                                        ) : report.channel_type === "teams" ? (
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Teams</Badge>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{report.channel_webhook}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                                                <div className="flex flex-wrap gap-1">
                                                    {report.recipient_emails.map(email => (
                                                        <Badge key={email} className="bg-slate-800 text-slate-400 border-slate-700 font-normal">
                                                            {email}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {report.last_run_at && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            Last run: {new Date(report.last_run_at).toLocaleString()}
                                        </div>
                                    )}
                                    {!report.last_run_at && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <AlertCircle className="h-3.5 w-3.5 text-slate-600" />
                                            No runs yet
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="px-6 py-4 flex justify-between bg-slate-900/80">
                                <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                                    ID: {report.id.substring(0, 8)}...
                                </div>
                                <Button variant="link" className="h-auto p-0 text-violet-400 text-xs hover:text-violet-300" asChild>
                                    <Link href={`/saved`}>
                                        View Base Query <ExternalLink className="h-3 w-3 ml-1" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
