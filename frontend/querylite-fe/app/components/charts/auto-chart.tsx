"use client";

import { BarChart, LineChart, DonutChart, AreaChart } from "@tremor/react";

interface ChartRecommendation {
    chart_type: "bar" | "line" | "donut" | "area" | "table";
    x_column?: string;
    y_column?: string;
    category_column?: string;
    value_column?: string;
}

interface AutoChartProps {
    data: Record<string, unknown>[];
    recommendation: ChartRecommendation;
    compact?: boolean;
    onDataPointClick?: (column: string, value: any) => void;
}

export function AutoChart({ data, recommendation, compact = false, onDataPointClick }: AutoChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                No data to display
            </div>
        );
    }

    const { chart_type, x_column, y_column, category_column, value_column } =
        recommendation;

    // Common styling for Tremor charts in dark mode
    const commonProps = {
        className: "h-full w-full",
        showAnimation: true,
        showXAxis: !compact,
        showYAxis: !compact,
        showGridLines: !compact,
        showLegend: !compact,
    };

    switch (chart_type) {
        case "bar":
            if (!x_column || !y_column) {
                return <TableView data={data} />;
            }
            return (
                <BarChart
                    {...commonProps}
                    data={data as Record<string, string | number>[]}
                    index={x_column}
                    categories={[y_column]}
                    colors={["violet"]}
                    yAxisWidth={compact ? 0 : 60}
                    onValueChange={(v) => onDataPointClick && onDataPointClick(x_column, v?.name)}
                />
            );

        case "line":
            if (!x_column || !y_column) {
                return <TableView data={data} />;
            }
            return (
                <LineChart
                    {...commonProps}
                    data={data as Record<string, string | number>[]}
                    index={x_column}
                    categories={[y_column]}
                    colors={["emerald"]}
                    yAxisWidth={compact ? 0 : 60}
                    onValueChange={(v) => onDataPointClick && onDataPointClick(x_column, v?.name)}
                />
            );

        case "area":
            if (!x_column || !y_column) {
                return <TableView data={data} />;
            }
            return (
                <AreaChart
                    {...commonProps}
                    data={data as Record<string, string | number>[]}
                    index={x_column}
                    categories={[y_column]}
                    colors={["violet"]}
                    yAxisWidth={compact ? 0 : 60}
                    onValueChange={(v) => onDataPointClick && onDataPointClick(x_column, v?.name)}
                />
            );

        case "donut":
            if (!category_column || !value_column) {
                return <TableView data={data} />;
            }
            return (
                <DonutChart
                    {...commonProps}
                    data={data as Record<string, string | number>[]}
                    index={category_column}
                    category={value_column}
                    colors={["violet", "indigo", "blue", "cyan", "teal"]}
                    variant="pie"
                    showLabel={!compact}
                    onValueChange={(v) => onDataPointClick && onDataPointClick(category_column, v?.name)}
                />
            );

        case "table":
        default:
            return <TableView data={data} />;
    }
}

function TableView({ data }: { data: Record<string, unknown>[] }) {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700">
                        {columns.map((col) => (
                            <th
                                key={col}
                                className="px-4 py-3 text-left font-medium text-slate-300"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 100).map((row, i) => (
                        <tr
                            key={i}
                            className="border-b border-slate-800 hover:bg-slate-800/50"
                        >
                            {columns.map((col) => (
                                <td key={col} className="px-4 py-3 text-slate-400">
                                    {String(row[col] ?? "")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length > 100 && (
                <p className="text-center text-slate-500 text-sm mt-4">
                    Showing first 100 of {data.length} rows
                </p>
            )}
        </div>
    );
}
