"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Palette,
    BarChart3,
    UserPlus,
    Trash2,
    ChevronLeft,
    Shield,
    Zap,
    Download,
    Save,
    Moon,
    Sun,
    Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api";

interface AdminMetrics {
    total_queries: number;
    active_data_sources: number;
    member_count: number;
    role_distribution: Record<string, number>;
    storage_usage_bytes: number;
}

interface WorkspaceTheme {
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    dark_mode: boolean;
}

interface Member {
    user_id: string;
    email: string;
    name: string | null;
    role: string;
}

export default function WorkspaceAdminPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [theme, setTheme] = useState<WorkspaceTheme>({
        primary_color: "#7c3aed",
        secondary_color: "#4f46e5",
        logo_url: null,
        dark_mode: true
    });
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");

    const fetchAdminData = async () => {
        try {
            const [mRes, tRes, memRes] = await Promise.all([
                authenticatedFetch(`/api/workspaces/${workspaceId}/admin`),
                authenticatedFetch(`/api/workspaces/${workspaceId}/theme`),
                authenticatedFetch(`/api/workspaces/`) // To get member list via the workspace object
            ]);

            if (mRes.ok) setMetrics(await mRes.json());
            if (tRes.ok) setTheme(await tRes.json());

            if (memRes.ok) {
                const workspaces = await memRes.json();
                const currentWs = workspaces.find((w: any) => w.id === workspaceId);
                if (currentWs) setMembers(currentWs.members);
            }
        } catch (error) {
            console.error("Failed to load admin data", error);
            toast.error("Failed to load admin settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, [workspaceId]);

    const handleUpdateTheme = async () => {
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/workspaces/${workspaceId}/theme`, {
                method: "PUT",
                body: JSON.stringify(theme),
            });
            if (res.ok) {
                toast.success("Theme updated successfully");
                // Refresh page or update global context
                window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to update theme");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch(`/api/workspaces/${workspaceId}/members?email=${inviteEmail}&role=viewer`, {
                method: "POST"
            });
            if (res.ok) {
                toast.success(`Invited ${inviteEmail}`);
                setInviteEmail("");
                fetchAdminData();
            } else {
                toast.error("Could not invite user");
            }
        } catch (error) {
            toast.error("Invitation error");
        }
    };

    if (loading) return <div className="p-8 text-slate-500 animate-pulse">Initializing Admin Nexus...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/5">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Admin Console</h1>
                    <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">Workspace Control Center</p>
                </div>
            </div>

            <Tabs defaultValue="usage" className="w-full">
                <TabsList className="bg-slate-900/50 border border-slate-800 p-1 rounded-2xl mb-8">
                    <TabsTrigger value="usage" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white gap-2">
                        <BarChart3 className="h-4 w-4" /> Usage
                    </TabsTrigger>
                    <TabsTrigger value="members" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white gap-2">
                        <Users className="h-4 w-4" /> Members
                    </TabsTrigger>
                    <TabsTrigger value="theme" className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white gap-2">
                        <Palette className="h-4 w-4" /> Branded Theme
                    </TabsTrigger>
                </TabsList>

                {/* Usage Metrics Tab */}
                <TabsContent value="usage" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="h-12 w-12 text-violet-400" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px] text-slate-500">Total Tokens Executed</CardDescription>
                                <CardTitle className="text-4xl font-black text-white">{metrics?.total_queries.toLocaleString()}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-slate-400">Total analytical queries processed by LLM.</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield className="h-12 w-12 text-emerald-400" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px] text-slate-500">Active Connectors</CardDescription>
                                <CardTitle className="text-4xl font-black text-white">{metrics?.active_data_sources}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-slate-400">Connected database instances.</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="h-12 w-12 text-indigo-400" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px] text-slate-500">Team Scale</CardDescription>
                                <CardTitle className="text-4xl font-black text-white">{metrics?.member_count}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-1 mt-1">
                                    {Object.entries(metrics?.role_distribution || {}).map(([role, count]) => (
                                        <Badge key={role} variant="outline" className="text-[9px] uppercase border-slate-700 bg-slate-800/50">
                                            {role}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BarChart3 className="h-12 w-12 text-rose-400" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px] text-slate-500">SLA Availability</CardDescription>
                                <CardTitle className="text-4xl font-black text-white">99.9%</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-slate-400">Enterprise workspace status.</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Member Management Tab */}
                <TabsContent value="members" className="space-y-6">
                    <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden">
                        <CardHeader className="border-b border-slate-800/50 bg-slate-900/20 p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-white text-xl">Member Directory</CardTitle>
                                    <CardDescription>Manage your team and their access permissions.</CardDescription>
                                </div>
                                <form onSubmit={handleInvite} className="flex gap-2">
                                    <Input
                                        placeholder="email@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="bg-slate-950 border-slate-800 rounded-xl w-64"
                                    />
                                    <Button type="submit" className="bg-violet-600 hover:bg-violet-700 rounded-xl">
                                        <UserPlus className="h-4 w-4 mr-2" /> Invite
                                    </Button>
                                </form>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Joined</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {members.map((member) => (
                                            <tr key={member.user_id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white uppercase border border-white/5">
                                                            {member.email[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{member.name || member.email.split('@')[0]}</div>
                                                            <div className="text-xs text-slate-500">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={cn(
                                                        "text-[9px] uppercase font-black px-2 py-0.5 rounded-md",
                                                        member.role === 'admin' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                    )}>
                                                        {member.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium">Recently</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Theming Tab */}
                <TabsContent value="theme" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="bg-slate-900/40 border-slate-800 rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-white">Workspace Branding</CardTitle>
                                <CardDescription>Customize the visual appearance of QueryLite for your organization.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Primary Accent Color</Label>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="h-12 w-12 rounded-2xl shadow-lg border-2 border-white/10"
                                            style={{ backgroundColor: theme.primary_color }}
                                        />
                                        <Input
                                            type="text"
                                            value={theme.primary_color}
                                            onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                                            className="bg-slate-950 border-slate-800 font-mono text-center w-32 uppercase"
                                        />
                                        <Input
                                            type="color"
                                            value={theme.primary_color}
                                            onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                                            className="h-10 w-10 p-1 bg-transparent border-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Secondary Color</Label>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="h-12 w-12 rounded-2xl shadow-lg border-2 border-white/10"
                                            style={{ backgroundColor: theme.secondary_color }}
                                        />
                                        <Input
                                            type="text"
                                            value={theme.secondary_color}
                                            onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                                            className="bg-slate-950 border-slate-800 font-mono text-center w-32 uppercase"
                                        />
                                        <Input
                                            type="color"
                                            value={theme.secondary_color}
                                            onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
                                            className="h-10 w-10 p-1 bg-transparent border-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Logo URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://company.com/logo.png"
                                            value={theme.logo_url || ""}
                                            onChange={(e) => setTheme({ ...theme, logo_url: e.target.value })}
                                            className="bg-slate-950 border-slate-800"
                                        />
                                        <Button variant="outline" className="border-slate-800 bg-slate-900 rounded-xl px-3">
                                            <ImageIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-950/30 border border-slate-800 rounded-2xl mt-8">
                                    <div className="flex items-center gap-3">
                                        {theme.dark_mode ? <Moon className="h-5 w-5 text-violet-400" /> : <Sun className="h-5 w-5 text-amber-400" />}
                                        <div>
                                            <div className="text-sm font-bold text-white">Default Mode</div>
                                            <div className="text-xs text-slate-500">Force {theme.dark_mode ? 'Dark' : 'Light'} appearance.</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setTheme({ ...theme, dark_mode: !theme.dark_mode })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${theme.dark_mode ? 'bg-violet-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme.dark_mode ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <Button
                                    className="w-full mt-8 bg-violet-600 hover:bg-violet-700 h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-violet-600/20"
                                    onClick={handleUpdateTheme}
                                    disabled={isSaving}
                                >
                                    <Save className="h-4 w-4 mr-2" /> {isSaving ? "Synchronizing..." : "Preserve Branding"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Live Preview */}
                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Interface Preview</Label>
                            <div
                                className={cn(
                                    "border border-slate-800 rounded-3xl p-6 min-h-[400px] shadow-2xl relative overflow-hidden transition-colors",
                                    theme.dark_mode ? "bg-slate-950" : "bg-white"
                                )}
                            >
                                <div className="flex items-center justify-between mb-8">
                                    {theme.logo_url ? (
                                        <img src={theme.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: theme.primary_color }} />
                                            <span className={cn("font-black text-xs uppercase tracking-tighter", theme.dark_mode ? "text-white" : "text-black")}>QUERYLITE</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.secondary_color }} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className={cn("h-4 w-3/4 rounded-md opacity-20", theme.dark_mode ? "bg-white" : "bg-slate-200")} />
                                    <div className={cn("h-4 w-1/2 rounded-md opacity-20", theme.dark_mode ? "bg-white" : "bg-slate-200")} />

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="p-4 rounded-2xl border border-slate-800/50 space-y-2">
                                            <div className="h-8 w-8 rounded-lg opacity-20" style={{ backgroundColor: theme.primary_color }} />
                                            <div className={cn("h-2 w-full rounded opacity-10", theme.dark_mode ? "bg-white" : "bg-slate-900")} />
                                        </div>
                                        <div className="p-4 rounded-2xl border border-slate-800/50 space-y-2">
                                            <div className="h-8 w-8 rounded-lg opacity-20" style={{ backgroundColor: theme.secondary_color }} />
                                            <div className={cn("h-2 w-full rounded opacity-10", theme.dark_mode ? "bg-white" : "bg-slate-900")} />
                                        </div>
                                    </div>

                                    <div className="pt-8">
                                        <div
                                            className="h-10 w-full rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-white shadow-lg"
                                            style={{ background: `linear-gradient(45deg, ${theme.primary_color}, ${theme.secondary_color})` }}
                                        >
                                            Generate Insight
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 opacity-30 italic text-[10px] font-serif" style={{ color: theme.primary_color }}>
                                    &copy; Your Branding Powered by QueryLite
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(' '); }
