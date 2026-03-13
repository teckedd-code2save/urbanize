import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'kysely';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    try {
        // Fetch the parameters for this job to get the spatial area
        const paramsRecord = await db.selectFrom('urbanParameters')
            .selectAll()
            .where('jobId', '=', jobId)
            .executeTakeFirst();

        if (!paramsRecord) {
            return NextResponse.json({ error: 'Job parameters not found. Job might still be processing.' }, { status: 404 });
        }

        const { lat, lon, radiusKm } = paramsRecord;
        const radiusMeters = radiusKm * 1000;

        // Fetch geometries that intersect with the job's defined circle
        // Using ST_AsGeoJSON to get the geometry in a format easily usable on the frontend
        const rows = await db.selectFrom('osmData')
            .select([
                'osmId',
                'osmType',
                'tags',
                sql<string>`ST_AsGeoJSON(ST_Transform(geom, 4326))`.as('geojson')
            ])
            .where(
                sql<boolean>`ST_Intersects(geom, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)}))`
            )
            .execute();

        const features = rows.map(row => ({
            type: 'Feature',
            properties: {
                osmId: row.osmId,
                osmType: row.osmType,
                ...row.tags
            },
            geometry: JSON.parse(row.geojson)
        }));

        return NextResponse.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error: any) {
        console.error(`[API] Error in /api/analyze/${jobId}/geometries:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
