import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dataFetchQueue } from '@/lib/queue';

const APP_VERSION = '1.0.0';

/**
 * GET /api/export/csv?jobAId=&jobBId=
 *
 * Generates a citation-ready CSV containing building and road density metrics
 * for two time periods and their signed delta.
 *
 * Citation string format (Story 5.2):
 * "Data generated via Urbanize v{version} using OSM Data {timestamp}"
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

        const [jobA, jobB] = await Promise.all([
            dataFetchQueue.getJob(jobAId),
            dataFetchQueue.getJob(jobBId),
        ]);

        const yearA = jobA?.data?.year ?? 'unknown';
        const yearB = jobB?.data?.year ?? 'unknown';

        const [metricsA, metricsB] = await Promise.all([
            db.selectFrom('urbanParameters').selectAll().where('jobId', '=', jobAId).executeTakeFirst(),
            db.selectFrom('urbanParameters').selectAll().where('jobId', '=', jobBId).executeTakeFirst(),
        ]);

        if (!metricsA || !metricsB) {
            return NextResponse.json(
                { error: 'Metrics not found for one or both jobs' },
                { status: 404 }
            );
        }

        const timestamp = new Date().toISOString();
        const { lat, lon, radiusKm } = metricsA;

        const buildingA = metricsA.buildingDensityPct ?? 0;
        const buildingB = metricsB.buildingDensityPct ?? 0;
        const roadA = metricsA.roadDensity ?? 0;
        const roadB = metricsB.roadDensity ?? 0;

        // Story 5.2: Citation string
        const citationString =
            `Data generated via Urbanize v${APP_VERSION} using OpenStreetMap historical data. ` +
            `Timestamp: ${timestamp}. ` +
            `Algorithm v${APP_VERSION}: Building Density = Sum(Building Footprint Area) / Circle Area (EPSG:5070); ` +
            `Road Density = Sum(Road Length) / Circle Area expressed in km/km2.`;

        const lines = [
            `# ${citationString}`,
            `# Study area: lat=${lat}, lon=${lon}, radius=${radiusKm}km`,
            `# Period A: ${yearA} | Period B: ${yearB}`,
            '#',
            'period,year,metric,value,unit',
            `A,${yearA},building_density_pct,${buildingA.toFixed(4)},%`,
            `A,${yearA},road_density,${roadA.toFixed(4)},km/km2`,
            `B,${yearB},building_density_pct,${buildingB.toFixed(4)},%`,
            `B,${yearB},road_density,${roadB.toFixed(4)},km/km2`,
            `delta,,building_density_pct,${(buildingB - buildingA).toFixed(4)},%`,
            `delta,,road_density,${(roadB - roadA).toFixed(4)},km/km2`,
        ];

        const csvContent = lines.join('\n');

        // Story 5.3: filename includes years and timestamp
        const safeTimestamp = timestamp.replace(/[:.]/g, '-').slice(0, 19);
        const filename = `urbanize_analysis_${yearA}_vs_${yearB}_${safeTimestamp}.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('[API] Error in /api/export/csv:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
