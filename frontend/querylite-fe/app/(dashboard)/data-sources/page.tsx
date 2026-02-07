"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { FileUploadZone } from "@/components/data-sources/FileUploadZone";
import { FileText, Database, Plus, Trash2, CheckCircle, XCircle, Loader2, RefreshCw, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DataSource {
    id: string;
    name: string;
    description: string | null;
    type: string;
    file_path?: string;
    workspace_id: string | null;
    created_at: string;
    updated_at: string;
}

interface WorkspaceMember {
    user_id: string;
    email?: string;
    role: string;
}

interface Workspace {
    id: string;
    name: string;
    members: WorkspaceMember[];
}

interface TestResult {
    success: boolean;
    message: string;
    tables: string[] | null;
}

import { authenticatedFetch } from "@/lib/api";
import { useSession } from "next-auth/react";

export default function DataSourcesPage() {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [testingId, setTestingId] = useState<string | null>(null);
    const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [connectionString, setConnectionString] = useState("");
    const [provisionMode, setProvisionMode] = useState<"database" | "file">("database");
    const [dbType, setDbType] = useState<"postgresql" | "mysql" | "mongodb" | "bigquery" | "snowflake">("postgresql");

    // Cloud Warehouse specific state
    const [bqJson, setBqJson] = useState("");
    const [bqProjectId, setBqProjectId] = useState("");

    const [sfAccount, setSfAccount] = useState("");
    const [sfUser, setSfUser] = useState("");
    const [sfPassword, setSfPassword] = useState("");
    const [sfWarehouse, setSfWarehouse] = useState("");
    const [sfDatabase, setSfDatabase] = useState("");
    const [sfSchema, setSfSchema] = useState("PUBLIC");
    const [sfRole, setSfRole] = useState("");
    const { data: session } = useSession();

    const currentRole = session?.user?.email && selectedWorkspaceId
        ? userWorkspaces.find(ws => ws.id === selectedWorkspaceId)
            ?.members.find(m => m.user_id === session.user?.email || m.email === session.user?.email)?.role
        : "admin"; // Default to admin for personal space

    const canEdit = currentRole === "admin" || currentRole === "editor";

    // Fetch data and workspaces on mount
    useEffect(() => {
        fetchDataSources();
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const response = await authenticatedFetch("/api/workspaces/");
            if (response.ok) {
                const data = await response.json();
                setUserWorkspaces(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspaces:", error);
        }
    };

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
            const body: any = {
                name,
                description: description || null,
                connection_string: connectionString,
                type: dbType,
                workspace_id: selectedWorkspaceId,
            };

            // Handle cloud warehouse configs
            if (dbType === "bigquery") {
                body.config = { service_account_json: bqJson };
                body.connection_string = ""; // Not used for BQ
            } else if (dbType === "snowflake") {
                body.config = {
                    account: sfAccount,
                    user: sfUser,
                    password: sfPassword,
                    warehouse: sfWarehouse,
                    database: sfDatabase,
                    schema: sfSchema,
                    role: sfRole
                };
                body.connection_string = ""; // Not used for Snowflake
            }

            const response = await authenticatedFetch("/api/data-sources", {
                method: "POST",
                body: JSON.stringify(body),
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
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                            <Database className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none">
                            Data <span className="text-indigo-400">Foundry</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 font-medium opacity-80 pl-1 max-w-xl">
                        Forge connections to your data architecture and provision them for AI analysis.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Workspace Selector (Simplified) */}
                    {userWorkspaces.length > 0 && (
                        <div className="p-1 bg-slate-900 border border-white/5 rounded-2xl flex items-center">
                            <span className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Context</span>
                            <select
                                className="bg-transparent text-white text-xs font-bold border-none focus:ring-0 cursor-pointer pr-8"
                                onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
                            >
                                <option value="">Personal</option>
                                {userWorkspaces.map(ws => (
                                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {canEdit && (
                        <Button
                            onClick={() => setShowForm(!showForm)}
                            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all border-t border-white/10 group"
                        >
                            <Plus className={`h-4 w-4 mr-2 transition-transform duration-500 ${showForm ? 'rotate-45' : ''}`} />
                            {showForm ? 'Cancel Provisioning' : 'Provision Source'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Add Form with Glassmorphism */}
            {
                showForm && (
                    <div className="animate-in slide-in-from-top-6 duration-500">
                        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
                            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-48 w-48 bg-indigo-600/10 blur-[80px] rounded-full" />

                            <CardHeader className="p-8 border-b border-white/5 relative z-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                            <Plus className="h-5 w-5 text-indigo-400" />
                                            Provision New Source
                                        </CardTitle>
                                        <CardDescription className="text-slate-500 font-medium">
                                            Choose your protocol and establish a connection.
                                        </CardDescription>
                                    </div>
                                    <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                                        <button
                                            onClick={() => setProvisionMode("database")}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${provisionMode === 'database' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Database
                                        </button>
                                        <button
                                            onClick={() => setProvisionMode("file")}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${provisionMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Local File
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 relative z-10">
                                {provisionMode === "database" ? (
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                Select Engine
                                            </Label>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                {[
                                                    { id: 'postgresql', name: 'Postgres', icon: Database, color: 'text-indigo-400' },
                                                    { id: 'mysql', name: 'MySQL', icon: Database, color: 'text-blue-400' },
                                                    { id: 'mongodb', name: 'Mongo', icon: Database, color: 'text-emerald-400' },
                                                    { id: 'bigquery', name: 'BigQuery', icon: Database, color: 'text-orange-400' },
                                                    { id: 'snowflake', name: 'Snowflake', icon: Database, color: 'text-cyan-400' },
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => setDbType(type.id as any)}
                                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${dbType === type.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-950/30 border-white/5 hover:border-white/10'}`}
                                                    >
                                                        <type.icon className={`h-5 w-5 ${type.color}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${dbType === type.id ? 'text-white' : 'text-slate-500'}`}>
                                                            {type.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Foundry Alias
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={name}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                                    placeholder="E.g. Enterprise Warehouse"
                                                    required
                                                    className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-indigo-500/20 shadow-inner px-4 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="description" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Operational Brief
                                                </Label>
                                                <Input
                                                    id="description"
                                                    value={description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                                                    placeholder="E.g. Global sales and inventory data"
                                                    className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-indigo-500/20 shadow-inner px-4 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {dbType === 'bigquery' ? (
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                        Service Account Key (JSON)
                                                    </Label>
                                                    <Textarea
                                                        value={bqJson}
                                                        onChange={(e) => setBqJson(e.target.value)}
                                                        placeholder='{ "type": "service_account", ... }'
                                                        className="min-h-[200px] bg-slate-950/50 border-slate-800 text-orange-100 rounded-2xl focus:ring-orange-500/20 shadow-inner p-6 font-mono text-xs leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        ) : dbType === 'snowflake' ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">Account (e.g. xy12345.us-east-1)</Label>
                                                        <Input value={sfAccount} onChange={(e) => setSfAccount(e.target.value)} className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">Warehouse</Label>
                                                        <Input value={sfWarehouse} onChange={(e) => setSfWarehouse(e.target.value)} className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">Database</Label>
                                                        <Input value={sfDatabase} onChange={(e) => setSfDatabase(e.target.value)} className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">User</Label>
                                                        <Input value={sfUser} onChange={(e) => setSfUser(e.target.value)} className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">Password</Label>
                                                        <Input type="password" value={sfPassword} onChange={(e) => setSfPassword(e.target.value)} className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-slate-400 uppercase tracking-wider">Schema (Optional)</Label>
                                                        <Input value={sfSchema} onChange={(e) => setSfSchema(e.target.value)} placeholder="PUBLIC" className="bg-slate-950 border-slate-800 text-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Label htmlFor="connectionString" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Protocol Specification (Connection URL)
                                                </Label>
                                                <div className="relative group">
                                                    <Textarea
                                                        id="connectionString"
                                                        value={connectionString}
                                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConnectionString(e.target.value)}
                                                        placeholder={
                                                            dbType === 'mongodb'
                                                                ? "mongodb://user:password@host:27017/dbname"
                                                                : dbType === 'mysql'
                                                                    ? "mysql://user:password@host:3306/dbname"
                                                                    : "postgresql://user:password@host:5432/dbname"
                                                        }
                                                        required
                                                        className="min-h-[100px] bg-slate-950/50 border-slate-800 text-indigo-100 rounded-2xl focus:ring-indigo-500/20 shadow-inner p-6 font-mono text-sm leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                                                Encryption Layer Active
                                            </p>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <Button
                                                type="submit"
                                                disabled={formLoading}
                                                className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all border-t border-white/5"
                                            >
                                                {formLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Database className="mr-2 h-4 w-4" />
                                                        Establish Nexus
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setShowForm(false)}
                                                className="h-12 px-8 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                                            >
                                                Abort
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <FileUploadZone
                                        onSuccess={() => {
                                            setShowForm(false);
                                            fetchDataSources();
                                        }}
                                        onCancel={() => setShowForm(false)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* List Section */}
            {
                loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[40px] rounded-full animate-pulse" />
                            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin relative" />
                        </div>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">Scanning Foundation...</p>
                    </div>
                ) : dataSources.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full" />
                            <div className="relative h-24 w-24 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                                <Database className="h-10 w-10 text-slate-700" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">No Active Foundry</h3>
                        <p className="text-slate-500 font-medium max-w-sm mb-10 leading-relaxed">
                            The intelligence engine requires a PostgreSQL, MySQL, or MongoDB source to begin synthesis.
                        </p>
                        <Button
                            onClick={() => setShowForm(true)}
                            className="rounded-2xl h-12 px-8 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold uppercase tracking-widest text-xs"
                        >
                            <Plus className="h-4 w-4 mr-3" />
                            Add First Source
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {dataSources.map((ds) => (
                            <div
                                key={ds.id}
                                className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-8 gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-center group-hover:border-indigo-500/30 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all">
                                            {ds.type === 'duckdb' ? (
                                                <FileText className="h-7 w-7 text-slate-500 group-hover:text-amber-400 transition-colors" />
                                            ) : ds.type === 'mongodb' ? (
                                                <Database className="h-7 w-7 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                            ) : ds.type === 'mysql' ? (
                                                <Database className="h-7 w-7 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                            ) : (
                                                <Database className="h-7 w-7 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">{ds.name}</h3>
                                                {ds.type === 'duckdb' ? (
                                                    <Badge variant="outline" className="bg-amber-500/5 text-amber-500/80 border-amber-500/20 text-[8px] uppercase font-black px-2 tracking-widest rounded-lg">
                                                        LOCAL_FILE
                                                    </Badge>
                                                ) : ds.type === 'bigquery' ? (
                                                    <Badge variant="outline" className="bg-orange-500/5 text-orange-500/80 border-orange-500/20 text-[8px] uppercase font-black px-2 tracking-widest rounded-lg">
                                                        BIGQUERY
                                                    </Badge>
                                                ) : ds.type === 'snowflake' ? (
                                                    <Badge variant="outline" className="bg-cyan-500/5 text-cyan-500/80 border-cyan-500/20 text-[8px] uppercase font-black px-2 tracking-widest rounded-lg">
                                                        SNOWFLAKE
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className={`bg-${ds.type === 'mongodb' ? 'emerald' : ds.type === 'mysql' ? 'blue' : 'indigo'}-500/5 text-${ds.type === 'mongodb' ? 'emerald' : ds.type === 'mysql' ? 'blue' : 'indigo'}-500/80 border-${ds.type === 'mongodb' ? 'emerald' : ds.type === 'mysql' ? 'blue' : 'indigo'}-500/20 text-[8px] uppercase font-black px-2 tracking-widest rounded-lg`}>
                                                        {ds.type?.toUpperCase()}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-slate-400 font-medium text-sm mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {ds.description || "Synthesizing core database telemetry."}
                                            </p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    PROVISIONED {new Date(ds.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                                        {testResults[ds.id] && (
                                            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/50 border border-slate-800/50 animate-in zoom-in-95">
                                                {testResults[ds.id].success ? (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-tight">
                                                            {testResults[ds.id].tables?.length || 0} Tables Linked
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="h-4 w-4 text-rose-500" />
                                                        <span className="text-xs font-bold text-rose-400 uppercase tracking-tight">
                                                            Protocol Error
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTest(ds.id)}
                                            disabled={testingId === ds.id}
                                            className="h-10 px-5 border-slate-700 bg-slate-950/20 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-bold uppercase text-[10px] tracking-widest transition-all"
                                        >
                                            {testingId === ds.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                            )}
                                            {testingId === ds.id ? "Syncing..." : "Sync Health"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(ds.id)}
                                            className="h-10 w-10 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
