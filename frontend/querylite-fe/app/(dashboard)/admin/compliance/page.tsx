"use client";

import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/lib/api";
import { Shield, Search, AlertTriangle, CheckCircle2, Clock, Play, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DeletionRequest {
    id: string;
    user_email: string;
    status: "pending" | "processing" | "completed" | "failed";
    notes: string | null;
    created_at: string;
    completed_at: string | null;
}

export default function CompliancePage() {
    const [requests, setRequests] = useState<DeletionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [creating, setCreating] = useState(false);
    const [executing, setExecuting] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await authenticatedFetch("/compliance/deletion-requests");
            const data = await response.json();
            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]);
            }
        } catch (error) {
            toast.error("Failed to load deletion requests");
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const createRequest = async () => {
        if (!newEmail.trim()) {
            toast.error("Please enter a valid email address");
            return;
        }
        setCreating(true);
        try {
            await authenticatedFetch("/compliance/deletion-request", {
                method: "POST",
                body: JSON.stringify({ user_email: newEmail, notes: newNotes }),
            });
            toast.success("Deletion request created successfully");
            setNewEmail("");
            setNewNotes("");
            fetchRequests();
        } catch (error) {
            toast.error("Failed to create deletion request");
        } finally {
            setCreating(false);
        }
    };

    const executeRequest = async (requestId: string) => {
        setExecuting(requestId);
        try {
            await authenticatedFetch(`/compliance/deletion-requests/${requestId}/execute`, {
                method: "POST",
            });
            toast.success("Deletion request executed successfully");
            fetchRequests();
        } catch (error) {
            toast.error("Failed to execute deletion request");
        } finally {
            setExecuting(null);
        }
    };

    const getStatusBadge = (status: DeletionRequest["status"]) => {
        const styles = {
            pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            failed: "bg-red-500/20 text-red-400 border-red-500/30",
        };
        const icons = {
            pending: <Clock className="w-3 h-3" />,
            processing: <Loader2 className="w-3 h-3 animate-spin" />,
            completed: <CheckCircle2 className="w-3 h-3" />,
            failed: <AlertTriangle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${styles[status]}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-violet-600/20">
                    <Shield className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">GDPR/CCPA Compliance</h1>
                    <p className="text-slate-400 text-sm">Manage data deletion requests for Right to be Forgotten</p>
                </div>
            </div>

            {/* Create New Request */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white">New Deletion Request</CardTitle>
                    <CardDescription>Submit a request to delete all personal data for a user</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">User Email</Label>
                            <Input
                                type="email"
                                placeholder="user@example.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Notes (optional)</Label>
                            <Input
                                placeholder="Reason for deletion..."
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                    </div>
                    <Button onClick={createRequest} disabled={creating} className="bg-violet-600 hover:bg-violet-700">
                        {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Create Request
                    </Button>
                </CardContent>
            </Card>

            {/* Requests List */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Deletion Requests</CardTitle>
                    <CardDescription>{requests.length} request(s) on file</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No deletion requests found</div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-slate-700/50">
                                            <User className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{req.user_email}</p>
                                            <p className="text-sm text-slate-500">
                                                Created: {mounted ? new Date(req.created_at).toLocaleDateString() : 'Loading...'}
                                                {mounted && req.completed_at && ` • Completed: ${new Date(req.completed_at).toLocaleDateString()}`}
                                            </p>
                                            {req.notes && <p className="text-xs text-slate-500 mt-1">{req.notes}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(req.status)}
                                        {req.status === "pending" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => executeRequest(req.id)}
                                                disabled={executing === req.id}
                                                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                            >
                                                {executing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                Execute
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
