'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GitCompareArrows, Download, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DiffMetrics {
    yearA: number | null;
    yearB: number | null;
    metricsA: { buildingDensityPct: number | null; roadDensity: number | null };
    metricsB: { buildingDensityPct: number | null; roadDensity: number | null };
    delta: { buildingDensityPct: number; roadDensity: number };
}

interface ComparisonCardProps {
    readonly diffMetrics: DiffMetrics | null;
    readonly jobAId: string | null;
    readonly jobBId: string | null;
    readonly onReset: () => void;
}

function DeltaBadge({ value, unit }: { value: number; unit: string }) {
    const abs = Math.abs(value).toFixed(unit === 'km/km²' ? 2 : 1);
    const isPositive = value > 0.005;
    const isNegative = value < -0.005;

    if (isPositive) {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-sm font-bold text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                +{abs}{unit === '%' ? '%' : ''}
            </span>
        );
    }
    if (isNegative) {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-red-500/15 px-2 py-0.5 text-sm font-bold text-red-400">
                <TrendingDown className="h-3.5 w-3.5" />
                -{abs}{unit === '%' ? '%' : ''}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-500/15 px-2 py-0.5 text-sm font-bold text-slate-400">
            <Minus className="h-3.5 w-3.5" />
            ±0{unit === '%' ? '%' : ''}
        </span>
    );
}

export function ComparisonCard({ diffMetrics, jobAId, jobBId, onReset }: ComparisonCardProps) {
    if (!diffMetrics) return null;

    const { yearA, yearB, metricsA, metricsB, delta } = diffMetrics;
    const buildingA = metricsA.buildingDensityPct ?? 0;
    const buildingB = metricsB.buildingDensityPct ?? 0;
    const roadA = metricsA.roadDensity ?? 0;
    const roadB = metricsB.roadDensity ?? 0;

    const csvUrl =
        jobAId && jobBId
            ? `/api/export/csv?jobAId=${jobAId}&jobBId=${jobBId}`
            : null;

    return (
        <Card className="w-80 shadow-2xl bg-background/95 backdrop-blur border-border/50 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <CardHeader className="pb-2 border-b border-border/10 bg-muted/5">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <GitCompareArrows className="h-4 w-4 text-primary" />
                        Time Travel Comparison
                    </CardTitle>
                    <button
                        onClick={onReset}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        New Analysis
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {yearA} → {yearB}
                </p>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col gap-4">
                <TooltipProvider>
                    {/* Building Density */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            Building Density
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                    <p className="text-xs">
                                        Building Footprint Area / Total Area (EPSG:5070).
                                        Raw values — A: {buildingA.toFixed(4)}%, B: {buildingB.toFixed(4)}%
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex gap-3 text-xs">
                                <span className="text-blue-400 font-mono">
                                    A: {buildingA.toFixed(1)}%
                                </span>
                                <span className="text-emerald-400 font-mono">
                                    B: {buildingB.toFixed(1)}%
                                </span>
                            </div>
                            <DeltaBadge value={delta.buildingDensityPct} unit="%" />
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-blue-400/70 transition-all duration-700"
                                style={{ width: `${Math.min(buildingA, 100)}%` }}
                            />
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-400/70 transition-all duration-700"
                                style={{ width: `${Math.min(buildingB, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Road Density */}
                    <div className="space-y-2 pt-1 border-t border-border/10">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            Road Density
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                    <p className="text-xs">
                                        Road Length / Circle Area in km/km².
                                        Raw values — A: {roadA.toFixed(4)}, B: {roadB.toFixed(4)}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex gap-3 text-xs">
                                <span className="text-blue-400 font-mono">
                                    A: {roadA.toFixed(2)}
                                </span>
                                <span className="text-emerald-400 font-mono">
                                    B: {roadB.toFixed(2)}
                                </span>
                            </div>
                            <DeltaBadge value={delta.roadDensity} unit="km/km²" />
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 italic font-mono">
                            km/km² · EPSG:5070 equal-area projection
                        </div>
                    </div>
                </TooltipProvider>

                {/* Download CSV — Story 5.3 */}
                {csvUrl && (
                    <a
                        href={csvUrl}
                        download
                        className="mt-1 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download CSV (R/SPSS ready)
                    </a>
                )}
                <p className="text-[10px] text-muted-foreground/50 text-center -mt-2 font-mono">
                    Includes OSM citation · Urbanize v1.0
                </p>
            </CardContent>
        </Card>
    );
}
