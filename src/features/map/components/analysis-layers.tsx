import * as React from 'react';
import { Source, Layer } from 'react-map-gl';
import * as turf from '@turf/circle';

interface AnalysisLayersProps {
    readonly geoJson: any;
    readonly visibleLayers: {
        readonly buildings: boolean;
        readonly roads: boolean;
    };
    readonly circleCenter?: [number, number] | null;
    readonly circleRadiusKm?: number;
}

/** Map a POI feature to a hex colour, or null if it should not be rendered as a marker */
function poiColor(props: Record<string, any>): string | null {
    const a  = props.amenity as string | undefined;
    const h  = props.highway as string | undefined;
    const pt = props.public_transport as string | undefined;
    const shop    = props.shop    as string | undefined;
    const leisure = props.leisure as string | undefined;

    if (h === 'bus_stop' || pt)                                                       return '#8b5cf6'; // violet  — transit
    if (a === 'school' || a === 'kindergarten' || a === 'university' || a === 'college') return '#f59e0b'; // amber   — education
    if (a === 'hospital' || a === 'clinic' || a === 'doctors' || a === 'health_centre')  return '#ef4444'; // red     — health
    if (a === 'pharmacy')                                                              return '#ec4899'; // pink    — pharmacy
    if (a === 'bank' || a === 'atm' || a === 'bureau_de_change')                       return '#10b981'; // emerald — finance
    if (a === 'marketplace')                                                           return '#f97316'; // orange  — market
    if (a === 'restaurant' || a === 'fast_food' || a === 'cafe' || a === 'food_court') return '#84cc16'; // lime    — food
    if (a === 'fuel')                                                                  return '#6b7280'; // gray    — fuel
    if (a === 'police')                                                                return '#1d4ed8'; // blue    — police
    if (a === 'place_of_worship')                                                      return '#a78bfa'; // violet  — worship
    if (a === 'taxi')                                                                  return '#fbbf24'; // yellow  — taxi
    if (shop)                                                                          return '#fb923c'; // orange  — shop
    if (leisure === 'park')                                                            return '#22c55e'; // green   — park
    return null;
}

export function AnalysisLayers({ geoJson, visibleLayers, circleCenter, circleRadiusKm }: AnalysisLayersProps) {
    if (!geoJson) return null;

    // ── Study area boundary circle ─────────────────────────────────────────────
    const circleGeoJson = React.useMemo(() => {
        if (!circleCenter || !circleRadiusKm) return null;
        return turf.default(
            [circleCenter[0], circleCenter[1]],
            circleRadiusKm,
            { steps: 64, units: 'kilometers' }
        );
    }, [circleCenter, circleRadiusKm]);

    // ── Feature buckets ────────────────────────────────────────────────────────
    const buildingsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) =>
            f.properties.building &&
            (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        ),
    };

    const roadsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) => f.properties.highway),
    };

    const poiData = {
        type: 'FeatureCollection' as const,
        features: geoJson.features
            .filter((f: any) => f.geometry.type === 'Point')
            .map((f: any) => {
                const color = poiColor(f.properties ?? {});
                if (!color) return null;
                return { ...f, properties: { ...f.properties, _color: color } };
            })
            .filter(Boolean),
    };

    return (
        <>
            {/* Study area boundary */}
            {circleGeoJson && (
                <Source type="geojson" data={circleGeoJson}>
                    <Layer
                        id="study-area-fill"
                        type="fill"
                        paint={{ 'fill-color': '#ffffff', 'fill-opacity': 0.05 }}
                    />
                    <Layer
                        id="study-area-border"
                        type="line"
                        paint={{
                            'line-color': '#ffffff',
                            'line-width': 2,
                            'line-dasharray': [4, 3],
                            'line-opacity': 0.9,
                        }}
                    />
                </Source>
            )}

            {/* Buildings */}
            <Source type="geojson" data={buildingsData}>
                <Layer
                    id="osm-buildings"
                    type="fill"
                    layout={{ visibility: visibleLayers.buildings ? 'visible' : 'none' }}
                    paint={{
                        'fill-color': '#3b82f6',
                        'fill-opacity': 0.65,
                        'fill-outline-color': '#93c5fd',
                    }}
                />
            </Source>

            {/* Roads */}
            <Source type="geojson" data={roadsData}>
                <Layer
                    id="osm-roads"
                    type="line"
                    layout={{
                        visibility: visibleLayers.roads ? 'visible' : 'none',
                        'line-cap': 'round',
                        'line-join': 'round',
                    }}
                    paint={{
                        'line-color': [
                            'match', ['get', 'highway'],
                            ['motorway', 'trunk', 'primary'],   '#f97316',
                            ['secondary', 'tertiary'],          '#fbbf24',
                            ['residential', 'unclassified'],    '#e5e7eb',
                            /* default */ '#d1d5db',
                        ],
                        'line-width': [
                            'interpolate', ['linear'], ['zoom'],
                            11, ['match', ['get', 'highway'],
                                ['motorway','trunk','primary'], 2,
                                ['secondary','tertiary'], 1.5,
                                1],
                            15, ['match', ['get', 'highway'],
                                ['motorway','trunk','primary'], 6,
                                ['secondary','tertiary'], 4,
                                2],
                        ],
                        'line-opacity': 0.9,
                    }}
                />
            </Source>

            {/* POI markers */}
            {poiData.features.length > 0 && (
                <Source type="geojson" data={poiData}>
                    <Layer
                        id="osm-pois"
                        type="circle"
                        paint={{
                            'circle-color': ['get', '_color'],
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                11, 4, 14, 7, 16, 10,
                            ],
                            'circle-stroke-width': 1.5,
                            'circle-stroke-color': '#ffffff',
                            'circle-opacity': 0.95,
                        }}
                    />
                </Source>
            )}
        </>
    );
}
