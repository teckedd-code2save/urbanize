'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, Building2, Route, MapPin, Trees, Heart, GraduationCap, ShoppingBag, Bus, Landmark, Info, ChevronDown, ChevronRight, Gauge } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ExtendedMetrics, ProximityMetrics } from '@/lib/extended-metrics';
import type { TrafficMetrics } from '@/app/api/traffic/route';

// ── Primitive components ───────────────────────────────────────────────────────

function MetricRow({ label, value, unit, tip, bar }: {
    label: string;
    value: string | number;
    unit?: string;
    tip?: string;
    bar?: number;
}) {
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {label}
                    {tip && (
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[200px]">
                                <p className="text-xs">{tip}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <span className="text-xs font-semibold font-mono">
                    {value}{unit ? <span className="text-muted-foreground font-normal"> {unit}</span> : null}
                </span>
            </div>
            {bar !== undefined && (
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 transition-all duration-700" style={{ width: `${Math.min(bar, 100)}%` }} />
                </div>
            )}
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    const [open, setOpen] = React.useState(true);
    return (
        <div className="space-y-1.5">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 w-full text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
                {icon}
                {title}
                <span className="ml-auto">{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</span>
            </button>
            {open && <div className="space-y-1.5 pl-1">{children}</div>}
        </div>
    );
}

/** Renders count + expandable proximity row for a land-use category */
function LandUseRow({ label, data }: { label: string; data: ProximityMetrics }) {
    const [expanded, setExpanded] = React.useState(false);
    if (data.count === 0) {
        return <MetricRow label={label} value="0" />;
    }
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {label}
                </button>
                <span className="text-xs font-semibold font-mono">{data.count}</span>
            </div>
            {expanded && (
                <div className="ml-3 space-y-0.5 border-l border-border/30 pl-2">
                    {data.nearestKm != null && (
                        <MetricRow label="Nearest" value={data.nearestKm.toFixed(3)} unit="km" />
                    )}
                    {data.farthestKm != null && (
                        <MetricRow label="Farthest" value={data.farthestKm.toFixed(3)} unit="km" />
                    )}
                    {data.avgKm != null && (
                        <MetricRow label="Avg distance" value={data.avgKm.toFixed(3)} unit="km" />
                    )}
                    {data.totalKm != null && (
                        <MetricRow label="Total distance" value={data.totalKm.toFixed(2)} unit="km" />
                    )}
                    {data.areaMsq != null && data.areaMsq > 0 && (
                        <MetricRow label="Area" value={(data.areaMsq / 1000).toFixed(1)} unit="× 10³ m²" />
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MetricsPanelProps {
    readonly status: 'idle' | 'analyzing' | 'completed' | 'error';
    readonly metrics?: {
        readonly buildingDensityPct: number | null;
        readonly roadDensity: number | null;
    } | null;
    readonly extendedMetrics?: ExtendedMetrics | null;
    readonly trafficMetrics?: TrafficMetrics | null;
}

export function MetricsPanel({ status, metrics, extendedMetrics, trafficMetrics }: MetricsPanelProps) {
    if (status === 'idle') return null;

    const em = extendedMetrics;

    return (
        <Card className="w-80 shadow-2xl bg-background/95 backdrop-blur border-border/50 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <CardHeader className="pb-2 border-b border-border/10 bg-muted/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Urban Parameters
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-3 pb-4">
                {status === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <div className="text-sm font-medium animate-pulse">Processing OSM Data...</div>
                        <p className="text-xs text-muted-foreground text-center">Fetching buildings, roads, amenities</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-4 text-center">
                        <p className="text-sm text-destructive font-medium">Analysis Failed</p>
                        <p className="text-xs text-muted-foreground mt-1">Please try a different area or radius.</p>
                    </div>
                )}

                {status === 'completed' && (
                    <TooltipProvider>
                        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-0.5">

                            {/* ── Buildings ─────────────────────────────────── */}
                            <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Buildings">
                                <MetricRow
                                    label="Coverage"
                                    value={(em?.buildingCoveragePct ?? metrics?.buildingDensityPct ?? 0).toFixed(1)}
                                    unit="%"
                                    bar={em?.buildingCoveragePct ?? metrics?.buildingDensityPct ?? 0}
                                    tip="Building footprint / circle area (EPSG:5070)"
                                />
                                {em && (
                                    <>
                                        <MetricRow label="Count" value={em.buildingCount.toLocaleString()} />
                                        <MetricRow label="Total footprint" value={(em.buildingFootprintM2 / 1000).toFixed(1)} unit="× 10³ m²" />
                                        {em.avgBuildingLevels != null && (
                                            <MetricRow label="Avg. floors" value={em.avgBuildingLevels.toFixed(1)} tip="Mean building:levels (where tagged)" />
                                        )}
                                        {em.avgBuildingHeightM != null && (
                                            <MetricRow label="Avg. height" value={em.avgBuildingHeightM.toFixed(1)} unit="m" tip="Mean building:height (where tagged)" />
                                        )}
                                    </>
                                )}
                            </Section>

                            {/* ── Roads ─────────────────────────────────────── */}
                            <Section icon={<Route className="h-3.5 w-3.5" />} title="Roads">
                                <MetricRow
                                    label="Density"
                                    value={metrics?.roadDensity?.toFixed(2) ?? '0.00'}
                                    unit="km/km²"
                                    tip="Total road length / circle area (geography)"
                                />
                                {em && (
                                    <>
                                        <MetricRow label="Total length" value={em.totalRoadLengthKm.toFixed(2)} unit="km" />
                                        <MetricRow label="Tarred / paved" value={em.tarredRoadLengthKm.toFixed(2)} unit="km" tip="surface=asphalt/paved/concrete (where tagged)" />
                                        <MetricRow label="Untarred / unpaved" value={em.untarredRoadLengthKm.toFixed(2)} unit="km" tip="surface=unpaved/dirt/gravel/laterite/sand" />
                                        <MetricRow label="Sidewalks / footways" value={em.sidewalkLengthKm.toFixed(2)} unit="km" tip="highway=footway/path or footway=sidewalk" />
                                        <MetricRow label="Intersections" value={em.roadIntersectionCount.toLocaleString()} tip="Road junctions (shared nodes after ST_Node)" />
                                    </>
                                )}
                            </Section>

                            {em && (
                                <>
                                    {/* ── Mobility ──────────────────────────── */}
                                    <Section icon={<Bus className="h-3.5 w-3.5" />} title="Mobility">
                                        <LandUseRow label="Bus / transit stops" data={em.busStops} />
                                        <LandUseRow label="Taxi stations" data={em.taxiStations} />
                                        <LandUseRow label="Lorry / bus stations" data={em.lorryStations} />
                                    </Section>

                                    {/* ── Education ─────────────────────────── */}
                                    <Section icon={<GraduationCap className="h-3.5 w-3.5" />} title="Education">
                                        <LandUseRow label="Schools / kindergartens" data={em.schools} />
                                        <LandUseRow label="Universities / colleges" data={em.universities} />
                                    </Section>

                                    {/* ── Health ────────────────────────────── */}
                                    <Section icon={<Heart className="h-3.5 w-3.5" />} title="Health">
                                        <LandUseRow label="Hospitals" data={em.hospitals} />
                                        <LandUseRow label="Clinics / health centres" data={em.clinics} />
                                        <LandUseRow label="Pharmacies" data={em.pharmacies} />
                                    </Section>

                                    {/* ── Commerce ──────────────────────────── */}
                                    <Section icon={<ShoppingBag className="h-3.5 w-3.5" />} title="Commerce">
                                        <LandUseRow label="Markets" data={em.markets} />
                                        <LandUseRow label="Shops" data={em.shops} />
                                        <LandUseRow label="Restaurants / cafés" data={em.restaurants} />
                                        <LandUseRow label="Banks / ATMs" data={em.banks} />
                                        <LandUseRow label="Fuel stations" data={em.fuelStations} />
                                    </Section>

                                    {/* ── Civic ─────────────────────────────── */}
                                    <Section icon={<Landmark className="h-3.5 w-3.5" />} title="Civic & Services">
                                        <LandUseRow label="Places of worship" data={em.worship} />
                                        <LandUseRow label="Police stations" data={em.police} />
                                    </Section>

                                    {/* ── Green Space ───────────────────────── */}
                                    <Section icon={<Trees className="h-3.5 w-3.5" />} title="Green Space">
                                        <LandUseRow label="Parks / recreation" data={em.parks} />
                                    </Section>
                                </>
                            )}

                            {/* ── Traffic (HERE API, optional) ──────────── */}
                            {trafficMetrics && trafficMetrics.segmentCount > 0 && (
                                <Section icon={<Gauge className="h-3.5 w-3.5" />} title="Traffic Flow">
                                    <MetricRow
                                        label="Avg. speed"
                                        value={trafficMetrics.avgSpeedKmh ?? '—'}
                                        unit={trafficMetrics.avgSpeedKmh !== null ? 'km/h' : undefined}
                                        tip="Average current speed across road segments (HERE Traffic API)"
                                    />
                                    <MetricRow
                                        label="Free-flow speed"
                                        value={trafficMetrics.avgFreeFlowKmh ?? '—'}
                                        unit={trafficMetrics.avgFreeFlowKmh !== null ? 'km/h' : undefined}
                                        tip="Average uncongested speed (baseline)"
                                    />
                                    <MetricRow
                                        label="Congestion"
                                        value={trafficMetrics.peakCongestionPct ?? '—'}
                                        unit={trafficMetrics.peakCongestionPct !== null ? '%' : undefined}
                                        bar={trafficMetrics.peakCongestionPct ?? undefined}
                                        tip="(1 − current/freeflow) × 100 — proxy for peak congestion"
                                    />
                                    <MetricRow
                                        label="Jam factor"
                                        value={trafficMetrics.avgJamFactor ?? '—'}
                                        unit={trafficMetrics.avgJamFactor !== null ? '/ 10' : undefined}
                                        tip="0 = free flow, 10 = standstill (HERE jam factor)"
                                    />
                                    <MetricRow label="Segments" value={trafficMetrics.segmentCount.toLocaleString()} />
                                </Section>
                            )}

                            <p className="text-[10px] text-muted-foreground/50 text-center font-mono pt-1">
                                Sources: OSM{trafficMetrics ? ' · HERE Traffic' : ''} · Urbanize v1.0
                            </p>
                        </div>
                    </TooltipProvider>
                )}
            </CardContent>
        </Card>
    );
}
