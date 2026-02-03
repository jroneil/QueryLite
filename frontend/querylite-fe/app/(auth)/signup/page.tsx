"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            if (response.ok) {
                router.push("/login?signup=success");
            } else {
                const data = await response.json();
                setError(data.detail || "Signup failed. Please try again.");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 font-sans">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-xl shadow-violet-500/20">
                        <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        QueryLite
                    </h1>
                    <p className="text-slate-500">Create your account to get started</p>
                </div>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-white text-xl">Join QueryLite</CardTitle>
                        <CardDescription className="text-slate-400">Start turning natural language into insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="bg-slate-800/50 border-slate-700 text-white pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-slate-800/50 border-slate-700 text-white pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-slate-800/50 border-slate-700 text-white pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20 font-semibold"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-slate-800 pt-6">
                        <p className="text-slate-400 text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1 group">
                                Sign in <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </p>
                    </CardFooter>
                </Card>

                <p className="text-center text-xs text-slate-600">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
