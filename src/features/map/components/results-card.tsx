import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ResultsCardProps {
    readonly status: 'idle' | 'analyzing' | 'completed' | 'error';
    readonly metrics?: {
        readonly buildingDensityPct: number | null;
        readonly roadDensity: number | null;
    } | null;
}

export function ResultsCard({ status, metrics }: ResultsCardProps) {
    if (status === 'idle') return null;

    return (
        <Card className="w-80 shadow-2xl bg-background/95 backdrop-blur border-border/50 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <CardHeader className="pb-2 border-b border-border/10 bg-muted/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Urban Density Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
                {status === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <div className="text-sm font-medium animate-pulse">Processing Geometries...</div>
                        <p className="text-xs text-muted-foreground text-center">Clipping OSM data and calculating intersection area</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="py-4 text-center">
                        <p className="text-sm text-destructive font-medium">Analysis Failed</p>
                        <p className="text-xs text-muted-foreground mt-1">Please try a different area or radius.</p>
                    </div>
                )}
                {status === 'completed' && (
                    <div className="grid grid-cols-1 gap-4">
                        <TooltipProvider>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        Building Density
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger>
                                                <Info className="h-3 w-3" />
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-xs">
                                                <p className="text-xs">Building Footprint Area / Total Area. Represents the percentage of the study area covered by buildings.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <span>(%)</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-primary leading-none">
                                        {metrics?.buildingDensityPct?.toFixed(1) ?? '0.0'}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                                        style={{ width: `${Math.min(metrics?.buildingDensityPct || 0, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        Road Density
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger>
                                                <Info className="h-3 w-3" />
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-xs">
                                                <p className="text-xs">Road Length / Circle Area. Measured in kilometers of infrastructure per square kilometer of land.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <span>(km/km²)</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-foreground leading-none">
                                        {metrics?.roadDensity?.toFixed(2) ?? '0.00'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground/60 italic font-mono pt-1">
                                    High-fidelity spatial computation (EPSG:5070)
                                </div>
                            </div>
                        </TooltipProvider>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
