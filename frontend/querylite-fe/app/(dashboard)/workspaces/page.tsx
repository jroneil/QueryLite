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

    // SSO settings state
    const [ssoProvider, setSsoProvider] = useState("Okta");
    const [ssoIssuer, setSsoIssuer] = useState("");
    const [ssoClientId, setSsoClientId] = useState("");
    const [ssoClientSecret, setSsoClientSecret] = useState("");
    const [ssoDomains, setSsoDomains] = useState("");
    const [isSsoActive, setIsSsoActive] = useState(true);

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

    const openSettings = async (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
        setWebhookUrl(workspace.webhook_url || "");
        setWebhookEnabled(workspace.webhook_enabled);

        // Fetch SSO Config
        try {
            const res = await authenticatedFetch(`/api/sso/${workspace.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setSsoProvider(data.provider_name);
                    setSsoIssuer(data.issuer_url);
                    setSsoClientId(data.client_id);
                    setSsoDomains(data.domain_allowlist?.join(", ") || "");
                    setIsSsoActive(data.is_active);
                    // Secret is never sent back in plain text preferably, or we show placeholder
                    setSsoClientSecret("••••••••");
                } else {
                    // Reset
                    setSsoProvider("Okta");
                    setSsoIssuer("");
                    setSsoClientId("");
                    setSsoClientSecret("");
                    setSsoDomains("");
                }
            }
        } catch (err) {
            console.error("Failed to fetch SSO config:", err);
        }

        setIsSettingsOpen(true);
    };

    const handleSaveSettings = async () => {
        if (!selectedWorkspace) return;
        setIsSavingSettings(true);
        try {
            // 1. Save Webhook
            const webhookRes = await authenticatedFetch(`/api/workspaces/${selectedWorkspace.id}/webhook`, {
                method: "PATCH",
                body: JSON.stringify({
                    webhook_url: webhookUrl,
                    webhook_enabled: webhookEnabled
                }),
            });

            // 2. Save SSO if fields are filled
            let ssoRes = { ok: true };
            if (ssoIssuer && ssoClientId) {
                ssoRes = await authenticatedFetch(`/api/sso/${selectedWorkspace.id}`, {
                    method: "POST",
                    body: JSON.stringify({
                        provider_name: ssoProvider,
                        issuer_url: ssoIssuer,
                        client_id: ssoClientId,
                        client_secret: ssoClientSecret === "••••••••" ? "" : ssoClientSecret, // Logic to avoid overwriting secret with dots
                        domain_allowlist: ssoDomains.split(",").map(d => d.trim()).filter(d => d),
                        group_mapping: {} // Placeholder for group mapping UI
                    }),
                });
            }

            if (webhookRes.ok && ssoRes.ok) {
                toast.success("All settings saved successfully");
                setIsSettingsOpen(false);
                fetchWorkspaces();
            } else {
                toast.error("Some settings failed to save");
            }
        } catch (error) {
            toast.error("Network error saving settings");
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

                    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outbound Webhooks</h3>
                            <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium">Enable Notifications</Label>
                                    <p className="text-xs text-slate-500">Send alerts to Slack/Discord.</p>
                                </div>
                                <button
                                    onClick={() => setWebhookEnabled(!webhookEnabled)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${webhookEnabled ? 'bg-violet-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${webhookEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="webhook_url" className="text-xs text-slate-400">Webhook URL</Label>
                                <Input
                                    id="webhook_url"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://hooks.slack.com/services/..."
                                    className="bg-slate-950 border-slate-800 h-10 text-sm"
                                />
                            </div>
                        </section>

                        <div className="border-t border-slate-800 my-2" />

                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Single Sign-On (OIDC)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Provider</Label>
                                    <select
                                        value={ssoProvider}
                                        onChange={(e) => setSsoProvider(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-md h-10 px-3 text-sm"
                                    >
                                        <option value="Okta">Okta</option>
                                        <option value="Azure AD">Azure AD / Entra</option>
                                        <option value="Custom">Custom OIDC</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Status</Label>
                                    <div className="flex items-center h-10 px-3 bg-slate-950 border border-slate-800 rounded-md">
                                        <span className={`h-2 w-2 rounded-full mr-2 ${isSsoActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                        <span className="text-sm">{isSsoActive ? 'Active' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Issuer URL (Discovery Endpoint)</Label>
                                <Input
                                    value={ssoIssuer}
                                    onChange={(e) => setSsoIssuer(e.target.value)}
                                    placeholder="https://dev-1234.okta.com/oauth2/default"
                                    className="bg-slate-950 border-slate-800 h-10 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Client ID</Label>
                                    <Input
                                        value={ssoClientId}
                                        onChange={(e) => setSsoClientId(e.target.value)}
                                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Client Secret</Label>
                                    <Input
                                        type="password"
                                        value={ssoClientSecret}
                                        onChange={(e) => setSsoClientSecret(e.target.value)}
                                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Allowed Email Domains (comma separated)</Label>
                                <Input
                                    value={ssoDomains}
                                    onChange={(e) => setSsoDomains(e.target.value)}
                                    placeholder="company.com, partner.io"
                                    className="bg-slate-950 border-slate-800 h-10 text-sm"
                                />
                                <p className="text-[10px] text-slate-500 italic">Used for login page auto-discovery.</p>
                            </div>
                        </section>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700"
                            onClick={handleSaveSettings}
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
