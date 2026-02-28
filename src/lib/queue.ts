import { Queue } from 'bullmq';
import { redis } from './redis';
import { DATA_FETCH_QUEUE_NAME } from './job-schema';

const globalForQueue = global as unknown as { dataFetchQueue: Queue | undefined };

export const dataFetchQueue =
    globalForQueue.dataFetchQueue ||
    new Queue(DATA_FETCH_QUEUE_NAME, {
        connection: redis,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    });

if (process.env.NODE_ENV !== 'production') globalForQueue.dataFetchQueue = dataFetchQueue;
