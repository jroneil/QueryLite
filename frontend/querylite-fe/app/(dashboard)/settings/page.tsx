"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/lib/api";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
    const { data: session } = useSession();
    const [maskingEnabled, setMaskingEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // In a real app, we would fetch current settings from the backend
    // For this demo, we'll just mock the toggle behavior

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        // Mock a 1s delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // This would ideally hit an endpoint like PATCH /api/settings/governance
        setMessage({ type: 'success', text: "Governance settings updated successfully." });
        setSaving(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-indigo-400" />
                    Governance & Security
                </h1>
                <p className="text-slate-400 font-medium">Configure system-wide administrative policies and data protection layers.</p>
            </div>

            <div className="grid gap-6">
                <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Lock className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">PII Masking</CardTitle>
                                <CardDescription className="text-slate-500">Automated redaction of sensitive data in query results.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                            <div className="space-y-1">
                                <Label className="text-white font-bold">Enabled Masking</Label>
                                <p className="text-xs text-slate-500 max-w-sm">
                                    When active, email addresses, phone numbers, and secrets will be redacted using the secure hashing layer.
                                </p>
                            </div>
                            <Button
                                variant={maskingEnabled ? "default" : "outline"}
                                onClick={() => setMaskingEnabled(!maskingEnabled)}
                                className={`rounded-xl px-6 h-10 font-bold uppercase tracking-widest text-[10px] transition-all ${maskingEnabled ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-transparent border-white/10 text-slate-500'}`}
                            >
                                {maskingEnabled ? (
                                    <><Eye className="mr-2 h-3.5 w-3.5" /> Active</>
                                ) : (
                                    <><EyeOff className="mr-2 h-3.5 w-3.5" /> Disabled</>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Protected Patterns</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {["Emails", "Phone Numbers", "SSN / Tax IDs", "Credit Cards"].map(pattern => (
                                    <div key={pattern} className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center gap-2 text-center">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{pattern}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Shield className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Role Hierarchy</CardTitle>
                                <CardDescription className="text-slate-500">Global defaults for new workspace invitations.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-4">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-amber-200 uppercase tracking-tight mb-1">Policy Note</p>
                                <p className="text-xs text-amber-200/60 leading-relaxed">
                                    Current workspace roles are managed within individual workspace settings. These settings only affect default access levels for external collaborators.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                            <div className="space-y-1">
                                <Label className="text-white font-bold">Default Invite Role</Label>
                                <p className="text-xs text-slate-500">Role assigned when generating public invite links.</p>
                            </div>
                            <select className="bg-slate-900 border-white/10 rounded-xl text-xs font-bold text-white px-4 py-2 focus:ring-indigo-500/20">
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-[2rem]">
                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`p-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-left-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <span className="text-xs font-bold">{message.text}</span>
                        </div>
                    )}
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 border-t border-white/10"
                >
                    {saving ? "Saving Changes..." : "Apply Governance Policy"}
                </Button>
            </div>
        </div>
    );
}
