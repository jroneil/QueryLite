"use client";

import { useState, useEffect } from "react";
import { Database, Plus, Trash2, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface DataSource {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface TestResult {
    success: boolean;
    message: string;
    tables: string[] | null;
}

import { authenticatedFetch } from "@/lib/api";

export default function DataSourcesPage() {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [testingId, setTestingId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [connectionString, setConnectionString] = useState("");

    // Fetch data sources on mount
    useEffect(() => {
        fetchDataSources();
    }, []);

    const fetchDataSources = async () => {
        try {
            const response = await authenticatedFetch("/api/data-sources");
            if (response.ok) {
                const data = await response.json();
                setDataSources(data);
            }
        } catch (error) {
            console.error("Failed to fetch data sources:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const response = await authenticatedFetch("/api/data-sources", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description: description || null,
                    connection_string: connectionString,
                }),
            });

            if (response.ok) {
                setName("");
                setDescription("");
                setConnectionString("");
                setShowForm(false);
                fetchDataSources();
            }
        } catch (error) {
            console.error("Failed to create data source:", error);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this data source?")) return;

        try {
            const response = await authenticatedFetch(`/api/data-sources/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchDataSources();
            }
        } catch (error) {
            console.error("Failed to delete data source:", error);
        }
    };

    const handleTest = async (id: string) => {
        setTestingId(id);
        try {
            const response = await authenticatedFetch(`/api/data-sources/${id}/test`, {
                method: "POST",
            });
            if (response.ok) {
                const result = await response.json();
                setTestResults((prev) => ({ ...prev, [id]: result }));
            }
        } catch (error) {
            console.error("Failed to test connection:", error);
            setTestResults((prev) => ({
                ...prev,
                [id]: { success: false, message: "Connection failed", tables: null },
            }));
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Data Sources</h1>
                    <p className="text-slate-400">
                        Manage your connected PostgreSQL databases
                    </p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Data Source
                </Button>
            </div>

            {/* Add Form */}
            {showForm && (
                <Card className="bg-slate-900/50 border-slate-800 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white">New Data Source</CardTitle>
                        <CardDescription className="text-slate-400">
                            Add a new PostgreSQL database connection
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Database"
                                        required
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-slate-300">
                                        Description (optional)
                                    </Label>
                                    <Input
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Production analytics database"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="connectionString" className="text-slate-300">
                                    Connection String
                                </Label>
                                <Textarea
                                    id="connectionString"
                                    value={connectionString}
                                    onChange={(e) => setConnectionString(e.target.value)}
                                    placeholder="postgresql://user:password@host:5432/dbname"
                                    required
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">
                                    Your connection string is encrypted before storage.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={formLoading}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                                >
                                    {formLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Add Connection
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowForm(false)}
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Data Sources List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                </div>
            ) : dataSources.length === 0 ? (
                <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-slate-800 rounded-full mb-4">
                            <Database className="h-8 w-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-300 mb-2">
                            No data sources connected
                        </h3>
                        <p className="text-slate-500 text-center mb-4">
                            Add your first PostgreSQL database to start querying with natural
                            language.
                        </p>
                        <Button
                            onClick={() => setShowForm(true)}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Data Source
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {dataSources.map((ds) => (
                        <Card
                            key={ds.id}
                            className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all"
                        >
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-xl">
                                        <Database className="h-6 w-6 text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{ds.name}</h3>
                                        {ds.description && (
                                            <p className="text-sm text-slate-400">{ds.description}</p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            Added {new Date(ds.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {testResults[ds.id] && (
                                        <div className="flex items-center gap-2">
                                            {testResults[ds.id].success ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                                        {testResults[ds.id].tables?.length || 0} tables
                                                    </Badge>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                    <Badge className="bg-red-500/20 text-red-400">
                                                        Failed
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTest(ds.id)}
                                        disabled={testingId === ds.id}
                                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    >
                                        {testingId === ds.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        <span className="ml-2">Test</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(ds.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
