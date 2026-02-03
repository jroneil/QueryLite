"use client";

import { useState, useEffect } from "react";
import { History, Search, Play, Trash2, Clock, Database, Code } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/api";
import Link from "next/link";

interface HistoryItem {
    id: string;
    data_source_id: string;
    natural_language_query: string;
    generated_sql: string | null;
    chart_type: string | null;
    created_at: string;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await authenticatedFetch("/api/history");
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item =>
        item.natural_language_query.toLowerCase().includes(search.toLowerCase()) ||
        (item.generated_sql && item.generated_sql.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <History className="h-8 w-8 text-violet-500" />
                        Query History
                    </h1>
                    <p className="text-slate-400">Review and re-run your past natural language queries</p>
                </div>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search history..."
                    className="bg-slate-900/50 border-slate-800 text-white pl-10 h-11 focus:ring-violet-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : filteredHistory.length === 0 ? (
                <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <History className="h-12 w-12 text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">No history found</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-sm">
                            {search ? "No results match your search criteria." : "You haven't run any queries yet. Start by asking a question!"}
                        </p>
                        {!search && (
                            <Button asChild className="mt-6 bg-violet-600 hover:bg-violet-700">
                                <Link href="/ask">Ask your first question</Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredHistory.map((item) => (
                        <Card key={item.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-center p-6 gap-6">
                                    <div className="p-3 bg-slate-800 rounded-xl">
                                        <Clock className="h-6 w-6 text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-slate-700 text-slate-400">
                                                {item.chart_type || 'Table'}
                                            </Badge>
                                            <span className="text-xs text-slate-500 italic">
                                                {new Date(item.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-medium text-lg leading-tight truncate">
                                            {item.natural_language_query}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                            <Link href={`/ask?query=${encodeURIComponent(item.natural_language_query)}&ds=${item.data_source_id}`}>
                                                <Play className="h-3 w-3 mr-2 text-emerald-400" />
                                                Re-run
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                {item.generated_sql && (
                                    <div className="bg-slate-950/50 p-4 border-t border-slate-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 overflow-hidden">
                                            <Code className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{item.generated_sql}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
