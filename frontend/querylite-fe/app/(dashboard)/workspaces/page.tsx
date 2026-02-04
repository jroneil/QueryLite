"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Shield, UserPlus, Trash2, Globe, Bell, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Member {
    user_id: string;
    email: string;
    name: string | null;
    role: string;
}

interface Workspace {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    webhook_url: string | null;
    webhook_enabled: boolean;
    created_at: string;
    members: Member[];
}

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");

    // Webhook settings state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const fetchWorkspaces = async () => {
        try {
            const res = await authenticatedFetch("/api/workspaces/");
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);
            }
        } catch (error) {
            console.error("Error fetching workspaces:", error);
            toast.error("Failed to load workspaces");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch("/api/workspaces/", {
                method: "POST",
                body: JSON.stringify({ name: newWorkspaceName, description: newWorkspaceDesc }),
            });

            if (res.ok) {
                setNewWorkspaceName("");
                setNewWorkspaceDesc("");
                fetchWorkspaces();
                toast.success("Workspace created!");
            }
        } catch (error) {
            toast.error("Failed to create workspace");
        }
    };

    const openSettings = (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
        setWebhookUrl(workspace.webhook_url || "");
        setWebhookEnabled(workspace.webhook_enabled);
        setIsSettingsOpen(true);
    };

    const handleSaveWebhook = async () => {
        if (!selectedWorkspace) return;
        setIsSavingSettings(true);
        try {
            const res = await authenticatedFetch(`/api/workspaces/${selectedWorkspace.id}/webhook`, {
                method: "PATCH",
                body: JSON.stringify({
                    webhook_url: webhookUrl,
                    webhook_enabled: webhookEnabled
                }),
            });

            if (res.ok) {
                toast.success("Webhook settings saved");
                setIsSettingsOpen(false);
                fetchWorkspaces();
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsSavingSettings(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Workspaces</h1>
                    <p className="text-slate-400 mt-1">Collaborate with your team on data insights.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Create New Workspace Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm border-dashed">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">New Team Space</CardTitle>
                        <CardDescription>Launch a new workspace for your organization.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateWorkspace} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">Name</Label>
                                <Input
                                    id="name"
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    placeholder="e.g. Marketing Team"
                                    className="bg-slate-950/50 border-slate-800 focus:ring-violet-500 text-white"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
                                <Plus className="mr-2 h-4 w-4" /> Create
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Existing Workspaces */}
                {workspaces.map((ws) => (
                    <Card key={ws.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-violet-500/50 transition-colors group">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-violet-600/10 rounded-lg">
                                    <Users className="h-5 w-5 text-violet-400" />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                                        {ws.members.length} Members
                                    </Badge>
                                    {ws.webhook_enabled && (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                            <Bell className="h-2.5 w-2.5 mr-1" /> Webhook Active
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardTitle className="text-white mt-4">{ws.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{ws.description || "No description provided."}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {ws.members.slice(0, 3).map((m) => (
                                    <div key={m.user_id} className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase" title={m.email}>
                                        {m.email[0]}
                                    </div>
                                ))}
                                {ws.members.length > 3 && (
                                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                        +{ws.members.length - 3}
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
                                <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800">
                                    <Users className="mr-2 h-3.5 w-3.5" /> Members
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
                                    onClick={() => openSettings(ws)}
                                >
                                    <Shield className="mr-2 h-3.5 w-3.5" /> Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {loading && (
                    <>
                        <div className="h-64 bg-slate-900/30 rounded-xl animate-pulse" />
                        <div className="h-64 bg-slate-900/30 rounded-xl animate-pulse" />
                    </>
                )}
            </div>

            {/* Webhook Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-violet-400" />
                            Workspace Settings: {selectedWorkspace?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Configure webhooks and integrations for this workspace.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Enable Outbound Webhooks</Label>
                                <p className="text-xs text-slate-500">Send notifications to external services on query events.</p>
                            </div>
                            <button
                                onClick={() => setWebhookEnabled(!webhookEnabled)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${webhookEnabled ? 'bg-violet-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${webhookEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="webhook_url" className="text-sm">Webhook URL (Slack, Discord, or Custom)</Label>
                            <Input
                                id="webhook_url"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hooks.slack.com/services/..."
                                className="bg-slate-950 border-slate-800"
                            />
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                We'll POST JSON payloads to this address for events like 'query_executed' and 'query_saved'.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700"
                            onClick={handleSaveWebhook}
                            disabled={isSavingSettings}
                        >
                            {isSavingSettings ? "Saving..." : "Save Settings"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
