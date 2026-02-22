'use client';

import * as React from 'react';
import Map, { MapProvider } from 'react-map-gl';
import { AlertTriangle } from 'lucide-react';

import { CitySearch } from './city-search';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function BaseMap() {
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
                />

                <div className="absolute top-4 left-4 z-10">
                    <CitySearch />
                </div>
            </div>
        </MapProvider>
    );
}
