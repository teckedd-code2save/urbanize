import { Queue } from 'bullmq';
import { redis } from './redis';

export const DATA_FETCH_QUEUE_NAME = 'data-fetch-queue';

export const dataFetchQueue = new Queue(DATA_FETCH_QUEUE_NAME, {
    connection: redis,
});

export type TestJobData = {
    message: string;
};
