import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dataFetchQueue } from '@/lib/queue';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    try {
        const job = await dataFetchQueue.getJob(jobId);
        
        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const state = await job.getState();
        const result = job.returnvalue;

        // If job is completed, fetch metrics from DB
        let metrics = null;
        if (state === 'completed') {
            metrics = await db.selectFrom('urbanParameters')
                .selectAll()
                .where('jobId', '=', jobId)
                .executeTakeFirst();
        }

        return NextResponse.json({
            jobId,
            state,
            result,
            metrics
        });
    } catch (error: any) {
        console.error(`[API] Error in /api/analyze/${jobId}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
