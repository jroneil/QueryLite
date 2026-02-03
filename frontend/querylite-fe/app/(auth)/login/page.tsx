"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Loader2, Mail, Lock, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl: "/" });
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
                    <p className="text-slate-500">Sign in to your account</p>
                </div>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-white text-xl">Welcome Back</CardTitle>
                        <CardDescription className="text-slate-400">Choose your preferred login method</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button
                            variant="outline"
                            className="w-full h-12 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 hover:text-white transition-all duration-300 gap-3"
                            onClick={handleGoogleLogin}
                        >
                            <Chrome className="h-5 w-5" />
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f172a] px-2 text-slate-500">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleCredentialsLogin} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}
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
                                        className="bg-slate-800/50 border-slate-700 text-white pl-10 focus:ring-violet-500 transition-all h-12"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                                    <Link href="#" className="text-xs text-violet-400 hover:text-violet-300">Forgot password?</Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-slate-800/50 border-slate-700 text-white pl-10 focus:ring-violet-500 transition-all h-12"
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20 font-semibold"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-slate-800 pt-6">
                        <p className="text-slate-400 text-sm">
                            Don't have an account?{" "}
                            <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-semibold underline-offset-4 hover:underline">
                                Create an account
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
