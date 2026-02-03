"use client";

import { Database, MessageSquareText, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const stats = [
    {
        title: "Data Sources",
        value: "0",
        description: "Connected databases",
        icon: Database,
        color: "from-blue-500 to-cyan-500",
    },
    {
        title: "Queries Run",
        value: "0",
        description: "Total queries executed",
        icon: MessageSquareText,
        color: "from-violet-500 to-purple-500",
    },
    {
        title: "Charts Created",
        value: "0",
        description: "Visualizations generated",
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-500",
    },
];

export default function DashboardPage() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Welcome to QueryLite
                </h1>
                <p className="text-slate-400">
                    Connect your databases and generate insights with natural language
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat) => (
                    <Card
                        key={stat.title}
                        className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300"
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">
                                {stat.title}
                            </CardTitle>
                            <div
                                className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg`}
                            >
                                <stat.icon className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-violet-500/50 transition-all duration-300 group">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Database className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Connect a Database</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Add your PostgreSQL connection
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 mb-4">
                            Start by connecting your PostgreSQL database. We'll securely store
                            your connection details and introspect the schema.
                        </p>
                        <Link href="/data-sources">
                            <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20">
                                <Database className="mr-2 h-4 w-4" />
                                Add Data Source
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-emerald-500/50 transition-all duration-300 group">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Ask a Question</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Query your data with natural language
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 mb-4">
                            Once connected, ask questions like "Show monthly revenue trends" and
                            we'll generate the SQL and visualize the results.
                        </p>
                        <Link href="/ask">
                            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20">
                                <MessageSquareText className="mr-2 h-4 w-4" />
                                Start Asking
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
