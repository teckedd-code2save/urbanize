import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/traffic?lat=&lon=&radiusKm=
 *
 * Fetches real-time traffic flow data from the HERE Traffic Flow API v7.
 * Returns aggregated metrics for the study circle:
 *
 *   - segmentCount       — number of road segments with traffic data
 *   - avgSpeedKmh        — weighted average current speed across segments
 *   - avgFreeFlowKmh     — weighted average free-flow speed (uncongested baseline)
 *   - avgJamFactor       — weighted average jam factor (0=free, 10=standstill)
 *   - peakCongestionPct  — (1 − avg/freeFlow) × 100 — proxy for congestion level
 *   - segments           — raw segment array for client-side rendering
 *
 * Requires: HERE_API_KEY env var.
 * Returns 204 if HERE_API_KEY is not configured (graceful degradation).
 */

const HERE_TRAFFIC_URL = 'https://data.traffic.hereapi.com/v7/flow';

interface HereFlowResult {
    currentFlow: {
        speed: number;        // current speed km/h
        freeFlow: number;     // free-flow speed km/h
        jamFactor: number;    // 0–10
        confidence: number;   // 0–1
        traversability: string;
    };
    location: {
        shape?: {
            links?: Array<{ points: Array<{ lat: number; lng: number }> }>;
        };
    };
}

interface TrafficSegment {
    speedKmh: number;
    freeFlowKmh: number;
    jamFactor: number;
    congestionPct: number;
}

export interface TrafficMetrics {
    segmentCount: number;
    avgSpeedKmh: number | null;
    avgFreeFlowKmh: number | null;
    avgJamFactor: number | null;
    peakCongestionPct: number | null;
    segments: TrafficSegment[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    if (!process.env.HERE_API_KEY) {
        return new NextResponse(null, { status: 204 });
    }

    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lon = parseFloat(searchParams.get('lon') ?? '');
    const radiusKm = parseFloat(searchParams.get('radiusKm') ?? '');

    if (isNaN(lat) || isNaN(lon) || isNaN(radiusKm) || radiusKm <= 0) {
        return NextResponse.json({ error: 'lat, lon, and radiusKm are required' }, { status: 400 });
    }

    const radiusMeters = Math.min(radiusKm * 1000, 50_000);

    const url = new URL(HERE_TRAFFIC_URL);
    url.searchParams.set('locationReferencing', 'shape');
    url.searchParams.set('in', `circle:${lat},${lon};r=${Math.round(radiusMeters)}`);
    url.searchParams.set('apiKey', process.env.HERE_API_KEY);

    try {
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('[Traffic] HERE API error:', res.status, text);
            return NextResponse.json({ error: `HERE API error ${res.status}` }, { status: 502 });
        }

        const data = await res.json();
        const results: HereFlowResult[] = data?.results ?? [];

        if (results.length === 0) {
            return NextResponse.json({
                segmentCount: 0,
                avgSpeedKmh: null,
                avgFreeFlowKmh: null,
                avgJamFactor: null,
                peakCongestionPct: null,
                segments: [],
            } satisfies TrafficMetrics);
        }

        // Filter to high-confidence segments only
        const valid = results.filter((r) => r.currentFlow?.confidence >= 0.5);

        const segments: TrafficSegment[] = valid.map((r) => {
            const { speed, freeFlow, jamFactor } = r.currentFlow;
            const congestionPct = freeFlow > 0 ? Math.round((1 - speed / freeFlow) * 100) : 0;
            return { speedKmh: speed, freeFlowKmh: freeFlow, jamFactor, congestionPct };
        });

        const avg = (arr: number[]) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

        const avgSpeedKmh = avg(segments.map((s) => s.speedKmh));
        const avgFreeFlowKmh = avg(segments.map((s) => s.freeFlowKmh));
        const avgJamFactor = avg(segments.map((s) => s.jamFactor));
        const peakCongestionPct =
            avgSpeedKmh !== null && avgFreeFlowKmh !== null && avgFreeFlowKmh > 0
                ? Math.round((1 - avgSpeedKmh / avgFreeFlowKmh) * 100)
                : null;

        return NextResponse.json({
            segmentCount: segments.length,
            avgSpeedKmh: avgSpeedKmh !== null ? Math.round(avgSpeedKmh) : null,
            avgFreeFlowKmh: avgFreeFlowKmh !== null ? Math.round(avgFreeFlowKmh) : null,
            avgJamFactor: avgJamFactor !== null ? parseFloat(avgJamFactor.toFixed(1)) : null,
            peakCongestionPct,
            segments: segments.slice(0, 500), // cap payload size
        } satisfies TrafficMetrics);
    } catch (err: any) {
        console.error('[Traffic]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
