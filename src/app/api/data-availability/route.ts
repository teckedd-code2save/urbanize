import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'kysely';

/**
 * GET /api/data-availability
 * Query params: lat, lon, radiusKm
 *
 * Returns the data availability for each year based on osm_data cache.
 * Used by the TimelineSelector to colour-code year markers.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');
        const radiusKm = searchParams.get('radiusKm');

        if (!lat || !lon || !radiusKm) {
            return NextResponse.json({ error: 'lat, lon, and radiusKm are required' }, { status: 400 });
        }

        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const radiusKmNum = parseFloat(radiusKm);

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(radiusKmNum) || radiusKmNum <= 0) {
            return NextResponse.json({ error: 'Invalid spatial parameters' }, { status: 400 });
        }

        // Query the DB for feature counts grouped by fetched_for_year
        // Uses ST_DWithin in degrees (approx) for a fast index-friendly check
        const radiusMeters = radiusKmNum * 1000;

        const rows = await sql<{ year: number | null; count: number }>`
            SELECT
                fetched_for_year AS year,
                COUNT(*) AS count
            FROM osm_data
            WHERE ST_DWithin(
                geom,
                ST_Transform(ST_SetSRID(ST_MakePoint(${lonNum}, ${latNum}), 4326), 5070),
                ${radiusMeters}
            )
            GROUP BY fetched_for_year
            ORDER BY fetched_for_year ASC
        `.execute(db);

        // Map counts to availability strings
        const currentYear = new Date().getFullYear();
        const FULL_THRESHOLD = 50;
        const PARTIAL_THRESHOLD = 10;

        const availability: { year: number; available: 'full' | 'partial' | 'none' }[] = [];

        for (let year = 2015; year <= currentYear; year++) {
            const row = rows.rows.find(r => r.year === year);
            const count = row ? Number(row.count) : 0;

            let available: 'full' | 'partial' | 'none' = 'none';
            if (count >= FULL_THRESHOLD) available = 'full';
            else if (count >= PARTIAL_THRESHOLD) available = 'partial';

            availability.push({ year, available });
        }

        // Also include null year (undated data) as a special case treated as 'full' for current view
        const nullRow = rows.rows.find(r => r.year === null);
        if (nullRow && Number(nullRow.count) >= PARTIAL_THRESHOLD) {
            // Mark current year as having data even if fetched_for_year is null (current data)
            const currentEntry = availability.find(a => a.year === currentYear);
            if (currentEntry && currentEntry.available === 'none') {
                currentEntry.available = Number(nullRow.count) >= FULL_THRESHOLD ? 'full' : 'partial';
            }
        }

        return NextResponse.json({ availability });
    } catch (error: any) {
        console.error('[API] Error in /api/data-availability:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
