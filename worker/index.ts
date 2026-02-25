import { Worker, Job } from 'bullmq';
import { redis } from '../src/lib/redis';
import { DATA_FETCH_QUEUE_NAME, TestJobData } from '../src/lib/queue';

const worker = new Worker<TestJobData>(
    DATA_FETCH_QUEUE_NAME,
    async (job: Job<TestJobData>) => {
        console.log(`[Worker] Processing job ${job.id}:`, job.data);

        // Simulate long running task
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(`[Worker] Finished processing job ${job.id}`);
        return { success: true, processedAt: new Date().toISOString() };
    },
    {
        connection: redis,
        limiter: {
            max: 5,   // max 5 jobs
            duration: 1000 // per second
        }
    }
);

worker.on('ready', () => {
    console.log('[Worker] Worker is running and connected to Redis');
});

worker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} completed. Result:`, job.returnvalue);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
    console.log(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
});
