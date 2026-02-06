"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Shield,
    Search,
    Download,
    Activity,
    Database,
    Cpu,
    Clock,
    FilterX
} from "lucide-react";
import { authenticatedFetch } from "@/lib/api";
import { format } from "date-fns";

interface AuditLog {
    id: string;
    user_email: string;
    action: string;
    details: string | null;
    ip_address: string | null;
    token_count: number | null;
    response_time_ms: number | null;
    created_at: string;
}

interface AuditStats {
    total_tokens: number;
    avg_response_time_ms: number;
    total_queries: number;
    top_users: { email: string; count: number }[];
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");

    const fetchLogs = async () => {
        try {
            const response = await authenticatedFetch("/api/audit/logs");
            if (response.ok) {
                const data = await response.json();
                setLogs(data.items);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await authenticatedFetch("/api/audit/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    };

    useEffect(() => {
        Promise.all([fetchLogs(), fetchStats()]).then(() => setLoading(false));
    }, []);

    const filteredLogs = logs.filter(log =>
        log.user_email.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())
    );

    const exportCSV = () => {
        if (!logs.length) return;
        const headers = ["Timestamp", "User", "Action", "Tokens", "Latency (ms)", "IP Address"];
        const rows = logs.map(l => [
            l.created_at,
            l.user_email,
            l.action,
            l.token_count || 0,
            l.response_time_ms || 0,
            l.ip_address || ""
        ]);

        const csvContent = "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `querylite_audit_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-500/10 rounded-lg">
                            <Shield className="h-6 w-6 text-violet-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Audit Logger <span className="text-violet-400">Pro</span></h1>
                    </div>
                    <p className="text-slate-400 font-medium">System activity, security events, and analytical performance tracking.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={exportCSV}
                    className="bg-slate-900 border-white/10 text-white hover:bg-slate-800"
                >
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Total Queries
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{stats.total_queries}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Cpu className="h-3 w-3" /> Token Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{stats.total_tokens.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Avg Latency
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{stats.avg_response_time_ms}ms</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Database className="h-3 w-3" /> Active Sources
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">4</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/[0.02] py-4 px-6">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold text-white">Event Log</CardTitle>
                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Filter logs..."
                                    className="bg-slate-950/50 border-white/10 pl-10 h-9 text-xs"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActionFilter(""); }} className="h-9 px-3 text-slate-500">
                                <FilterX className="h-4 w-4 mr-2" /> Reset
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.01]">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-4">Timestamp</TableHead>
                                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-4">User</TableHead>
                                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-4">Action</TableHead>
                                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-4">Telemetry</TableHead>
                                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-widest py-4 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <TableCell className="text-slate-400 font-mono text-xs">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-200 text-sm">{log.user_email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm tracking-tight">{log.action.replace(/_/g, " ")}</span>
                                            {log.details && (
                                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[300px]">
                                                    {log.details}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {log.token_count && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                                                    <Cpu className="h-3 w-3 text-blue-400" />
                                                    <span className="text-[10px] font-bold text-blue-400">{log.token_count}</span>
                                                </div>
                                            )}
                                            {log.response_time_ms && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                                                    <Clock className="h-3 w-3 text-amber-400" />
                                                    <span className="text-[10px] font-bold text-amber-400">{log.response_time_ms}ms</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black text-[10px]">
                                            SUCCESS
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {!filteredLogs.length && (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <Shield className="h-12 w-12 text-slate-800" />
                            <div className="text-slate-500 font-bold">No audit events found matching your criteria.</div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
