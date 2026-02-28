import { z } from 'zod';

export const DATA_FETCH_QUEUE_NAME = 'data-fetch-queue';

export const addJobSchema = z.object({
    message: z.string().optional(),
    query: z.string().min(5).max(50000).refine(q => q.includes('[out:json]'), {
        message: 'Query must be a valid OSM JSON query and include [out:json]'
    }).optional()
});

export const OsmElementSchema = z.object({
    type: z.enum(['node', 'way', 'relation']),
    id: z.number(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    nodes: z.array(z.number()).optional(),
    tags: z.record(z.string(), z.string()).optional()
}).catchall(z.any());

export const OsmResponseSchema = z.object({
    version: z.number().optional(),
    generator: z.string().optional(),
    osm3s: z.any().optional(),
    elements: z.array(OsmElementSchema)
});

export type TestJobData = z.infer<typeof addJobSchema>;
