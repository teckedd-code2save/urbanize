import { useEffect, useRef } from 'react';
import { useMap, Source, Layer } from 'react-map-gl';
import circle from '@turf/circle';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { MapMouseEvent } from 'mapbox-gl';
import { MAX_CIRCLE_RADIUS_KM } from '../constants';

interface CircleDrawerProps {
    drawingState: 'idle' | 'drawing' | 'drawn';
    circleCenter: [number, number] | null;
    circleRadiusKm: number;
    onUpdateCircle: (center: [number, number], radius: number) => void;
    onDrawingComplete: () => void;
}

export function CircleDrawer({
    drawingState,
    circleCenter,
    circleRadiusKm,
    onUpdateCircle,
    onDrawingComplete
}: CircleDrawerProps) {
    const { 'main-map': mapRef } = useMap();
    const map = mapRef?.getMap();

    const stateRef = useRef({ drawingState, circleCenter, circleRadiusKm });

    useEffect(() => {
        stateRef.current = { drawingState, circleCenter, circleRadiusKm };
    }, [drawingState, circleCenter, circleRadiusKm]);

    useEffect(() => {
        if (!map) return;

        if (drawingState === 'idle') {
            map.getCanvas().style.cursor = '';
            return;
        }

        if (drawingState === 'drawing') {
            map.getCanvas().style.cursor = 'crosshair';
            map.dragPan.disable();
        } else {
            map.getCanvas().style.cursor = '';
            map.dragPan.enable();
        }

        const onMouseDown = (e: MapMouseEvent) => {
            if (stateRef.current.drawingState === 'drawing') {
                e.preventDefault();
                onUpdateCircle([e.lngLat.lng, e.lngLat.lat], 0);
            }
        };

        const onMouseMove = (e: MapMouseEvent) => {
            const { drawingState, circleCenter } = stateRef.current;
            if (drawingState === 'drawing' && circleCenter) {
                const dist = distance(point(circleCenter), point([e.lngLat.lng, e.lngLat.lat]));
                onUpdateCircle(circleCenter, Math.min(dist, MAX_CIRCLE_RADIUS_KM));
            }
        };

        const onMouseUp = () => {
            const { drawingState, circleCenter, circleRadiusKm } = stateRef.current;
            if (drawingState === 'drawing' && circleCenter && circleRadiusKm > 0) {
                onDrawingComplete();
                map.dragPan.enable();
            }
        };

        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);

        return () => {
            map.off('mousedown', onMouseDown);
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            map.dragPan.enable();
        };
    }, [map, drawingState, onUpdateCircle, onDrawingComplete]);

    let geojson = null;
    if (circleCenter && circleRadiusKm > 0) {
        geojson = circle(circleCenter, circleRadiusKm, { steps: 64, units: 'kilometers' });
    }

    return (
        <>
            {geojson && (
                <Source type="geojson" data={geojson}>
                    <Layer
                        id="circle-fill"
                        type="fill"
                        paint={{
                            'fill-color': circleRadiusKm >= MAX_CIRCLE_RADIUS_KM ? '#ef4444' : '#3b82f6',
                            'fill-opacity': 0.2
                        }}
                    />
                    <Layer
                        id="circle-line"
                        type="line"
                        paint={{
                            'line-color': circleRadiusKm >= MAX_CIRCLE_RADIUS_KM ? '#ef4444' : '#3b82f6',
                            'line-width': 2
                        }}
                    />
                </Source>
            )}

            {/* Distance Tooltip */}
            {(drawingState === 'drawing' || drawingState === 'drawn') && circleCenter && circleRadiusKm > 0 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-4 py-2 rounded-full shadow-lg font-semibold border border-border text-sm pointer-events-none">
                    <span className={circleRadiusKm >= MAX_CIRCLE_RADIUS_KM ? 'text-destructive' : 'text-foreground'}>
                        {drawingState === 'drawn' ? 'Selected Radius: ' : 'Radius: '}
                        {circleRadiusKm.toFixed(2)} km {circleRadiusKm >= MAX_CIRCLE_RADIUS_KM && '(Max Limit)'}
                    </span>
                </div>
            )}
        </>
    );
}
