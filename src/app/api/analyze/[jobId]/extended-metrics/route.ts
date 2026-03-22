import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { computeExtendedMetrics } from '@/lib/extended-metrics';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    try {
        const row = await db.selectFrom('urbanParameters')
            .select(['lat', 'lon', 'radiusKm'])
            .where('jobId', '=', jobId)
            .executeTakeFirst();

        if (!row) {
            return NextResponse.json({ error: 'Job metrics not found' }, { status: 404 });
        }

        const metrics = await computeExtendedMetrics({
            jobId,
            lat: row.lat,
            lon: row.lon,
            radiusKm: row.radiusKm,
        });

        return NextResponse.json(metrics);
    } catch (error: any) {
        console.error(`[API] Error in /api/analyze/${jobId}/extended-metrics:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
