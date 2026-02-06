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
    forecastData?: { index: number; value: number }[];
}

export function AutoChart({ data, recommendation, compact = false, onDataPointClick, forecastData }: AutoChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                No data to display
            </div>
        );
    }

    const { chart_type, x_column, y_column, category_column, value_column } =
        recommendation;

    // Merge forecast data if present
    let chartData = data as Record<string, string | number>[];
    let categories = [y_column || ""];
    let colors = chart_type === "line" ? ["emerald"] : ["violet"];

    if (forecastData && x_column && y_column) {
        const lastActual = chartData[chartData.length - 1];

        // Create forecast points
        const forecastPoints = forecastData.map(f => ({
            [x_column]: `Next ${f.index - (chartData.length - 1)}`,
            ["Forecast"]: f.value
        }));

        // Connect the last actual point to the first forecast point for continuity
        const extendedData = [
            ...chartData.map(d => ({ ...d })),
            ...forecastPoints
        ];

        // Add the last actual value to the forecast series as well so they connect
        if (extendedData.length > chartData.length) {
            extendedData[chartData.length - 1]["Forecast"] = lastActual[y_column] as number;
        }

        chartData = extendedData as Record<string, string | number>[];
        categories = [y_column, "Forecast"];
        colors = chart_type === "line" ? ["emerald", "rose"] : ["violet", "rose"];
    }

    // Common styling for Tremor charts in dark mode
    const commonProps = {
        className: "h-full w-full",
        showAnimation: true,
        showXAxis: !compact,
        showYAxis: !compact,
        showGridLines: !compact,
        showLegend: !compact && !!forecastData,
    };

    switch (chart_type) {
        case "bar":
            if (!x_column || !y_column) {
                return <TableView data={data} />;
            }
            return (
                <BarChart
                    {...commonProps}
                    data={chartData}
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
                    data={chartData}
                    index={x_column}
                    categories={categories}
                    colors={colors as any}
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
                    data={chartData}
                    index={x_column}
                    categories={categories}
                    colors={colors as any}
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
