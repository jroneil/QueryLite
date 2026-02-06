"use client";

import { useState, useEffect } from "react";
import {
    Filter,
    Plus,
    X,
    Calendar as CalendarIcon,
    Tag,
    Check,
    ChevronDown,
    Trash2,
    Loader2,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DashboardFilter {
    id: string;
    filter_type: "date_range" | "category";
    column_name: string;
    label: string;
    default_value?: string;
}

interface DashboardFiltersProps {
    dashboardId: string;
    onFiltersChange: (activeFilters: Record<string, any>) => void;
    externalFilters?: Record<string, any>;
}

export function DashboardFilters({ dashboardId, onFiltersChange, externalFilters }: DashboardFiltersProps) {
    const [filters, setFilters] = useState<DashboardFilter[]>([]);
    const [activeValues, setActiveValues] = useState<Record<string, any>>({});
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // New filter form state
    const [newFilterType, setNewFilterType] = useState<"date_range" | "category">("category");
    const [newFilterColumn, setNewFilterColumn] = useState("");
    const [newFilterLabel, setNewFilterLabel] = useState("");

    useEffect(() => {
        fetchFilters();
    }, [dashboardId]);

    useEffect(() => {
        if (externalFilters) {
            // Merge external filters into active values
            setActiveValues(prev => ({ ...prev, ...externalFilters }));
        }
    }, [externalFilters]);

    const fetchFilters = async () => {
        try {
            const res = await authenticatedFetch(`/api/dashboards/${dashboardId}/filters`);
            if (res.ok) {
                const data = await res.json();
                setFilters(data);

                // Initialize active values from defaults
                const initialValues: Record<string, any> = {};
                data.forEach((f: DashboardFilter) => {
                    if (f.default_value) initialValues[f.column_name] = f.default_value;
                });
                setActiveValues(initialValues);
                onFiltersChange(initialValues);
            }
        } catch (err) {
            console.error("Failed to fetch filters", err);
        }
    };

    const handleAddFilter = async () => {
        if (!newFilterColumn || !newFilterLabel) {
            toast.error("Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/dashboards/${dashboardId}/filters`, {
                method: "POST",
                body: JSON.stringify({
                    filter_type: newFilterType,
                    column_name: newFilterColumn,
                    label: newFilterLabel,
                }),
            });

            if (res.ok) {
                toast.success("Filter added");
                setNewFilterColumn("");
                setNewFilterLabel("");
                setIsOpen(false);
                fetchFilters();
            } else {
                toast.error("Failed to add filter");
            }
        } catch (err) {
            toast.error("Error adding filter");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFilter = async (filterId: string) => {
        try {
            const res = await authenticatedFetch(`/api/dashboards/${dashboardId}/filters/${filterId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Filter removed");
                fetchFilters();
            }
        } catch (err) {
            toast.error("Failed to remove filter");
        }
    };

    const updateValue = (column: string, value: any) => {
        const newValues = { ...activeValues, [column]: value };
        if (!value || value === "") {
            delete newValues[column];
        }
        setActiveValues(newValues);
        onFiltersChange(newValues);
    };

    const clearAll = () => {
        setActiveValues({});
        onFiltersChange({});
    };

    return (
        <div className="flex flex-wrap items-center gap-3 py-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 text-xs font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
            </div>

            {/* Global Date Filter (Quick Win 6.4.5) */}
            <div className="flex items-center gap-2">
                <Select
                    value={activeValues["__date_range"] || "all"}
                    onValueChange={(val) => updateValue("__date_range", val === "all" ? "" : val)}
                >
                    <SelectTrigger className="h-8 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-xs gap-2 min-w-[140px] text-slate-300 rounded-xl">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <SelectValue placeholder="Time Horizon" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="last 7 days">Last 7 Days</SelectItem>
                        <SelectItem value="last 30 days">Last 30 Days</SelectItem>
                        <SelectItem value="last 90 days">Last 90 Days</SelectItem>
                        <SelectItem value="this year">This Year</SelectItem>
                        <SelectItem value="this month">This Month</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-[1px] h-4 bg-slate-800 mx-1 hidden md:block" />

            {filters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-xs gap-2 ${activeValues[filter.column_name] ? "border-violet-500/50 bg-violet-500/5 text-violet-200" : "text-slate-300"}`}
                            >
                                {filter.filter_type === "date_range" ? <CalendarIcon className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                                {filter.label}: {activeValues[filter.column_name] || "All"}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 bg-slate-900 border-slate-800 p-4 shadow-2xl">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-sm text-white">{filter.label}</h4>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-500 hover:text-rose-400"
                                        onClick={() => handleDeleteFilter(filter.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Value</Label>
                                    <Input
                                        placeholder={filter.filter_type === "date_range" ? "e.g. last 30 days" : "Enter value..."}
                                        value={activeValues[filter.column_name] || ""}
                                        onChange={(e) => updateValue(filter.column_name, e.target.value)}
                                        className="h-8 bg-slate-950 border-slate-800 text-sm"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-slate-400"
                                        onClick={() => updateValue(filter.column_name, "")}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            ))}

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 gap-1 px-2 border border-dashed border-violet-500/30">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Filter</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-slate-900 border-slate-800 p-4 shadow-2xl">
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                            <Filter className="h-4 w-4 text-violet-500" />
                            Configure New Filter
                        </h4>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Filter Type</Label>
                                <Select
                                    value={newFilterType}
                                    onValueChange={(val: any) => setNewFilterType(val)}
                                >
                                    <SelectTrigger className="h-8 bg-slate-950 border-slate-800 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="category">Category (String)</SelectItem>
                                        <SelectItem value="date_range">Date Range</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Column Name</Label>
                                <Input
                                    placeholder="e.g. status, created_at"
                                    value={newFilterColumn}
                                    onChange={(e) => setNewFilterColumn(e.target.value)}
                                    className="h-8 bg-slate-950 border-slate-800 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Display Label</Label>
                                <Input
                                    placeholder="e.g. Order Status"
                                    value={newFilterLabel}
                                    onChange={(e) => setNewFilterLabel(e.target.value)}
                                    className="h-8 bg-slate-950 border-slate-800 text-xs"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-violet-600 hover:bg-violet-700 h-9 text-xs"
                            onClick={handleAddFilter}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                            Create Filter
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {Object.keys(activeValues).length > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-slate-500 hover:text-rose-400 text-xs"
                    onClick={clearAll}
                >
                    Clear all
                </Button>
            )}
        </div>
    );
}
