"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    Plus,
    Trash2,
    Clock,
    Search,
    History,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Thread {
    id: string;
    title: string;
    updated_at: string;
}

interface ThreadSidebarProps {
    dataSourceId: string;
    activeThreadId: string | null;
    onThreadSelect: (id: string) => void;
    onNewThread: () => void;
}

export function ThreadSidebar({
    dataSourceId,
    activeThreadId,
    onThreadSelect,
    onNewThread
}: ThreadSidebarProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (dataSourceId) {
            fetchThreads();
        }
    }, [dataSourceId]);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch(`/api/threads/?data_source_id=${dataSourceId}`);
            if (response.ok) {
                const data = await response.json();
                setThreads(data);
            }
        } catch (error) {
            console.error("Failed to fetch threads:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteThread = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this conversation?")) return;

        try {
            const response = await authenticatedFetch(`/api/threads/${id}`, { method: "DELETE" });
            if (response.ok) {
                setThreads(prev => prev.filter(t => t.id !== id));
                if (activeThreadId === id) onNewThread();
                toast.success("Thread deleted");
            }
        } catch (error) {
            toast.error("Failed to delete thread");
        }
    };

    const filteredThreads = threads.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border-r border-white/5 overflow-hidden">
            {/* Action Header */}
            <div className="p-4 space-y-4">
                <Button
                    onClick={onNewThread}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11 shadow-lg shadow-violet-600/20 group transition-all"
                >
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                    New Conversation
                </Button>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 focus-within:text-violet-400 group-focus-within:text-violet-400 transition-colors" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search history..."
                        className="w-full h-10 bg-slate-950/50 border border-slate-800 rounded-lg pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                    <div className="px-3 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History className="h-3 w-3" />
                        Recent Missions
                    </div>

                    {loading ? (
                        <div className="p-4 flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                        </div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <MessageSquare className="h-8 w-8 text-slate-800 mx-auto opacity-50" />
                            <p className="text-[10px] text-slate-600 uppercase font-bold">No history found</p>
                        </div>
                    ) : (
                        filteredThreads.map((thread) => (
                            <button
                                key={thread.id}
                                onClick={() => onThreadSelect(thread.id)}
                                className={`w-full group relative flex flex-col items-start p-4 rounded-xl transition-all duration-300 border
                                    ${activeThreadId === thread.id
                                        ? 'bg-violet-600/10 border-violet-500/30'
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}
                            >
                                <div className="flex items-start justify-between w-full mb-1">
                                    <span className={`text-sm font-semibold truncate pr-6 ${activeThreadId === thread.id ? 'text-violet-400' : 'text-slate-300'}`}>
                                        {thread.title}
                                    </span>
                                    <Trash2
                                        onClick={(e) => handleDeleteThread(e, thread.id)}
                                        className="h-3.5 w-3.5 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                    <Clock className="h-2.5 w-2.5" />
                                    {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                                </div>

                                {activeThreadId === thread.id && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-1 bg-violet-500 rounded-full" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Status */}
            <div className="p-4 border-t border-white/5 bg-slate-950/20 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>ENCRYPTED_VAULT v1.0</span>
                <div className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    SYNCED
                </div>
            </div>
        </div>
    );
}
