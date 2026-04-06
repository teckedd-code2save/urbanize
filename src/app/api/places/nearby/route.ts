import { NextRequest, NextResponse } from 'next/server';
import { findNearestPlace } from '@/lib/google-places';

/**
 * GET /api/places/nearby?lat=&lon=&amenity=
 *
 * Finds the nearest Google Place to the given coordinates.
 * Used to enrich a POI clicked on the map with live data:
 * name, address, rating, opening hours, website, phone number.
 *
 * Returns 204 if GOOGLE_MAPS_API_KEY is not configured (graceful degradation).
 */
export async function GET(req: NextRequest) {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        return new NextResponse(null, { status: 204 });
    }

    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lon = parseFloat(searchParams.get('lon') ?? '');
    const amenity = searchParams.get('amenity') ?? undefined;

    if (isNaN(lat) || isNaN(lon)) {
        return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }

    try {
        const place = await findNearestPlace(lat, lon, amenity);
        if (!place) {
            return NextResponse.json({ error: 'No place found nearby' }, { status: 404 });
        }
        return NextResponse.json(place);
    } catch (err: any) {
        console.error('[Places API]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
