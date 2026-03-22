'use client';

import * as React from 'react';
import Map, { Source, Layer, ViewStateChangeEvent } from 'react-map-gl';
import { ChevronsLeftRight } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface SplitScreenMapProps {
    readonly yearA: number;
    readonly yearB: number;
    readonly geoJsonA: any;
    readonly geoJsonB: any;
    readonly initialViewState: { longitude: number; latitude: number; zoom: number };
}

/**
 * Renders two synchronized Mapbox maps side-by-side with a draggable divider.
 * Left panel = Year A (Past), Right panel = Year B (Present).
 * Both maps share the same viewState so they always stay in sync.
 */
export function SplitScreenMap({
    yearA,
    yearB,
    geoJsonA,
    geoJsonB,
    initialViewState,
}: SplitScreenMapProps) {
    const [viewState, setViewState] = React.useState(initialViewState);
    const [splitPct, setSplitPct] = React.useState(50);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const isDragging = React.useRef(false);

    const handleMove = React.useCallback((e: ViewStateChangeEvent) => {
        setViewState(e.viewState as any);
    }, []);

    const handleDividerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = Math.min(85, Math.max(15, (x / rect.width) * 100));
            setSplitPct(pct);
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    if (!MAPBOX_TOKEN) return null;

    const emptyGeoJson = { type: 'FeatureCollection', features: [] };

    const buildingsA = filterBuildings(geoJsonA ?? emptyGeoJson);
    const roadsA = filterRoads(geoJsonA ?? emptyGeoJson);
    const buildingsB = filterBuildings(geoJsonB ?? emptyGeoJson);
    const roadsB = filterRoads(geoJsonB ?? emptyGeoJson);

    return (
        <div ref={containerRef} className="h-full w-full relative overflow-hidden select-none">
            {/* Left panel — Year A */}
            <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${splitPct}%` }}
            >
                <Map
                    id="split-map-a"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    {...viewState}
                    onMove={handleMove}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                >
                    <Source id="split-buildings-a-src" type="geojson" data={buildingsA}>
                        <Layer
                            id="split-buildings-a"
                            type="fill"
                            paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.65, 'fill-outline-color': '#1d4ed8' }}
                        />
                    </Source>
                    <Source id="split-roads-a-src" type="geojson" data={roadsA}>
                        <Layer
                            id="split-roads-a"
                            type="line"
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': '#f59e0b',
                                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 14, 3, 16, 5],
                                'line-opacity': 0.85,
                            }}
                        />
                    </Source>
                </Map>
                <div className="absolute top-4 left-4 z-10 rounded-lg bg-blue-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                    {yearA} — Past
                </div>
            </div>

            {/* Right panel — Year B */}
            <div
                className="absolute inset-y-0 right-0 overflow-hidden"
                style={{ width: `${100 - splitPct}%` }}
            >
                <Map
                    id="split-map-b"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    {...viewState}
                    onMove={handleMove}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                >
                    <Source id="split-buildings-b-src" type="geojson" data={buildingsB}>
                        <Layer
                            id="split-buildings-b"
                            type="fill"
                            paint={{ 'fill-color': '#10b981', 'fill-opacity': 0.65, 'fill-outline-color': '#065f46' }}
                        />
                    </Source>
                    <Source id="split-roads-b-src" type="geojson" data={roadsB}>
                        <Layer
                            id="split-roads-b"
                            type="line"
                            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                            paint={{
                                'line-color': '#fbbf24',
                                'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 14, 3, 16, 5],
                                'line-opacity': 0.85,
                            }}
                        />
                    </Source>
                </Map>
                <div className="absolute top-4 right-4 z-10 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                    {yearB} — Present
                </div>
            </div>

            {/* Draggable divider */}
            <div
                className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
                style={{ left: `${splitPct}%`, transform: 'translateX(-50%)', width: '20px' }}
                onMouseDown={handleDividerMouseDown}
            >
                <div className="h-full w-0.5 bg-white/70 shadow-xl" />
                <div className="absolute rounded-full bg-white p-1.5 shadow-xl">
                    <ChevronsLeftRight className="h-4 w-4 text-slate-700" />
                </div>
            </div>
        </div>
    );
}

function filterBuildings(geoJson: any) {
    return {
        ...geoJson,
        features: (geoJson.features ?? []).filter(
            (f: any) =>
                (f.properties?.building === 'yes' || f.properties?.building) &&
                (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
        ),
    };
}

function filterRoads(geoJson: any) {
    return {
        ...geoJson,
        features: (geoJson.features ?? []).filter((f: any) => f.properties?.highway),
    };
}
