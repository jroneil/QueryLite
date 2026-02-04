"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Download, X, AlertCircle } from "lucide-react";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";

interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    question: string;
    dataSourceId: string;
    filterContext?: {
        column: string;
        value: any;
    };
}

export function DrillDownModal({
    isOpen,
    onClose,
    title,
    question,
    dataSourceId,
    filterContext
}: DrillDownModalProps) {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Refine the question with the filter context
            let refinedQuestion = question;
            if (filterContext) {
                refinedQuestion += ` where ${filterContext.column} is ${filterContext.value}`;
            }

            const response = await authenticatedFetch("/api/query", {
                method: "POST",
                body: JSON.stringify({
                    question: refinedQuestion,
                    data_source_id: dataSourceId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
            } else {
                const errData = await response.json();
                setError(errData.detail || "Failed to fetch drill-down data");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, filterContext]);

    const columns = results.length > 0 ? Object.keys(results[0]) : [];

    const handleDownload = () => {
        if (results.length === 0) return;
        const headers = columns.join(",");
        const rows = results.map(row =>
            columns.map(col => JSON.stringify(row[col])).join(",")
        );
        const csv = [headers, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `drilldown_${new Date().getTime()}.csv`;
        a.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[80vh] bg-slate-900 border-slate-800 text-white flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-slate-800 flex flex-row justify-between items-center space-y-0">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            Drill Down: {title}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 mt-1">
                            Showing underlying data for {filterContext ? `${filterContext.column} = ${filterContext.value}` : "all categories"}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
                            <p className="text-slate-400 animate-pulse">Running analysis...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <AlertCircle className="h-10 w-10 text-rose-500 mb-4 opacity-50" />
                            <p className="text-slate-300 mb-4">{error}</p>
                            <Button variant="outline" onClick={fetchData} className="border-slate-700 bg-slate-800">
                                Try again
                            </Button>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            No matching records found.
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                            <Table>
                                <TableHeader className="bg-slate-900/50">
                                    <TableRow className="border-slate-800 hover:bg-transparent">
                                        {columns.map((col) => (
                                            <TableHead key={col} className="text-slate-300 font-bold uppercase text-[10px] tracking-wider py-4">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((row, i) => (
                                        <TableRow key={i} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            {columns.map((col) => (
                                                <TableCell key={col} className="text-slate-400 text-sm py-3">
                                                    {row[col]?.toString() ?? "-"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                        {results.length} total records returned
                    </span>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
                            Close
                        </Button>
                        <Button
                            onClick={handleDownload}
                            disabled={results.length === 0}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
