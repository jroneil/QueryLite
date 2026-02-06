"use client";

import { useState, useEffect } from "react";
import {
    Activity,
    Bell,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Trash2,
    ShieldCheck,
    Search,
    RefreshCw,
    X,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface AlertRule {
    id: string;
    name: string;
    condition_col: string;
    operator: string;
    threshold: number;
    channel_type: string;
    is_active: boolean;
    last_evaluated_at: string | null;
    created_at: string;
}

interface Anomaly {
    id: string;
    severity: "low" | "medium" | "high";
    details: {
        column: string;
        anomalies: any[];
    };
    is_acknowledged: boolean;
    created_at: string;
}

export default function IntelligencePage() {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"anomalies" | "alerts">("anomalies");

    useEffect(() => {
        fetchIntel();
    }, []);

    const fetchIntel = async () => {
        setLoading(true);
        try {
            const [rulesRes, anomaliesRes] = await Promise.all([
                authenticatedFetch("/api/alerts/"),
                authenticatedFetch("/api/alerts/anomalies")
            ]);

            if (rulesRes.ok) setRules(await rulesRes.json());
            if (anomaliesRes.ok) setAnomalies(await anomaliesRes.json());
        } catch (error) {
            toast.error("Failed to sync intelligence data");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/alerts/${id}`, { method: "DELETE" });
            if (res.ok) {
                setRules(rules.filter(r => r.id !== id));
                toast.success("Alert rule decommissioned");
            }
        } catch (error) {
            toast.error("Process aborted by system");
        }
    };

    const handleAcknowledgeAnomaly = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/alerts/anomalies/${id}/acknowledge`, { method: "POST" });
            if (res.ok) {
                setAnomalies(anomalies.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
                toast.success("Insight archived");
            }
        } catch (error) {
            toast.error("System synchronization failed");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 border border-white/5 p-8 group">
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 bg-emerald-600/10 blur-[100px] rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck className="h-3 w-3" />
                            Proactive Intelligence Center
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Monitoring <span className="text-emerald-400">Anomalies</span>
                        </h1>
                        <p className="text-slate-400 max-w-lg text-sm font-medium leading-relaxed">
                            AI-driven scanning for statistical pattern shifts and real-time threshold monitoring.
                        </p>
                    </div>

                    <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/5 shadow-2xl">
                        <Button
                            onClick={() => setActiveTab("anomalies")}
                            variant={activeTab === "anomalies" ? "default" : "ghost"}
                            className={`h-11 rounded-xl px-6 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "anomalies" ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Activity className="h-3.5 w-3.5 mr-2" />
                            Detected Insights
                        </Button>
                        <Button
                            onClick={() => setActiveTab("alerts")}
                            variant={activeTab === "alerts" ? "default" : "ghost"}
                            className={`h-11 rounded-xl px-6 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "alerts" ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Bell className="h-3.5 w-3.5 mr-2" />
                            Control Rules
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <RefreshCw className="h-10 w-10 animate-spin text-emerald-500/50" />
                    <span className="text-emerald-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Syncing Intelligence Core...</span>
                </div>
            ) : activeTab === "anomalies" ? (
                /* Anomalies Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {anomalies.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl group">
                            <Activity className="h-12 w-12 text-slate-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                            <h3 className="text-white font-bold text-lg mb-1">Clean System Report</h3>
                            <p className="text-slate-500 text-sm italic">No statistical pattern shifts detected in the current period.</p>
                        </div>
                    ) : (
                        anomalies.map((anomaly) => (
                            <Card key={anomaly.id} className={`bg-slate-900/40 border-slate-800/50 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 group ${anomaly.is_acknowledged ? 'opacity-60 saturate-50' : ''}`}>
                                <div className={`h-1.5 w-full bg-gradient-to-r ${anomaly.severity === 'high' ? 'from-rose-500 to-rose-600 shadow-[0_2px_10px_rgba(244,63,94,0.3)]' : 'from-amber-500 to-amber-600'}`} />
                                <CardHeader className="p-6 relative">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-widest ${anomaly.severity === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                {anomaly.severity} Priority
                                            </Badge>
                                            {anomaly.is_acknowledged && (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black tracking-widest">
                                                    Acknowledged
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 font-bold">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(anomaly.created_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                    <CardTitle className="mt-4 text-white text-base">
                                        Anomalous Shift: <span className="text-emerald-400">{anomaly.details.column}</span>
                                    </CardTitle>
                                    <CardDescription className="text-slate-400 text-xs italic mt-1">
                                        Statistical outlier detected in analysis results
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-6 pb-6 pt-0 space-y-6">
                                    <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 space-y-3">
                                        {anomaly.details.anomalies.map((data: any, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[11px] font-mono border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                <span className="text-slate-500 uppercase tracking-tighter">Value Deviation</span>
                                                <span className="text-white font-bold text-sm">{data.value}</span>
                                                <Badge variant="outline" className="text-rose-400 bg-rose-500/5 border-rose-500/20 py-0 h-4 px-1.5 text-[9px] font-black">
                                                    +{data.z_score.toFixed(1)}σ
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>

                                    {!anomaly.is_acknowledged && (
                                        <Button
                                            onClick={() => handleAcknowledgeAnomaly(anomaly.id)}
                                            className="w-full h-10 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                                        >
                                            <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                                            Acknowledge Insight
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                /* Alert Rules Layout */
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white font-bold text-sm tracking-tight uppercase">
                            <Bell className="h-4 w-4 text-emerald-400" />
                            Active Monitoring Protocols ({rules.length})
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {rules.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl group">
                                <Bell className="h-12 w-12 text-slate-700 mx-auto mb-4 group-hover:rotate-12 transition-transform" />
                                <h3 className="text-white font-bold text-lg mb-1">No Active Agents</h3>
                                <p className="text-slate-500 text-sm italic">You haven't defined any threshold-based alerting triggers yet.</p>
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div key={rule.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <Bell className="h-6 w-6 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-lg tracking-tight leading-none mb-1 uppercase">{rule.name}</h4>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest">
                                                    <span className="text-slate-500">When</span>
                                                    <Badge variant="outline" className="bg-slate-950 border-slate-700 text-emerald-400">{rule.condition_col}</Badge>
                                                    <span className="text-white">{rule.operator}</span>
                                                    <Badge variant="outline" className="bg-slate-950 border-slate-700 text-white">{rule.threshold}</Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400/80 font-bold uppercase tracking-tighter">
                                                    <Clock className="h-3 w-3" />
                                                    Last check: {rule.last_evaluated_at ? formatDistanceToNow(new Date(rule.last_evaluated_at), { addSuffix: true }) : 'Never'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 flex items-center gap-1.5 px-4 h-12">
                                            <div className={`h-2 w-2 rounded-full ${rule.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rule.is_active ? "Operational" : "Standby"}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="h-12 w-12 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
