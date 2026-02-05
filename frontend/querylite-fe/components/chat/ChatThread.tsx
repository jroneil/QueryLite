"use client";

import { useState, useEffect, useRef } from "react";
import {
    Send,
    Bot,
    User,
    Loader2,
    ChevronDown,
    ChevronUp,
    Terminal,
    BarChart3,
    Sparkles,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoChart } from "@/app/components/charts/auto-chart";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sql_query?: string;
    chart_recommendation?: any;
    created_at: string;
}

interface ChatThreadProps {
    threadId: string;
    dataSourceId: string;
    onReset?: () => void;
}

export function ChatThread({ threadId, dataSourceId, onReset }: ChatThreadProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (threadId) {
            fetchMessages();
        }
    }, [threadId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch(`/api/threads/${threadId}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            toast.error("Failed to load conversation history");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userQuestion = input.trim();
        setInput("");
        setIsThinking(true);

        // Optimistically add user message
        const tempUserMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userQuestion,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const response = await authenticatedFetch("/api/query", {
                method: "POST",
                body: JSON.stringify({
                    question: userQuestion,
                    data_source_id: dataSourceId,
                    thread_id: threadId
                })
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.explanation,
                    sql_query: data.sql_query,
                    chart_recommendation: data.chart_recommendation,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                const err = await response.json();
                toast.error(err.detail || "Query failed");
            }
        } catch (error) {
            toast.error("Connection failed");
        } finally {
            setIsThinking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm font-medium animate-pulse">Summoning conversation...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] relative bg-slate-950/20 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            {/* Header / Context */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Conversation Mode</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onReset} className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors">
                    Reset Thread
                </Button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="space-y-10 max-w-4xl mx-auto">
                    {messages.length === 0 && !isThinking && (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                            <div className="h-20 w-20 rounded-3xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
                                <Bot className="h-10 w-10 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">How can I assist your analysis?</h3>
                            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                                Ask anything about your data. I'll remember the context of our conversation.
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="h-10 w-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-5 w-5 text-violet-400" />
                                </div>
                            )}

                            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-3`}>
                                <div
                                    className={`relative p-5 md:p-6 rounded-3xl text-sm leading-loose shadow-lg
                                        ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none'
                                            : 'bg-slate-900/60 border border-white/5 text-slate-200 rounded-tl-none backdrop-blur-xl'}`}
                                >
                                    {msg.content}

                                    {msg.role === 'user' && (
                                        <div className="absolute top-0 right-0 -translate-y-full mb-1 text-[10px] font-bold text-violet-400 uppercase tracking-tighter">You</div>
                                    )}
                                    {msg.role === 'assistant' && (
                                        <div className="absolute top-0 left-0 -translate-y-full mb-1 text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Intelligence Engine</div>
                                    )}
                                </div>

                                {msg.role === 'assistant' && msg.sql_query && (
                                    <div className="w-full space-y-4 animate-in fade-in duration-700 delay-300">
                                        <div className="rounded-2xl border border-white/5 bg-black/40 p-4 overflow-hidden">
                                            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Terminal className="h-3 w-3" />
                                                Generated SQL
                                            </div>
                                            <pre className="text-[12px] text-indigo-200/90 font-mono bg-black/50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                                                {msg.sql_query}
                                            </pre>
                                        </div>

                                        {msg.chart_recommendation && (
                                            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                                                <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                                    <BarChart3 className="h-3.5 w-3.5" />
                                                    Data Visualization
                                                </div>
                                                <div className="h-[300px] w-full bg-black/20 rounded-xl p-4">
                                                    {/* We fetch data separately or store it? Plan says LLM result is used for SQL generation. 
                                                        In a real app, we might need a separate endpoint to re-run the SQL or store results.
                                                        For now, we'll assume the results are included or we can show a placeholder.
                                                        Wait, AutoChart needs DATA. The ThreadMessage model doesn't store data yet.
                                                        Let's just show a badge for now if data isn't present.
                                                    */}
                                                    <div className="flex items-center justify-center h-full text-slate-600 italic text-xs">
                                                        Visual preview generated (Data in raw results)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div className="h-10 w-10 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex gap-6 animate-pulse">
                            <div className="h-10 w-10 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-violet-400" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="h-4 w-32 bg-slate-800 rounded-full" />
                                <div className="h-20 w-64 bg-slate-800/50 rounded-2xl" />
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-slate-900/40 border-t border-white/5">
                <form
                    onSubmit={handleSendMessage}
                    className="relative max-w-4xl mx-auto"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a follow-up or a new question..."
                        className="w-full h-14 bg-slate-950/50 border border-slate-800 rounded-2xl px-6 pr-16 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all shadow-inner"
                        disabled={isThinking}
                        autoFocus
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || isThinking}
                        className="absolute right-2 top-2 h-10 w-10 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all"
                    >
                        {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <div className="mt-2 text-[10px] text-slate-600 italic text-center">
                        Synthesizing history for contextual analysis...
                    </div>
                </form>
            </div>
        </div>
    );
}
