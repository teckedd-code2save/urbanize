'use client';

import * as React from 'react';
import Map, { MapProvider } from 'react-map-gl';
import { AlertTriangle } from 'lucide-react';

import { CitySearch } from './city-search';
import { CircleDrawer } from './circle-drawer';
import { DrawControl } from './draw-control';
import { MetricsPanel } from './metrics-panel';
import { AnalysisLayers } from './analysis-layers';
import { LayerToggle } from './layer-toggle';
import { TimelineSelector } from './timeline-selector';
import { SplitScreenMap } from './split-screen-map';
import { ComparisonCard } from './comparison-card';
import type { ExtendedMetrics } from '@/lib/extended-metrics';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface DiffMetrics {
    yearA: number | null;
    yearB: number | null;
    metricsA: { buildingDensityPct: number | null; roadDensity: number | null };
    metricsB: { buildingDensityPct: number | null; roadDensity: number | null };
    delta: { buildingDensityPct: number; roadDensity: number };
}

export function BaseMap() {
    const [drawingState, setDrawingState] = React.useState<'idle' | 'drawing' | 'drawn'>('idle');
    const [circleCenter, setCircleCenter] = React.useState<[number, number] | null>(null);
    const [circleRadiusKm, setCircleRadiusKm] = React.useState<number>(0);

    // Analysis State
    const [activeJobId, setActiveJobId] = React.useState<string | null>(null);
    const [activeJobAId, setActiveJobAId] = React.useState<string | null>(null);
    const [analysisStatus, setAnalysisStatus] = React.useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
    const [metrics, setMetrics] = React.useState<{ buildingDensityPct: number | null, roadDensity: number | null } | null>(null);
    const [geoJson, setGeoJson] = React.useState<any>(null);
    const [visibleLayers, setVisibleLayers] = React.useState({ buildings: true, roads: true });

    // Timeline State — persisted so the timeline stays visible after analysis
    const [selectedYears, setSelectedYears] = React.useState<{ yearA: number; yearB: number } | null>(null);

    // Extended metrics for single-period mode
    const [extendedMetrics, setExtendedMetrics] = React.useState<ExtendedMetrics | null>(null);

    // Comparison mode state (Time Travel results)
    const [diffMetrics, setDiffMetrics] = React.useState<DiffMetrics | null>(null);
    const [geoJsonA, setGeoJsonA] = React.useState<any>(null);
    const [geoJsonB, setGeoJsonB] = React.useState<any>(null);

    // Refs for stable access inside polling interval closure
    const activeJobAIdRef = React.useRef<string | null>(null);
    const selectedYearsRef = React.useRef<{ yearA: number; yearB: number } | null>(null);
    const activeJobIdRef = React.useRef<string | null>(null);

    React.useEffect(() => { activeJobAIdRef.current = activeJobAId; }, [activeJobAId]);
    React.useEffect(() => { selectedYearsRef.current = selectedYears; }, [selectedYears]);
    React.useEffect(() => { activeJobIdRef.current = activeJobId; }, [activeJobId]);

    const isComparisonMode =
        selectedYears !== null &&
        analysisStatus === 'completed' &&
        diffMetrics !== null;

    const clearAllState = React.useCallback(() => {
        setDrawingState('idle');
        setCircleCenter(null);
        setCircleRadiusKm(0);
        setAnalysisStatus('idle');
        setMetrics(null);
        setGeoJson(null);
        setSelectedYears(null);
        setActiveJobId(null);
        setActiveJobAId(null);
        setExtendedMetrics(null);
        setDiffMetrics(null);
        setGeoJsonA(null);
        setGeoJsonB(null);
    }, []);

    const handleToggleDraw = React.useCallback(() => {
        setDrawingState(prev => {
            if (prev !== 'drawing') {
                setCircleCenter(null);
                setCircleRadiusKm(0);
                setAnalysisStatus('idle');
                setMetrics(null);
                setGeoJson(null);
                setSelectedYears(null);
                setActiveJobId(null);
                setActiveJobAId(null);
                setExtendedMetrics(null);
                setDiffMetrics(null);
                setGeoJsonA(null);
                setGeoJsonB(null);
                return 'drawing';
            }
            return 'idle';
        });
    }, []);

    const handleClearDraw = React.useCallback(() => {
        clearAllState();
    }, [clearAllState]);

    const handleUpdateCircle = React.useCallback((center: [number, number], radius: number) => {
        setCircleCenter(center);
        setCircleRadiusKm(radius);
    }, []);

    const handleDrawingComplete = React.useCallback(async () => {
        setDrawingState('drawn');
        if (!circleCenter || circleRadiusKm <= 0) return;

        setAnalysisStatus('analyzing');
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: circleCenter[1],
                    lon: circleCenter[0],
                    radiusKm: circleRadiusKm
                })
            });

            const data = await response.json();
            if (data.jobId) {
                setActiveJobId(data.jobId);
            } else {
                setAnalysisStatus('error');
            }
        } catch (error) {
            console.error('Failed to trigger analysis:', error);
            setAnalysisStatus('error');
        }
    }, [circleCenter, circleRadiusKm]);

    /** Dispatches two analysis jobs (one per period) for Time Travel comparison */
    const handleYearsSelected = React.useCallback(async (yearA: number, yearB: number) => {
        if (!circleCenter || circleRadiusKm <= 0) return;
        setSelectedYears({ yearA, yearB });
        setAnalysisStatus('analyzing');
        setMetrics(null);
        setGeoJson(null);
        setDiffMetrics(null);
        setGeoJsonA(null);
        setGeoJsonB(null);

        try {
            // Dispatch Year A job (Past) — submitted first so it processes first
            const jobARes = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: circleCenter[1],
                    lon: circleCenter[0],
                    radiusKm: circleRadiusKm,
                    year: yearA,
                })
            });
            const jobAData = await jobARes.json();
            if (jobAData.jobId) {
                setActiveJobAId(jobAData.jobId);
            }

            // Dispatch Year B job (Present) — poll this one for completion signal
            const jobBRes = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: circleCenter[1],
                    lon: circleCenter[0],
                    radiusKm: circleRadiusKm,
                    year: yearB,
                })
            });
            const jobBData = await jobBRes.json();

            if (jobBData.jobId) {
                setActiveJobId(jobBData.jobId);
            } else {
                setAnalysisStatus('error');
            }
        } catch (error) {
            console.error('Failed to trigger time travel analysis:', error);
            setAnalysisStatus('error');
        }
    }, [circleCenter, circleRadiusKm]);

    const handleTimelineReset = React.useCallback(() => {
        setSelectedYears(null);
        setAnalysisStatus('idle');
        setMetrics(null);
        setGeoJson(null);
        setActiveJobId(null);
        setActiveJobAId(null);
        setExtendedMetrics(null);
        setDiffMetrics(null);
        setGeoJsonA(null);
        setGeoJsonB(null);
    }, []);

    // Polling logic for job status
    React.useEffect(() => {
        if (!activeJobId || analysisStatus !== 'analyzing') return;

        let pollCount = 0;
        const interval = setInterval(async () => {
            pollCount++;
            if (pollCount > 60) { // Timeout after 2 minutes (2s × 60)
                setAnalysisStatus('error');
                clearInterval(interval);
                return;
            }

            try {
                const response = await fetch(`/api/analyze/${activeJobId}`);
                const data = await response.json();

                if (data.state === 'completed') {
                    clearInterval(interval);

                    const currentJobAId = activeJobAIdRef.current;
                    const currentSelectedYears = selectedYearsRef.current;

                    if (currentSelectedYears && currentJobAId) {
                        // Time Travel mode: fetch diff + year-filtered geometries
                        const [diffRes, geoARes, geoBRes] = await Promise.all([
                            fetch(`/api/analyze/diff?jobAId=${currentJobAId}&jobBId=${activeJobId}`),
                            fetch(`/api/analyze/${currentJobAId}/geometries?year=${currentSelectedYears.yearA}`),
                            fetch(`/api/analyze/${activeJobId}/geometries?year=${currentSelectedYears.yearB}`),
                        ]);
                        const [diffData, geoAData, geoBData] = await Promise.all([
                            diffRes.json(),
                            geoARes.json(),
                            geoBRes.json(),
                        ]);

                        if (diffData.error) {
                            setAnalysisStatus('error');
                            return;
                        }

                        setDiffMetrics(diffData);
                        setGeoJsonA(geoAData);
                        setGeoJsonB(geoBData);
                    } else {
                        // Normal single-period mode
                        setMetrics(data.metrics);
                        const [geoResponse, extResponse] = await Promise.all([
                            fetch(`/api/analyze/${activeJobId}/geometries`),
                            fetch(`/api/analyze/${activeJobId}/extended-metrics`),
                        ]);
                        const [geoData, extData] = await Promise.all([
                            geoResponse.json(),
                            extResponse.json(),
                        ]);
                        setGeoJson(geoData);
                        if (!extData.error) setExtendedMetrics(extData);
                    }

                    setAnalysisStatus('completed');
                } else if (data.state === 'failed') {
                    setAnalysisStatus('error');
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Error polling job status:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeJobId, analysisStatus]);

    const toggleLayer = (layer: 'buildings' | 'roads') => {
        setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.YOUR_MAPBOX_TOKEN') {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/20 p-6 text-center">
                <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">Mapbox Token Missing</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Please configure <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">.env.local</code> file to view the map.
                </p>
            </div>
        );
    }

    const splitScreenInitialViewState = {
        longitude: circleCenter?.[0] ?? -0.1870,
        latitude: circleCenter?.[1] ?? 5.6037,
        zoom: 13,
    };

    return (
        <MapProvider>
            <div className="h-full w-full relative">
                {isComparisonMode ? (
                    /* ── Time Travel comparison mode ─────────────────────────────── */
                    <SplitScreenMap
                        yearA={selectedYears!.yearA}
                        yearB={selectedYears!.yearB}
                        geoJsonA={geoJsonA}
                        geoJsonB={geoJsonB}
                        initialViewState={splitScreenInitialViewState}
                    />
                ) : (
                    /* ── Standard single-period mode ─────────────────────────────── */
                    <Map
                        id="main-map"
                        mapboxAccessToken={MAPBOX_TOKEN}
                        initialViewState={{
                            longitude: -0.1870,
                            latitude: 5.6037,
                            zoom: 11
                        }}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/satellite-v9"
                    >
                        <CircleDrawer
                            drawingState={drawingState}
                            circleCenter={circleCenter}
                            circleRadiusKm={circleRadiusKm}
                            onUpdateCircle={handleUpdateCircle}
                            onDrawingComplete={handleDrawingComplete}
                        />

                        {analysisStatus === 'completed' && geoJson && (
                            <AnalysisLayers
                                geoJson={geoJson}
                                visibleLayers={visibleLayers}
                                circleCenter={circleCenter}
                                circleRadiusKm={circleRadiusKm}
                            />
                        )}
                    </Map>
                )}

                {/* Left side controls — hidden in comparison mode */}
                {!isComparisonMode && (
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-4">
                        <CitySearch />
                        <DrawControl
                            drawingState={drawingState}
                            onToggleDraw={handleToggleDraw}
                            onClear={handleClearDraw}
                        />
                        {analysisStatus === 'completed' && !selectedYears && (
                            <LayerToggle
                                visibleLayers={visibleLayers}
                                onToggleLayer={toggleLayer}
                            />
                        )}
                    </div>
                )}

                {/* Right side results */}
                <div className="absolute top-4 right-4 z-10">
                    {isComparisonMode ? (
                        <ComparisonCard
                            diffMetrics={diffMetrics}
                            jobAId={activeJobAId}
                            jobBId={activeJobId}
                            onReset={clearAllState}
                        />
                    ) : (
                        <MetricsPanel
                            status={analysisStatus}
                            metrics={metrics}
                            extendedMetrics={extendedMetrics}
                        />
                    )}
                </div>

                {/* Map legend — shown when analysis is complete */}
                {analysisStatus === 'completed' && !isComparisonMode && (
                    <div className="absolute bottom-8 left-4 z-10 rounded-lg bg-background/90 backdrop-blur border border-border/40 px-3 py-2 text-[10px] space-y-1 shadow-lg">
                        <p className="font-semibold text-[11px] text-foreground mb-1">Legend</p>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500 opacity-70" /> Buildings</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-orange-400" /> Primary roads</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-yellow-400" /> Secondary roads</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-gray-300" /> Residential roads</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500" /> Transit stops</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Schools</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Health</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" /> Banks</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" /> Markets / shops</div>
                        <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Parks</div>
                    </div>
                )}

                {/* Timeline — visible once the circle is drawn, hidden in comparison mode */}
                {drawingState === 'drawn' && !isComparisonMode && (
                    <TimelineSelector
                        lat={circleCenter?.[1]}
                        lon={circleCenter?.[0]}
                        radiusKm={circleRadiusKm}
                        onYearsSelected={handleYearsSelected}
                        onReset={handleTimelineReset}
                    />
                )}
            </div>
        </MapProvider>
    );
}
