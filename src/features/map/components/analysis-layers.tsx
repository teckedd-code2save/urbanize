import * as React from 'react';
import { Source, Layer } from 'react-map-gl';

interface AnalysisLayersProps {
    readonly geoJson: any;
    readonly visibleLayers: {
        readonly buildings: boolean;
        readonly roads: boolean;
    };
}

export function AnalysisLayers({ geoJson, visibleLayers }: AnalysisLayersProps) {
    if (!geoJson) return null;

    // Filter features based on layer visibility
    const buildingsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) => 
            f.properties.building === 'yes' || f.properties.osmType === 'relation' || f.properties.osmType === 'way'
        ).filter((f: any) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
    };

    const roadsData = {
        ...geoJson,
        features: geoJson.features.filter((f: any) => f.properties.highway)
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
        </>
    );
}
