"use client";

import { useState, useEffect } from "react";
import { History as HistoryIcon, RotateCcw, Calendar, User, Code, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface QueryVersion {
    id: string;
    version_number: number;
    sql_query: string;
    natural_language_query: string;
    chart_settings: any;
    created_at: string;
    created_by_id: string | null;
}

interface QueryVersionHistoryProps {
    queryId: string;
    onRevertSuccess: () => void;
}

export function QueryVersionHistory({ queryId, onRevertSuccess }: QueryVersionHistoryProps) {
    const [versions, setVersions] = useState<QueryVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [revertingId, setRevertingId] = useState<string | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [queryId]);

    const fetchVersions = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`/api/saved-queries/${queryId}/versions`);
            if (response.ok) {
                const data = await response.json();
                setVersions(data);
            }
        } catch (error) {
            console.error("Failed to fetch versions:", error);
            toast.error("Failed to load version history");
        } finally {
            setLoading(false);
        }
    };

    const handleRevert = async (versionId: string) => {
        try {
            setRevertingId(versionId);
            const response = await authenticatedFetch(`/api/saved-queries/${queryId}/revert/${versionId}`, {
                method: "POST",
            });
            if (response.ok) {
                toast.success("Successfully reverted to earlier version");
                onRevertSuccess();
            } else {
                toast.error("Failed to revert version");
            }
        } catch (error) {
            toast.error("An error occurred during reversion");
        } finally {
            setRevertingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <HistoryIcon className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Retrieving temporal logs...</p>
            </div>
        );
    }

    if (versions.length === 0) {
        return (
            <div className="text-center py-12">
                <HistoryIcon className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No version history available for this query.</p>
            </div>
        );
    }

    return (
        <div className="h-[500px] overflow-y-auto pr-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {versions.map((version, index) => (
                <div
                    key={version.id}
                    className={`p-4 rounded-xl border transition-all ${index === 0
                            ? "bg-indigo-500/5 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                        }`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${index === 0 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                                }`}>
                                V{version.version_number}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-slate-500" />
                                    <span className="text-xs font-bold text-slate-300">
                                        {format(new Date(version.created_at), "MMM d, yyyy • HH:mm")}
                                    </span>
                                    {index === 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                            Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {index !== 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-slate-950/50 border-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest"
                                disabled={revertingId !== null}
                                onClick={() => handleRevert(version.id)}
                            >
                                {revertingId === version.id ? (
                                    "Reverting..."
                                ) : (
                                    <>
                                        <RotateCcw className="h-3 w-3 mr-2" />
                                        Revert
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <FileText className="h-3 w-3 text-slate-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Natural Query</span>
                            </div>
                            <p className="text-xs text-slate-300 italic">"{version.natural_language_query}"</p>
                        </div>

                        <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Code className="h-3 w-3 text-slate-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SQL Logic</span>
                            </div>
                            <code className="text-[10px] text-indigo-300/80 font-mono block whitespace-pre-wrap leading-relaxed">
                                {version.sql_query}
                            </code>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
