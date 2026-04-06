/**
 * Google Places API (v1 New) client.
 * Used for two purposes:
 *   1. Nearby Search in the worker — fetches POIs (schools, hospitals, markets, etc.)
 *      as a higher-quality alternative to Overpass amenity nodes for Ghana.
 *   2. Place Detail enrichment — called from /api/places/nearby when a user clicks
 *      a POI marker to get name, rating, hours, address, etc.
 *
 * Requires: GOOGLE_MAPS_API_KEY env var (server-side only, never NEXT_PUBLIC_).
 */

const PLACES_API = 'https://places.googleapis.com/v1/places:searchNearby';

/** Maps OSM amenity tags → Google Places primary type for the Nearby Search */
export const AMENITY_TO_PLACES_TYPE: Record<string, string> = {
    school: 'school',
    kindergarten: 'school',
    university: 'university',
    college: 'university',
    hospital: 'hospital',
    clinic: 'hospital',
    doctors: 'hospital',
    health_centre: 'health',
    pharmacy: 'pharmacy',
    bank: 'bank',
    atm: 'atm',
    marketplace: 'market',
    restaurant: 'restaurant',
    fast_food: 'fast_food_restaurant',
    cafe: 'cafe',
    fuel: 'gas_station',
    police: 'police',
    place_of_worship: 'place_of_worship',
    taxi: 'taxi_stand',
    bus_stop: 'bus_stop',
};

/** The set of place types we fetch for a full area scan */
export const AREA_PLACE_TYPES = [
    'school',
    'university',
    'hospital',
    'pharmacy',
    'bank',
    'market',
    'restaurant',
    'gas_station',
    'police',
    'place_of_worship',
    'taxi_stand',
    'bus_stop',
    'transit_depot', // lorry/bus stations
    'shopping_mall',
    'supermarket',
    'park',
];

export interface PlaceResult {
    placeId: string;
    name: string;
    lat: number;
    lon: number;
    types: string[];
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    openNow?: boolean;
    weekdayDescriptions?: string[];
    websiteUri?: string;
    internationalPhoneNumber?: string;
    /** Derived OSM-compatible tags for storage */
    tags: Record<string, string>;
}

const DETAIL_FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.location',
    'places.types',
    'places.formattedAddress',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours',
    'places.regularOpeningHours',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.primaryType',
].join(',');

function apiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error('GOOGLE_MAPS_API_KEY not configured');
    return key;
}

/**
 * Nearby Search for a single place type within a radius.
 * Returns up to 20 results per call (Google Places API limit per request).
 */
export async function searchNearby(
    lat: number,
    lon: number,
    radiusMeters: number,
    includedType: string,
): Promise<PlaceResult[]> {
    const res = await fetch(PLACES_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey(),
            'X-Goog-FieldMask': DETAIL_FIELD_MASK,
        },
        body: JSON.stringify({
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lon },
                    radius: Math.min(radiusMeters, 50000), // API max 50 km
                },
            },
            includedTypes: [includedType],
            maxResultCount: 20,
            languageCode: 'en',
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Places API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return (data.places ?? []).map(parsePlaceResult);
}

/**
 * Fetch all supported POI types for a study area.
 * Returns a flat list of unique PlaceResults (de-duplicated by placeId).
 */
export async function fetchAllPlacesForArea(
    lat: number,
    lon: number,
    radiusKm: number,
): Promise<PlaceResult[]> {
    const radiusMeters = radiusKm * 1000;
    const seen = new Set<string>();
    const results: PlaceResult[] = [];

    await Promise.allSettled(
        AREA_PLACE_TYPES.map(async (type) => {
            try {
                const places = await searchNearby(lat, lon, radiusMeters, type);
                for (const place of places) {
                    if (!seen.has(place.placeId)) {
                        seen.add(place.placeId);
                        results.push(place);
                    }
                }
            } catch (err) {
                console.warn(`[Places] Failed to fetch type "${type}":`, err instanceof Error ? err.message : err);
            }
        })
    );

    return results;
}

/**
 * Single place lookup (for click enrichment).
 * Uses Nearby Search with a very small radius to find the exact place.
 */
export async function findNearestPlace(
    lat: number,
    lon: number,
    amenityType?: string,
): Promise<PlaceResult | null> {
    const types = amenityType && AMENITY_TO_PLACES_TYPE[amenityType]
        ? [AMENITY_TO_PLACES_TYPE[amenityType]]
        : AREA_PLACE_TYPES.slice(0, 5); // fallback: search common types

    for (const type of types) {
        try {
            const results = await searchNearby(lat, lon, 150, type); // 150 m radius for precision
            if (results.length > 0) return results[0];
        } catch {
            // Try next type
        }
    }
    return null;
}

function parsePlaceResult(place: any): PlaceResult {
    const lat = place.location?.latitude ?? 0;
    const lon = place.location?.longitude ?? 0;
    const primaryType = place.primaryType ?? '';
    const name = place.displayName?.text ?? '';

    // Build OSM-compatible tags
    const tags: Record<string, string> = {
        source: 'google_places',
        name,
        'place:id': place.id ?? '',
    };

    // Map primary type back to OSM amenity tag
    const osmAmenity = PLACES_TYPE_TO_AMENITY[primaryType] ?? primaryType.replace(/_/g, ' ');
    if (osmAmenity) tags.amenity = osmAmenity;

    return {
        placeId: place.id ?? '',
        name,
        lat,
        lon,
        types: place.types ?? [],
        formattedAddress: place.formattedAddress,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        openNow: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow,
        weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions,
        websiteUri: place.websiteUri,
        internationalPhoneNumber: place.internationalPhoneNumber,
        tags,
    };
}

const PLACES_TYPE_TO_AMENITY: Record<string, string> = {
    school: 'school',
    university: 'university',
    hospital: 'hospital',
    pharmacy: 'pharmacy',
    bank: 'bank',
    atm: 'atm',
    market: 'marketplace',
    fast_food_restaurant: 'fast_food',
    restaurant: 'restaurant',
    cafe: 'cafe',
    gas_station: 'fuel',
    police: 'police',
    place_of_worship: 'place_of_worship',
    taxi_stand: 'taxi',
    bus_stop: 'bus_stop',
    transit_depot: 'bus_station',
    shopping_mall: 'marketplace',
    supermarket: 'supermarket',
    park: 'park',
};
