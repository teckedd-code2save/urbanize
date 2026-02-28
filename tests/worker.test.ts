import test from 'node:test';
import assert from 'node:assert';
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '../src/lib/redis';
import { DATA_FETCH_QUEUE_NAME, OsmResponseSchema } from '../src/lib/job-schema';
import { dataFetchQueue } from '../src/lib/queue';

// We will mock fetch globally to test 429 backoff
const originalFetch = global.fetch;

test('Worker handles 429 Too Many Requests correctly via exponential backoff', async (t) => {
    let fetchCallCount = 0;

    // Mock fetch to return 429
    global.fetch = async (...args: any[]) => {
        fetchCallCount++;
        return new Response('Too Many Requests', { status: 429 });
    };

    const { worker } = await import('../worker/index');

    // Create a mock job
    const mockJob = {
        id: 'test-job-429',
        data: { query: '[out:json];node;' }
    } as unknown as Job;

    try {
        // @ts-ignore
        await worker.processFn(mockJob);
        assert.fail('Worker should have thrown an error for 429');
    } catch (error: any) {
        assert.strictEqual(error.message, 'Rate limit exceeded (429)');
        assert.strictEqual(fetchCallCount, 1);
        assert.ok(!(error instanceof UnrecoverableError), 'Should be a standard error for retry');
    }

    assert.strictEqual(dataFetchQueue.defaultJobOptions?.attempts, 3);
    assert.deepStrictEqual(dataFetchQueue.defaultJobOptions?.backoff, { type: 'exponential', delay: 2000 });

    await worker.close();

    // Restore fetch
    global.fetch = originalFetch;
});

test('Worker fails immediately (UnrecoverableError) for bad payload', async (t) => {
    const { worker } = await import('../worker/index');

    const invalidMockJob = {
        id: 'test-job-invalid',
        data: { query: 'invalid query without required JSON tag' }
    } as unknown as Job;

    try {
        // @ts-ignore
        await worker.processFn(invalidMockJob);
        assert.fail('Worker should have thrown an unrecoverable error for invalid payload');
    } catch (error: any) {
        assert.ok(error instanceof UnrecoverableError, 'Should be an UnrecoverableError');
        assert.ok(error.message.includes('Invalid job payload'));
    }

    await worker.close();
});

test('OsmResponseSchema securely parses OSM JSON', async (t) => {
    const validJson = {
        version: 0.6,
        elements: [
            { type: 'node', id: 1234, lat: 51.5, lon: -0.1, tags: { amenity: 'cafe' } }
        ]
    };

    assert.doesNotThrow(() => {
        OsmResponseSchema.parse(validJson);
    });

    const invalidJson = {
        elements: [
            { type: 'invalid_type', id: 'not_a_number' }
        ]
    };

    assert.throws(() => {
        OsmResponseSchema.parse(invalidJson);
    });
});
