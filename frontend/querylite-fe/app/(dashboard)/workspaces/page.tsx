"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Shield, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api";


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
    created_at: string;
    members: Member[];
}

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");

    const fetchWorkspaces = async () => {
        try {
            const res = await authenticatedFetch("/api/workspaces/");


            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);
            }
        } catch (error) {
            console.error("Error fetching workspaces:", error);
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
                // toast.success("Workspace created!");
            }
        } catch (error) {
            // toast.error("Failed to create workspace");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Workspaces</h1>
                    <p className="text-slate-400 mt-1">Collaborate with your team on data insights.</p>
                </div>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20">
                    <Plus className="mr-2 h-4 w-4" /> Create Workspace
                </Button>
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
                                <Badge variant="outline" className="border-slate-700 text-slate-400">
                                    {ws.members.length} Members
                                </Badge>
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
                                <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800">
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
        </div>
    );
}
