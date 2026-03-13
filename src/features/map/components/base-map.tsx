'use client';

import * as React from 'react';
import Map, { MapProvider } from 'react-map-gl';
import { AlertTriangle } from 'lucide-react';

import { CitySearch } from './city-search';
import { CircleDrawer } from './circle-drawer';
import { DrawControl } from './draw-control';
import { ResultsCard } from './results-card';
import { AnalysisLayers } from './analysis-layers';
import { LayerToggle } from './layer-toggle';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function BaseMap() {
    const [drawingState, setDrawingState] = React.useState<'idle' | 'drawing' | 'drawn'>('idle');
    const [circleCenter, setCircleCenter] = React.useState<[number, number] | null>(null);
    const [circleRadiusKm, setCircleRadiusKm] = React.useState<number>(0);

    // Analysis State
    const [activeJobId, setActiveJobId] = React.useState<string | null>(null);
    const [analysisStatus, setAnalysisStatus] = React.useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
    const [metrics, setMetrics] = React.useState<{ buildingDensityPct: number | null, roadDensity: number | null } | null>(null);
    const [geoJson, setGeoJson] = React.useState<any>(null);
    const [visibleLayers, setVisibleLayers] = React.useState({ buildings: true, roads: true });

    const handleToggleDraw = React.useCallback(() => {
        setDrawingState(prev => {
            if (prev !== 'drawing') {
                setCircleCenter(null);
                setCircleRadiusKm(0);
                setAnalysisStatus('idle');
                setMetrics(null);
                setGeoJson(null);
                return 'drawing';
            }
            return 'idle';
        });
    }, []);

    const handleClearDraw = React.useCallback(() => {
        setDrawingState('idle');
        setCircleCenter(null);
        setCircleRadiusKm(0);
        setAnalysisStatus('idle');
        setMetrics(null);
        setGeoJson(null);
    }, []);

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

    // Polling logic for job status
    React.useEffect(() => {
        if (!activeJobId || analysisStatus !== 'analyzing') return;

        let pollCount = 0;
        const interval = setInterval(async () => {
            pollCount++;
            if (pollCount > 60) { // Timeout after 2 minutes (2s * 60)
                setAnalysisStatus('error');
                clearInterval(interval);
                return;
            }

            try {
                const response = await fetch(`/api/analyze/${activeJobId}`);
                const data = await response.json();

                if (data.state === 'completed') {
                    setMetrics(data.metrics);
                    setAnalysisStatus('completed');
                    clearInterval(interval);

                    // Fetch geometries once completed
                    const geoResponse = await fetch(`/api/analyze/${activeJobId}/geometries`);
                    const geoData = await geoResponse.json();
                    setGeoJson(geoData);
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

    return (
        <MapProvider>
            <div className="h-full w-full relative">
                <Map
                    id="main-map"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                        longitude: -0.1276,
                        latitude: 51.5072,
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
                        />
                    )}
                </Map>

                {/* Left Side Controls */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-4">
                    <CitySearch />
                    <DrawControl
                        drawingState={drawingState}
                        onToggleDraw={handleToggleDraw}
                        onClear={handleClearDraw}
                    />
                    {analysisStatus === 'completed' && (
                        <LayerToggle 
                            visibleLayers={visibleLayers} 
                            onToggleLayer={toggleLayer} 
                        />
                    )}
                </div>

                {/* Right Side Results */}
                <div className="absolute top-4 right-4 z-10">
                    <ResultsCard 
                        status={analysisStatus} 
                        metrics={metrics} 
                    />
                </div>
            </div>
        </MapProvider>
    );
}
