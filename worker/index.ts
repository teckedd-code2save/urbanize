import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '@/lib/redis';
import { DATA_FETCH_QUEUE_NAME, TestJobData, OsmResponseSchema, addJobSchema } from '@/lib/job-schema';

type JobReturnData = {
    success: boolean;
    processedAt: string;
    dataStats?: { elements: number };
};

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'UrbanizeApp/1.0 (contact@urbanize.invalid)';

export const worker = new Worker<TestJobData, JobReturnData, string>(
    DATA_FETCH_QUEUE_NAME,
    async (job: Job<TestJobData>) => {
        try {
            console.log(`[Worker] Processing job ${job.id}:`, job.data);

            const validationResult = addJobSchema.safeParse(job.data);
            if (!validationResult.success) {
                throw new UnrecoverableError(`Invalid job payload: ${validationResult.error.message}`);
            }

            const query = job.data.query || '[out:json][timeout:25];node(51.5,-0.1,51.51,-0.09);out;';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let response;
            try {
                response = await fetch(OVERPASS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': USER_AGENT
                    },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal
                });
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    throw new Error('Overpass API request timed out');
                }
                throw err;
            } finally {
                clearTimeout(timeoutId);
            }

            if (response.status === 429) {
                console.warn(`[Worker] Overpass API rate limit hit (429) for job ${job.id}`);
                throw new Error('Rate limit exceeded (429)');
            }

            if (!response.ok) {
                throw new UnrecoverableError(`Overpass API error: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();

            const parsedResult = OsmResponseSchema.safeParse(json);
            if (!parsedResult.success) {
                throw new UnrecoverableError(`Malformed Overpass API response: ${parsedResult.error.message}`);
            }

            const parsedData = parsedResult.data;

            console.log(`[Worker] Finished processing job ${job.id}. Elements found: ${parsedData.elements.length}`);
            return {
                success: true,
                processedAt: new Date().toISOString(),
                dataStats: { elements: parsedData.elements.length }
            };
        } catch (error: any) {
            console.error(`[Worker] Error processing job ${job.id}:`, error.message);
            throw error; // Re-throw to trigger BullMQ failure handling
        }
    },
    {
        connection: redis,
        limiter: {
            max: 1,       // max 1 job
            duration: 2000 // per 2 seconds
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
