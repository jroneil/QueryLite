"use client";

import { useState, useEffect } from "react";
import {
    MessageSquareText,
    Loader2,
    Code,
    BarChart3,
    AlertCircle,
    Copy,
    Save,
    Download,
    Check,
    ToggleLeft,
    ToggleRight,
    MessageSquare,
    Sparkles,
    LayoutDashboard,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import { ChatThread } from "@/components/chat/ChatThread";
import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AutoChart } from "@/app/components/charts/auto-chart";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface DataSource {
    id: string;
    name: string;
    description: string | null;
}

interface ChartRecommendation {
    chart_type: "bar" | "line" | "donut" | "area" | "table";
    x_column?: string;
    y_column?: string;
    category_column?: string;
    value_column?: string;
}

interface QueryResponse {
    sql_query: string;
    explanation: string;
    results: Record<string, unknown>[];
    row_count: number;
    chart_recommendation: ChartRecommendation;
    execution_time_ms: number;
    audit_log_id?: string;
}

export default function AskPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        }>
            <AskPageContent />
        </Suspense>
    );
}

function AskPageContent() {
    const searchParams = useSearchParams();
    const urlQuery = searchParams.get("query");
    const urlDs = searchParams.get("ds");

    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QueryResponse | null>(null);
    const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isChatMode, setIsChatMode] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

    // Initial load of parameters from URL
    useEffect(() => {
        if (urlQuery) {
            setQuestion(urlQuery);
            setResult(null); // Clear previous result to allow auto-run
        }
        if (urlDs) {
            setSelectedSource(urlDs);
        }
    }, [urlQuery, urlDs]);

    useEffect(() => {
        fetchDataSources();
        checkLLMStatus();
    }, []);

    // Auto-run query if both params are present and data sources are loaded
    useEffect(() => {
        const canAutoRun =
            urlQuery &&
            urlDs &&
            dataSources.length > 0 &&
            question === urlQuery &&
            selectedSource === urlDs &&
            !loading &&
            !result;

        if (canAutoRun) {
            handleSubmit();
        }
    }, [dataSources, urlQuery, urlDs, question, selectedSource, loading, result]);

    const fetchDataSources = async () => {
        try {
            const response = await authenticatedFetch("/api/data-sources");
            if (response.ok) {
                const data = await response.json();
                setDataSources(data);
                if (data.length > 0 && !selectedSource) {
                    setSelectedSource(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data sources:", error);
        }
    };

    const checkLLMStatus = async () => {
        try {
            const response = await authenticatedFetch("/api/llm/status");
            if (response.ok) {
                const data = await response.json();
                setLlmConfigured(data.configured);
            }
        } catch (error) {
            setLlmConfigured(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedSource || !question.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setSaveSuccess(false);
        setFeedbackSent(false);

        const loadingToast = toast.loading("Thinking...");

        try {
            const response = await authenticatedFetch("/api/query", {
                method: "POST",
                body: JSON.stringify({
                    question: question.trim(),
                    data_source_id: selectedSource,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
                toast.success("Query successful!", { id: loadingToast });
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Failed to execute query");
                toast.error(errorData.detail || "Failed to execute query", { id: loadingToast });
            }
        } catch (error) {
            setError("Failed to connect to the API");
            toast.error("Failed to connect to the API", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuery = async () => {
        if (!result || !selectedSource) return;
        setSaving(true);
        try {
            const response = await authenticatedFetch("/api/saved-queries", {
                method: "POST",
                body: JSON.stringify({
                    name: question.length > 40 ? question.substring(0, 40) + "..." : question,
                    data_source_id: selectedSource,
                    natural_language_query: question,
                    generated_sql: result.sql_query,
                    chart_type: result.chart_recommendation.chart_type,
                }),
            });
            if (response.ok) {
                setSaveSuccess(true);
                toast.success("Query saved to favorites!");
            } else {
                toast.error("Failed to save query");
            }
        } catch (err) {
            console.error("Failed to save query:", err);
            toast.error("Failed to save query");
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFeedback = async (score: number) => {
        if (!result?.audit_log_id) return;

        try {
            const response = await authenticatedFetch(`/api/query/${result.audit_log_id}/feedback`, {
                method: "POST",
                body: JSON.stringify({ score }),
            });
            if (response.ok) {
                setFeedbackSent(true);
                toast.success("Feedback recorded! Thanks for helping us improve.");
            }
        } catch (err) {
            console.error("Feedback failed:", err);
        }
    };

    const handleThreadSelect = (id: string) => {
        setActiveThreadId(id);
    };

    const handleNewThread = async () => {
        if (!selectedSource) {
            toast.error("Please select a data source first");
            return;
        }

        try {
            const response = await authenticatedFetch("/api/threads/", {
                method: "POST",
                body: JSON.stringify({
                    data_source_id: selectedSource,
                    title: `Analysis: ${new Date().toLocaleTimeString()}`,
                    workspace_id: null
                })
            });

            if (response.ok) {
                const data = await response.json();
                setActiveThreadId(data.id);
            }
        } catch (error) {
            toast.error("Failed to create new thread");
        }
    };

    const exampleQuestions = [
        "Show me monthly revenue trends",
        "What are the top 10 products by sales?",
        "How many users signed up each month?",
        "Show revenue breakdown by category",
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
            {/* Hero / Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 border border-white/5 p-8 md:p-12 mb-4 group">
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 bg-violet-600/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 translate-y-24 -translate-x-12 h-64 w-64 bg-indigo-600/20 blur-[100px] rounded-full" />

                <div className="relative z-10 space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold tracking-wide uppercase">
                        <Sparkles className="h-3 w-3" />
                        AI-Powered Analysis
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                                Talk to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Data</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                                Instant SQL generation and visual insights using natural language. No more complex querying, just ask.
                            </p>
                        </div>

                        <div className="bg-slate-950/40 p-1.5 rounded-2xl border border-white/5 flex items-center gap-1 self-start md:self-auto">
                            <Button
                                onClick={() => setIsChatMode(false)}
                                variant={!isChatMode ? "default" : "ghost"}
                                className={`h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest transition-all ${!isChatMode ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
                                Single Query
                            </Button>
                            <Button
                                onClick={() => setIsChatMode(true)}
                                variant={isChatMode ? "default" : "ghost"}
                                className={`h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest transition-all ${isChatMode ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                                Conversational
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {isChatMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-20rem)] min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-3 h-full">
                        <ThreadSidebar
                            dataSourceId={selectedSource}
                            activeThreadId={activeThreadId}
                            onThreadSelect={handleThreadSelect}
                            onNewThread={handleNewThread}
                        />
                    </div>
                    <div className="lg:col-span-9 h-full">
                        {activeThreadId ? (
                            <ChatThread
                                threadId={activeThreadId}
                                dataSourceId={selectedSource}
                                onReset={() => setActiveThreadId(null)}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-700 p-12 text-center gap-6">
                                <div className="h-24 w-24 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center animate-bounce">
                                    <MessageSquare className="h-10 w-10 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Select a Conversation</h3>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                                        Choose an existing thread from the sidebar or start a new strategic analysis session.
                                    </p>
                                </div>
                                <Button onClick={handleNewThread} className="bg-violet-600 hover:bg-violet-500 text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest">
                                    Start New Session
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Main Interface (Single Query Mode) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Left Side: Query Form */}
                    <div className="lg:col-span-12 space-y-8">
                        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 shadow-2xl rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-800/50 bg-slate-900/20 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                                        <MessageSquareText className="h-5 w-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white text-xl">Intelligence Engine</CardTitle>
                                        <CardDescription className="text-slate-400 text-sm italic">
                                            Describe your analytical goal in plain English
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                {/* LLM Status Alert */}
                                {llmConfigured === false && (
                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-amber-400 font-bold text-sm">LLM Core Unavailable</p>
                                            <p className="text-amber-400/70 text-xs">Configure OPENAI_API_KEY in environment to activate.</p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Data Source */}
                                        <div className="space-y-3">
                                            <Label htmlFor="dataSource" className="text-slate-400 text-xs font-bold uppercase tracking-widest pl-1">
                                                Dataset Context
                                            </Label>
                                            {dataSources.length === 0 ? (
                                                <div className="h-12 flex items-center px-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-500 italic text-sm">
                                                    No active sources...
                                                </div>
                                            ) : (
                                                <select
                                                    id="dataSource"
                                                    value={selectedSource}
                                                    onChange={(e) => setSelectedSource(e.target.value)}
                                                    className="w-full h-12 bg-slate-950/50 border border-slate-800 rounded-2xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 hover:border-slate-700 transition-all appearance-none cursor-pointer"
                                                >
                                                    {dataSources.map((ds) => (
                                                        <option key={ds.id} value={ds.id} className="bg-slate-900">
                                                            {ds.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* Quick Context Chips */}
                                        <div className="space-y-3">
                                            <Label className="text-slate-400 text-xs font-bold uppercase tracking-widest pl-1 italic">
                                                Suggested Missions
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {exampleQuestions.map((q) => (
                                                    <button
                                                        key={q}
                                                        type="button"
                                                        onClick={() => setQuestion(q)}
                                                        className="px-4 py-2 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-400 text-xs font-medium hover:border-violet-500/50 hover:text-white hover:bg-violet-600/5 transition-all duration-300"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Question Area */}
                                    <div className="space-y-3 relative">
                                        <Label htmlFor="question" className="text-slate-400 text-xs font-bold uppercase tracking-widest pl-1">
                                            Analytical Inquiry
                                        </Label>
                                        <div className="relative group">
                                            <Textarea
                                                id="question"
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="What would you like to discover today?"
                                                rows={4}
                                                className="w-full bg-slate-950/50 border-slate-800 rounded-3xl text-lg text-white placeholder:text-slate-600 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500/50 p-6 shadow-inner transition-all resize-none"
                                            />
                                            <div className="absolute bottom-4 right-4 text-[10px] text-slate-700 font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                CMD + ENTER TO EXECUTE
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={loading || !selectedSource || !question.trim()}
                                            className="w-full md:w-auto px-10 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all duration-500 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            <div className="relative flex items-center justify-center gap-3 font-bold uppercase tracking-widest">
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        Synthesizing Result...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                                        Execute Analysis
                                                    </>
                                                )}
                                            </div>
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Error Feedback */}
                        {error && (
                            <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-4 animate-in zoom-in-95">
                                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="h-6 w-6 text-rose-500" />
                                </div>
                                <div>
                                    <h4 className="text-rose-500 font-black text-sm tracking-tight uppercase">Execution Failed</h4>
                                    <p className="text-rose-400/80 text-sm leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Result Presentation */}
                        {result && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                                {/* Insight Visualization */}
                                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 shadow-2xl rounded-3xl overflow-hidden group">
                                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/20 p-6 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                                                <BarChart3 className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white text-lg">Visual Insights</CardTitle>
                                                <CardDescription className="text-slate-500 text-xs">
                                                    Generated based on {result.row_count} data points
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSaveQuery}
                                                disabled={saving || saveSuccess}
                                                className={`rounded-xl px-4 border-slate-700 h-9 transition-all duration-300 ${saveSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-950/20 hover:bg-slate-800 text-slate-300'}`}
                                            >
                                                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : saveSuccess ? <Check className="h-3.5 w-3.5 mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                                <span className="font-bold text-[10px] uppercase tracking-wider">{saveSuccess ? "Stored in Vault" : "Favorite Query"}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const csv = [
                                                        Object.keys(result.results[0]).join(","),
                                                        ...result.results.map((row: any) => Object.values(row).join(","))
                                                    ].join("\n");
                                                    const blob = new Blob([csv], { type: "text/csv" });
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement("a");
                                                    a.href = url;
                                                    a.download = `query-results-${new Date().getTime()}.csv`;
                                                    a.click();
                                                }}
                                                className="rounded-xl px-4 border-slate-700 bg-slate-950/20 hover:bg-slate-800 text-slate-300 h-9 transition-all"
                                            >
                                                <Download className="h-3.5 w-3.5 mr-2" />
                                                <span className="font-bold text-[10px] uppercase tracking-wider">Download Raw</span>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="h-[450px] w-full mt-4 bg-slate-950/30 rounded-2xl border border-slate-800/30 p-4 shadow-inner">
                                            <AutoChart
                                                data={result.results}
                                                recommendation={result.chart_recommendation}
                                            />
                                        </div>
                                        <div className="mt-8 p-6 rounded-2xl bg-slate-950/50 border border-slate-800/50 space-y-4">
                                            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-tighter">
                                                <Sparkles className="h-3 w-3" />
                                                AI Interpretation
                                            </div>
                                            <p className="text-slate-300 leading-relaxed text-sm italic pr-12">
                                                {result.explanation}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Technical Review: SQL */}
                                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50 shadow-2xl rounded-3xl overflow-hidden group">
                                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/20 p-6 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-600/10 border border-slate-500/20 flex items-center justify-center">
                                                <Code className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white text-lg">Query Protocol</CardTitle>
                                                {!feedbackSent && result.audit_log_id && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Helpful?</span>
                                                        <button
                                                            onClick={() => handleFeedback(1)}
                                                            className="text-slate-500 hover:text-emerald-400 p-1 rounded-md hover:bg-emerald-500/10 transition-colors"
                                                            title="Accurate SQL"
                                                        >
                                                            <ThumbsUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleFeedback(-1)}
                                                            className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors"
                                                            title="Inaccurate or logic error"
                                                        >
                                                            <ThumbsDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                {feedbackSent && (
                                                    <Badge variant="outline" className="mt-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black px-1.5 py-0">
                                                        Feedback Recorded
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                                                EXEC_TIME: {result.execution_time_ms.toFixed(1)}MS
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(result.sql_query);
                                                    toast.success("SQL copied to clipboard");
                                                }}
                                                className="h-8 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-2" />
                                                <span className="text-[10px] font-bold uppercase">Copy Protocol</span>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                            <pre className="relative bg-black rounded-xl p-6 overflow-x-auto text-[13px] text-indigo-100/90 font-mono leading-relaxed border border-slate-800 shadow-2xl">
                                                {result.sql_query}
                                            </pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
