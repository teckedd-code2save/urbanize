import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/db';
import { sql } from 'kysely';
import { processAndInsertGeometry, elementToWkt } from '../src/lib/geometry';

test('elementToWkt generates valid wkt for various geometries', async (t) => {
    // Node
    const node = { type: 'node', id: 1, lat: 51.5, lon: -0.1 };
    assert.strictEqual(elementToWkt(node), 'POINT(-0.1 51.5)');

    // LineString < 2 nodes (corrupt)
    const badWay = { type: 'way', id: 2, geometry: [{ lat: 51.5, lon: -0.1 }] };
    assert.strictEqual(elementToWkt(badWay), 'POINT(-0.1 51.5)');

    // Closed Polygon
    const goodWay = {
        type: 'way',
        id: 3,
        geometry: [
            { lat: 0, lon: 0 }, { lat: 0, lon: 2 }, { lat: 2, lon: 0 }, { lat: 0, lon: 0 }
        ]
    };
    assert.strictEqual(elementToWkt(goodWay), 'POLYGON((0 0, 2 0, 0 2, 0 0))');

    // Relation (MultiPolygon approximation)
    const rel = {
        type: 'relation', id: 4, members: [
            {
                type: 'way', role: 'outer', geometry: [
                    { lat: 0, lon: 0 }, { lat: 0, lon: 2 }, { lat: 2, lon: 0 }, { lat: 0, lon: 0 }
                ]
            }
        ]
    };
    assert.strictEqual(elementToWkt(rel), 'MULTIPOLYGON(((0 0, 2 0, 0 2, 0 0)))');

    // No valid output
    const emptyRow = { type: 'way', id: 5, geometry: [] };
    assert.strictEqual(elementToWkt(emptyRow), null);
});

test('Geometry autocorrection and projection', async (t) => {
    // 1. Clear text data
    await db.deleteFrom('osmData').execute();

    // 2. Insert test data (a self-intersecting bow-tie polygon in EPSG:4326)
    // ST_GeomFromText('POLYGON((0 0, 0 2, 2 0, 2 2, 0 0))', 4326)
    const element = {
        id: 101,
        type: 'way',
        tags: { building: 'yes' },
        lat: undefined,
        lon: undefined,
        nodes: [1, 2, 3, 4, 1] // dummy nodes since we'll mock the geojson building
    };

    // This is purely for unit test. The processAndInsertGeometry should take 
    // geojson or direct raw coords and apply ST_MakeValid and ST_Transform.
    // For simplicity, we'll pass a WKT or GeoJSON to the function.
    const wkt = 'POLYGON((0 0, 0 2, 2 0, 2 2, 0 0))';

    await processAndInsertGeometry([{
        osmId: 101,
        osmType: 'way',
        tags: { building: 'yes' },
        wkt: wkt
    }]);

    const result = await db.selectFrom('osmData')
        .select(['osmId', 'osmType', sql<string>`ST_AsText(geom)`.as('geomText'), sql<number>`ST_SRID(geom)`.as('srid'), sql<boolean>`ST_IsValid(geom)`.as('isValid')])
        .where('osmId', '=', 101)
        .executeTakeFirst();

    assert.ok(result, 'Row should be inserted');
    assert.strictEqual(result.srid, 5070, 'SRID should be converted to Equal-Area (Albers EPSG:5070)');
    assert.strictEqual(result.isValid, true, 'Geometry should be valid after processing');

    // Check it's not the original bow-tie anymore or at least ST_IsValid passed.

    // Cleanup
    await db.deleteFrom('osmData').execute();
});
