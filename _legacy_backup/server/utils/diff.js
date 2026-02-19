const turf = require('@turf/turf');

/**
 * Compares two GeoJSON FeatureCollections and identifies changes.
 * Complexity: O(N*M) - Optimized with BBox checks.
 * @param {Object} oldGeoJSON 
 * @param {Object} newGeoJSON 
 * @returns {Object} - Merged FeatureCollection with 'changeType' properties.
 */
function computeDiff(oldGeoJSON, newGeoJSON) {
    console.log(`[Diff] Computing delta between ${oldGeoJSON.features.length} old and ${newGeoJSON.features.length} new features...`);

    const outputFeatures = [];
    const oldFeatures = oldGeoJSON.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
    const newFeatures = newGeoJSON.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');

    // 1. Identify "NEW" buildings (Present in New, Not in Old)
    newFeatures.forEach(newFeature => {
        let isExisting = false;

        // Optimization: Pre-calculate bbox
        const newBbox = turf.bbox(newFeature);

        for (const oldFeature of oldFeatures) {
            // Quick BBox check first
            const oldBbox = turf.bbox(oldFeature);
            if (!turf.booleanOverlap(turf.bboxPolygon(newBbox), turf.bboxPolygon(oldBbox))) {
                continue; // Disjoint bboxes, skip precise check
            }

            // Precise intersection check
            try {
                if (turf.booleanIntersects(newFeature, oldFeature)) {
                    // Check intersection area ratio to handle slight map shifts?
                    // For MVP, strict intersection is enough to say "It existed".
                    isExisting = true;
                    break;
                }
            } catch (e) {
                // Handle invalid geometries
                continue;
            }
        }

        const featureWithStatus = { ...newFeature };
        featureWithStatus.properties = { ...newFeature.properties, changeType: isExisting ? 'existing' : 'new' };
        outputFeatures.push(featureWithStatus);
    });

    // 2. Identify "DEMOLISHED" buildings (Present in Old, Not in New)
    // (Optional for High-Detail mode, skipping for speed in MVP unless requested)
    // To do this, we'd reverse the loop.

    // For now, let's just return the Current View annotated with "Newness".

    const result = turf.featureCollection(outputFeatures);
    console.log(`[Diff] Found ${outputFeatures.filter(f => f.properties.changeType === 'new').length} new structures.`);
    return result;
}

module.exports = { computeDiff };
