"use client";

import { useState, useEffect } from "react";
import { Heart, Play, Trash2, Database, Code, BarChart3, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/api";
import Link from "next/link";

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

export default function SavedQueriesPage() {
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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
        } finally {
            setLoading(false);
        }
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
            }
        } catch (error) {
            console.error("Failed to delete saved query:", error);
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
                        <Card key={query.id} className="bg-slate-900/50 border-slate-800 hover:border-rose-500/30 transition-all group relative overflow-hidden flex flex-col">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className="bg-slate-800 text-slate-400 border-slate-700">
                                        {query.chart_type || 'Table'}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                        onClick={(e) => handleDelete(query.id, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardTitle className="text-white text-xl line-clamp-1">{query.name}</CardTitle>
                                <CardDescription className="line-clamp-2 text-slate-400 italic">
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
                                <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
                                    <Link href={`/ask?query=${encodeURIComponent(query.natural_language_query)}&ds=${query.data_source_id}`}>
                                        <Play className="h-4 w-4 mr-2 text-emerald-400" />
                                        Open & Run
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
