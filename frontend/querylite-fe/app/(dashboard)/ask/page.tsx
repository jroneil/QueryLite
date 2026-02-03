"use client";

import { useState, useEffect } from "react";
import {
    MessageSquareText,
    Loader2,
    Code,
    BarChart3,
    AlertCircle,
    Sparkles,
    Copy,
    Save,
    Download,
    Check,
} from "lucide-react";
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

interface DataSource {
    id: string;
    name: string;
    description: string | null;
}

interface ChartRecommendation {
    chart_type: "bar" | "line" | "donut" | "table";
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
}

import { authenticatedFetch } from "@/lib/api";

export default function AskPage() {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QueryResponse | null>(null);
    const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchDataSources();
        checkLLMStatus();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSource || !question.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setSaveSuccess(false);

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
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Failed to execute query");
            }
        } catch (error) {
            setError("Failed to connect to the API");
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
                    name: question.length > 30 ? question.substring(0, 30) + "..." : question,
                    data_source_id: selectedSource,
                    natural_language_query: question,
                    generated_sql: result.sql_query,
                    chart_type: result.chart_recommendation.chart_type,
                }),
            });
            if (response.ok) {
                setSaveSuccess(true);
            }
        } catch (err) {
            console.error("Failed to save query:", err);
        } finally {
            setSaving(false);
        }
    };

    const exampleQuestions = [
        "Show me monthly revenue trends",
        "What are the top 10 products by sales?",
        "How many users signed up each month?",
        "Show revenue breakdown by category",
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Ask a Question</h1>
                <p className="text-slate-400">
                    Query your database using natural language
                </p>
            </div>

            {/* LLM Status Warning */}
            {llmConfigured === false && (
                <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="text-amber-400 font-medium">LLM Not Configured</p>
                            <p className="text-amber-400/70 text-sm">
                                Set OPENAI_API_KEY in your .env file to enable natural language
                                queries.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Query Form */}
            <Card className="bg-slate-900/50 border-slate-800 mb-8">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-400" />
                        Natural Language Query
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Describe what you want to know and we'll generate the SQL for you
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Data Source Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="dataSource" className="text-slate-300">
                                Data Source
                            </Label>
                            {dataSources.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    No data sources connected. Add one first.
                                </p>
                            ) : (
                                <select
                                    id="dataSource"
                                    value={selectedSource}
                                    onChange={(e) => setSelectedSource(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    {dataSources.map((ds) => (
                                        <option key={ds.id} value={ds.id}>
                                            {ds.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Question Input */}
                        <div className="space-y-2">
                            <Label htmlFor="question" className="text-slate-300">
                                Your Question
                            </Label>
                            <Textarea
                                id="question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="e.g., Show me the monthly revenue trends for the past year"
                                rows={3}
                                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* Example Questions */}
                        <div className="flex flex-wrap gap-2">
                            {exampleQuestions.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => setQuestion(q)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading || !selectedSource || !question.trim()}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <MessageSquareText className="mr-2 h-4 w-4" />
                                    Ask Question
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Card className="bg-red-500/10 border-red-500/30 mb-8">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* SQL Query */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                    <Code className="h-5 w-5 text-violet-400" />
                                    Generated SQL
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(result.sql_query);
                                        }}
                                        className="text-slate-400 hover:text-white hover:bg-slate-800 h-8"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy
                                    </Button>
                                    <Badge className="bg-violet-500/20 text-violet-400">
                                        {result.execution_time_ms.toFixed(1)}ms
                                    </Badge>
                                </div>
                            </div>
                            <CardDescription className="text-slate-400">
                                {result.explanation}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono border border-slate-800">
                                {result.sql_query}
                            </pre>
                        </CardContent>
                    </Card>

                    {/* Chart Visualization */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                                    Analysis Results
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSaveQuery}
                                        disabled={saving || saveSuccess}
                                        className={`border-slate-700 h-8 ${saveSuccess ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-300'}`}
                                    >
                                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : saveSuccess ? <Check className="h-3 w-3 mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                                        {saveSuccess ? "Saved" : "Save Query"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const csv = [
                                                Object.keys(result.results[0]).join(","),
                                                ...result.results.map(row => Object.values(row).join(","))
                                            ].join("\n");
                                            const blob = new Blob([csv], { type: "text/csv" });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `query-results-${new Date().getTime()}.csv`;
                                            a.click();
                                        }}
                                        className="border-slate-700 text-slate-300 h-8 hover:bg-slate-800"
                                    >
                                        <Download className="h-3 w-3 mr-2" />
                                        Export CSV
                                    </Button>
                                    <Badge className="bg-emerald-500/20 text-emerald-400">
                                        {result.row_count} rows
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <AutoChart
                                data={result.results}
                                recommendation={result.chart_recommendation}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
    );
}
