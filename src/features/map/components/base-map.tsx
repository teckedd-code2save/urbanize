'use client';

import * as React from 'react';
import Map, { MapProvider } from 'react-map-gl';
import { AlertTriangle } from 'lucide-react';

import { CitySearch } from './city-search';
import { CircleDrawer } from './circle-drawer';
import { DrawControl } from './draw-control';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function BaseMap() {
    const [drawingState, setDrawingState] = React.useState<'idle' | 'drawing' | 'drawn'>('idle');
    const [circleCenter, setCircleCenter] = React.useState<[number, number] | null>(null);
    const [circleRadiusKm, setCircleRadiusKm] = React.useState<number>(0);

    const handleToggleDraw = React.useCallback(() => {
        setDrawingState(prev => {
            if (prev !== 'drawing') {
                // Entering draw mode from idle OR re-drawing after a completed circle
                setCircleCenter(null);
                setCircleRadiusKm(0);
                return 'drawing';
            }
            return 'idle';
        });
    }, []);

    const handleClearDraw = React.useCallback(() => {
        setDrawingState('idle');
        setCircleCenter(null);
        setCircleRadiusKm(0);
    }, []);

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
                        longitude: -0.1276, // Default to London (per PRD city focus)
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
                        onUpdateCircle={React.useCallback((center: [number, number], radius: number) => {
                            setCircleCenter(center);
                            setCircleRadiusKm(radius);
                        }, [])}
                        onDrawingComplete={React.useCallback(() => setDrawingState('drawn'), [])}
                    />
                </Map>

                <div className="absolute top-4 left-4 z-10 flex flex-col gap-4">
                    <CitySearch />
                    <DrawControl
                        drawingState={drawingState}
                        onToggleDraw={handleToggleDraw}
                        onClear={handleClearDraw}
                    />
                </div>
            </div>
        </MapProvider>
    );
}
