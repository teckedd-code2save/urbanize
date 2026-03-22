import * as React from 'react';
import { Source, Layer } from 'react-map-gl';

interface AnalysisLayersProps {
    readonly geoJson: any;
    readonly visibleLayers: {
        readonly buildings: boolean;
        readonly roads: boolean;
    };
}

// Classify a POI feature into a colour bucket for the map marker
function poiColor(props: Record<string, any>): string | null {
    const a = props.amenity as string | undefined;
    const h = props.highway as string | undefined;
    const pt = props.public_transport as string | undefined;
    const shop = props.shop as string | undefined;
    const leisure = props.leisure as string | undefined;

    if (h === 'bus_stop' || pt) return '#8b5cf6'; // violet — transit
    if (a === 'school' || a === 'kindergarten' || a === 'university' || a === 'college') return '#f59e0b'; // amber — education
    if (a === 'hospital' || a === 'clinic' || a === 'doctors' || a === 'dentist' || a === 'health_centre') return '#ef4444'; // red — health
    if (a === 'pharmacy') return '#ec4899'; // pink — pharmacy
    if (a === 'bank' || a === 'atm' || a === 'bureau_de_change') return '#10b981'; // emerald — finance
    if (a === 'marketplace') return '#f97316'; // orange — market
    if (a === 'restaurant' || a === 'fast_food' || a === 'cafe' || a === 'food_court') return '#84cc16'; // lime — food
    if (a === 'fuel') return '#6b7280'; // gray — fuel
    if (a === 'police') return '#1d4ed8'; // dark blue — police
    if (a === 'place_of_worship') return '#a78bfa'; // light violet — worship
    if (shop) return '#fb923c'; // orange — shop
    if (leisure === 'park') return '#22c55e'; // green — park
    return null; // not a POI node — skip
}

export function AnalysisLayers({ geoJson, visibleLayers }: AnalysisLayersProps) {
    if (!geoJson) return null;

    const buildingsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) =>
            (f.properties.building || f.properties.building === 'yes') &&
            (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        )
    };

    const roadsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) => f.properties.highway)
    };

    // POI nodes only — each gets a color property injected for map expression use
    const poiData = {
        type: 'FeatureCollection' as const,
        features: geoJson.features
            .filter((f: any) => f.geometry.type === 'Point')
            .map((f: any) => {
                const color = poiColor(f.properties ?? {});
                if (!color) return null;
                return { ...f, properties: { ...f.properties, _markerColor: color } };
            })
            .filter(Boolean)
    };

    return (
        <>
            {/* Buildings Layer */}
            <Source type="geojson" data={buildingsData}>
                <Layer
                    id="osm-buildings"
                    type="fill"
                    layout={{ visibility: visibleLayers.buildings ? 'visible' : 'none' }}
                    paint={{
                        'fill-color': '#3b82f6',
                        'fill-opacity': 0.6,
                        'fill-outline-color': '#1d4ed8'
                    }}
                />
            </Source>

            {/* Roads Layer */}
            <Source type="geojson" data={roadsData}>
                <Layer
                    id="osm-roads"
                    type="line"
                    layout={{
                        visibility: visibleLayers.roads ? 'visible' : 'none',
                        'line-cap': 'round',
                        'line-join': 'round'
                    }}
                    paint={{
                        'line-color': '#f59e0b',
                        'line-width': [
                            'interpolate', ['linear'], ['zoom'],
                            11, 1,
                            14, 3,
                            16, 5
                        ],
                        'line-opacity': 0.8
                    }}
                />
            </Source>

            {/* POI markers — real OSM amenity / shop / leisure nodes */}
            {poiData.features.length > 0 && (
                <Source type="geojson" data={poiData}>
                    <Layer
                        id="osm-pois"
                        type="circle"
                        paint={{
                            'circle-color': ['get', '_markerColor'],
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                11, 4,
                                14, 7,
                                16, 10
                            ],
                            'circle-stroke-width': 1.5,
                            'circle-stroke-color': '#ffffff',
                            'circle-opacity': 0.9
                        }}
                    />
                </Source>
            )}
        </>
    );
}
