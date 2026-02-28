'use server'

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { dataFetchQueue } from '@/lib/queue';
import { addJobSchema } from '@/lib/job-schema';

export async function addTestJob(formData: FormData) {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: 'Unauthorized' };
    }

    const result = addJobSchema.safeParse({
        message: formData.get('message'),
    });

    if (!result.success) {
        return { success: false, error: 'Invalid input' };
    }

    try {
        const job = await dataFetchQueue.add('test-job', result.data);
        return { success: true, jobId: job.id };
    } catch (error) {
        console.error('Failed to add job to queue', error);
        return { success: false, error: 'Failed to add job' };
    }
}
