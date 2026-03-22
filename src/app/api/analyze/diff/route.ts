import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dataFetchQueue } from '@/lib/queue';

/**
 * GET /api/analyze/diff?jobAId=&jobBId=
 *
 * Computes the temporal diff between two completed analysis jobs.
 * Returns Year A metrics, Year B metrics, and the signed delta (B − A).
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const jobAId = searchParams.get('jobAId');
        const jobBId = searchParams.get('jobBId');

        if (!jobAId || !jobBId) {
            return NextResponse.json(
                { error: 'jobAId and jobBId are required' },
                { status: 400 }
            );
        }

        // Get job data for year information
        const [jobA, jobB] = await Promise.all([
            dataFetchQueue.getJob(jobAId),
            dataFetchQueue.getJob(jobBId),
        ]);

        const yearA: number | null = jobA?.data?.year ?? null;
        const yearB: number | null = jobB?.data?.year ?? null;

        // Get stored density metrics for both jobs
        const [metricsA, metricsB] = await Promise.all([
            db.selectFrom('urbanParameters')
                .selectAll()
                .where('jobId', '=', jobAId)
                .executeTakeFirst(),
            db.selectFrom('urbanParameters')
                .selectAll()
                .where('jobId', '=', jobBId)
                .executeTakeFirst(),
        ]);

        if (!metricsA || !metricsB) {
            return NextResponse.json(
                { error: 'Metrics not found for one or both jobs. Jobs may still be processing.' },
                { status: 404 }
            );
        }

        const buildingA = metricsA.buildingDensityPct ?? 0;
        const buildingB = metricsB.buildingDensityPct ?? 0;
        const roadA = metricsA.roadDensity ?? 0;
        const roadB = metricsB.roadDensity ?? 0;

        return NextResponse.json({
            yearA,
            yearB,
            metricsA: {
                buildingDensityPct: metricsA.buildingDensityPct,
                roadDensity: metricsA.roadDensity,
            },
            metricsB: {
                buildingDensityPct: metricsB.buildingDensityPct,
                roadDensity: metricsB.roadDensity,
            },
            delta: {
                buildingDensityPct: buildingB - buildingA,
                roadDensity: roadB - roadA,
            },
        });
    } catch (error: any) {
        console.error('[API] Error in /api/analyze/diff:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
