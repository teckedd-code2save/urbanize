import { NextRequest, NextResponse } from 'next/server';
import { addJobSchema } from '@/lib/job-schema';
import { dataFetchQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = addJobSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.message }, { status: 400 });
        }

        const { lat, lon, radiusKm } = validation.data;
        let query = validation.data.query;

        // If no query but spatial data is provided, generate a standard Overpass query for urban data
        if (!query && lat !== undefined && lon !== undefined && radiusKm !== undefined) {
          const deltaLat = radiusKm / 111.32;
          const deltaLon = radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)));
          
          const minLat = lat - deltaLat;
          const minLon = lon - deltaLon;
          const maxLat = lat + deltaLat;
          const maxLon = lon + deltaLon;
          
          query = `[out:json][timeout:60];
(
  way["building"](${minLat},${minLon},${maxLat},${maxLon});
  way["highway"](${minLat},${minLon},${maxLat},${maxLon});
);
out geom;`;
        }

        if (!query) {
            return NextResponse.json({ error: "Either query or spaital parameters (lat, lon, radiusKm) must be provided." }, { status: 400 });
        }

        const job = await dataFetchQueue.add('analyze-area', {
            ...validation.data,
            query
        });

        return NextResponse.json({ jobId: job.id });
    } catch (error: any) {
        console.error('[API] Error in /api/analyze:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
