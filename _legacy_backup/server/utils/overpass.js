const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const { scheduleRequest } = require('./queue');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Calculates a Bounding Box from a center point and radius.
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radiusMeters 
 * @returns {string} - Overpass format: (south,west,north,east)
 */
function getBoundingBox(lat, lng, radiusMeters) {
    const latDelta = radiusMeters / 111320;
    const lngDelta = radiusMeters / (111320 * Math.cos(lat * (Math.PI / 180)));

    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    return `${south},${west},${north},${east}`;
}

/**
 * Fetches data from Overpass API for a specific date and location.
 * Uses the Job Queue to prevent rate limiting.
 * @param {string} date - ISO date string (or null for current)
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radius 
 */
async function fetchSnapshot(lat, lng, radius, date) {
    const bbox = getBoundingBox(lat, lng, radius);

    // Construct Query
    // [out:json];
    // [date:"2020-01-01T00:00:00Z"]; // Optional history
    // (
    //   way["building"](bbox);
    //   way["highway"](bbox);
    //   relation["building"](bbox); 
    // );
    // out geom;

    let timeFilter = '';
    if (date) {
        // Ensure strictly ISO format if passed
        timeFilter = `[date:"${date}"]`;
    }

    const query = `
        [out:json][timeout:25]${timeFilter};
        (
            way["building"](${bbox});
            relation["building"](${bbox});
            way["highway"](${bbox});
        );
        out geom;
    `;

    console.log(`[Overpass] Queuing request for ${date || 'NOW'} @ ${lat},${lng} (r=${radius}m)`);

    try {
        const response = await scheduleRequest(() => axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`));

        console.log(`[Overpass] Received ${response.data.elements ? response.data.elements.length : 0} elements`);

        // Convert to GeoJSON
        const geojson = osmtogeojson(response.data);
        return geojson;
    } catch (error) {
        console.error('[Overpass] Error:', error.message);
        throw error;
    }
}

module.exports = { fetchSnapshot };
