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
    } finally {
        assert.strictEqual(dataFetchQueue.defaultJobOptions?.attempts, 3);
        assert.deepStrictEqual(dataFetchQueue.defaultJobOptions?.backoff, { type: 'exponential', delay: 2000 });

        await worker.close();

        // Restore fetch
        global.fetch = originalFetch;
    }
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

const crypto = require('crypto');

test('Worker checks Redis cache before fetching and returns cached data', async (t) => {
    const { worker } = await import('../worker/index');

    const mockQuery = '[out:json];node(1.0, 1.0, 1.1, 1.1);out;';
    const cacheKey = `osm_cache:${crypto.createHash('sha256').update(mockQuery).digest('hex')}`;

    // Manually push data to Redis
    const cachedData = {
        version: 0.6,
        elements: [{ type: 'node', id: 9999, lat: 1.05, lon: 1.05 }]
    };
    await redis.set(cacheKey, JSON.stringify(cachedData));

    let fetchCallCount = 0;
    global.fetch = async (...args: any[]) => {
        fetchCallCount++;
        return new Response('Should not be called', { status: 400 });
    };

    const mockJob = {
        id: 'test-job-cache',
        data: { query: mockQuery }
    } as unknown as Job;

    // @ts-ignore
    try {
        const result = await worker.processFn(mockJob);

        assert.strictEqual(fetchCallCount, 0, 'Fetch should not be called when data is in cache');
        assert.strictEqual(result.dataStats?.elements, 1);
        assert.strictEqual(result.success, true);
    } finally {
        // Cleanup
        await redis.del(cacheKey);
        global.fetch = originalFetch;
        await worker.close();
    }
});

test('Worker writes to Redis cache after successful fetch', async (t) => {
    const { worker } = await import('../worker/index');

    const mockQuery = '[out:json];node(2.0, 2.0, 2.1, 2.1);out;';
    const cacheKey = `osm_cache:${crypto.createHash('sha256').update(mockQuery).digest('hex')}`;

    // Ensure cache is empty
    await redis.del(cacheKey);

    global.fetch = async (...args: any[]) => {
        return new Response(JSON.stringify({
            version: 0.6,
            elements: [{ type: 'node', id: 8888, lat: 2.05, lon: 2.05 }, { type: 'node', id: 7777, lat: 2.06, lon: 2.06 }]
        }), { status: 200 });
    };

    const mockJob = {
        id: 'test-job-cache-write',
        data: { query: mockQuery }
    } as unknown as Job;

    // @ts-ignore
    try {
        await worker.processFn(mockJob);

        const cachedString = await redis.get(cacheKey);
        assert.ok(cachedString, 'Data should be saved to Redis cache');
        const parsedCache = JSON.parse(cachedString);
        assert.strictEqual(parsedCache.elements.length, 2);
    } finally {
        // Cleanup
        await redis.del(cacheKey);
        global.fetch = originalFetch;
        await worker.close();
    }
});

test('Worker flags lowConfidence=true when feature density is below threshold', async (t) => {
    const { worker } = await import('../worker/index');

    // London roughly 11x11 km bbox (aprox 121 sq km) area:
    // 1 dec deg lat ~ 111km, 0.1 ~ 11.1km
    const mockQuery = '[out:json];node(51.4,-0.2,51.5,-0.1);out;';
    const cacheKey = `osm_cache:${crypto.createHash('sha256').update(mockQuery).digest('hex')}`;

    await redis.del(cacheKey);

    global.fetch = async (...args: any[]) => {
        return new Response(JSON.stringify({
            version: 0.6,
            // Only 5 elements in a 121 sq km area is very sparse
            elements: [
                { type: 'node', id: 1, lat: 51.45, lon: -0.15 },
                { type: 'node', id: 2, lat: 51.46, lon: -0.16 },
                { type: 'node', id: 3, lat: 51.47, lon: -0.17 },
                { type: 'node', id: 4, lat: 51.48, lon: -0.18 },
                { type: 'node', id: 5, lat: 51.49, lon: -0.19 }
            ]
        }), { status: 200 });
    };

    const mockJob = {
        id: 'test-job-confidence-low',
        data: { query: mockQuery }
    } as unknown as Job;

    // @ts-ignore
    try {
        const result = await worker.processFn(mockJob);

        assert.strictEqual(result.dataStats?.lowConfidence, true, 'Should flag sparce elements as low confidence');
    } finally {
        // Cleanup
        await redis.del(cacheKey);
        global.fetch = originalFetch;
        await worker.close();
    }
});

test('Worker flags lowConfidence=false when feature density is sufficient', async (t) => {
    const { worker } = await import('../worker/index');

    // Same London 121 sq km area
    const mockQuery = '[out:json];node(51.4,-0.2,51.5,-0.1);out;';
    const cacheKey = `osm_cache:${crypto.createHash('sha256').update(mockQuery).digest('hex')}`;

    await redis.del(cacheKey);

    global.fetch = async (...args: any[]) => {
        // Generate 1000 nodes (approx 8.2 per sq km, sufficient coverage)
        const densityElements = Array.from({ length: 1000 }).map((_, i) => ({
            type: 'node', id: i, lat: 51.45, lon: -0.15
        }));

        return new Response(JSON.stringify({
            version: 0.6,
            elements: densityElements
        }), { status: 200 });
    };

    const mockJob = {
        id: 'test-job-confidence-high',
        data: { query: mockQuery }
    } as unknown as Job;

    // @ts-ignore
    try {
        const result = await worker.processFn(mockJob);

        assert.strictEqual(result.dataStats?.lowConfidence, false, 'Should flag dense area as good confidence');
    } finally {
        // Cleanup
        await redis.del(cacheKey);
        global.fetch = originalFetch;
        await worker.close();
    }
});
