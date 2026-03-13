import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/db';
import { sql } from 'kysely';
import { calculateBuildingDensity } from '../src/lib/density';

test('calculateBuildingDensity accurately calculates density for a given area', async (t) => {
    // Setup initial data
    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();

    // Insert a building polygon using EPSG:5070 directly for precision:
    // We use ST_Transform from a known 4326 bbox.
    // A 0.01° × 0.01° polygon near equator (~1.11km × 1.11km ≈ 1.23 km²)
    await db.insertInto('osmData')
        .values({
            osmId: 999,
            osmType: 'way',
            tags: { building: 'yes' },
            geom: sql`ST_Transform(ST_MakeValid(ST_GeomFromText('POLYGON((0 0, 0 0.01, 0.01 0.01, 0.01 0, 0 0))', 4326)), 5070)`
        })
        .execute();

    // Center: 0.005, 0.005 — radius 2km covers the whole ~1.11x1.11km building.
    // Center of the building square (0.005°N, 0.005°E)
    const lat = 0.005;
    const lon = 0.005;
    const radiusKm = 2;

    const result = await calculateBuildingDensity({ jobId: 'test-job-1', lat, lon, radiusKm });

    assert.ok(result, 'Result should be defined');
    assert.strictEqual(typeof result.buildingDensityPct, 'number', 'buildingDensityPct should be a number');
    assert.ok(result.buildingDensityPct > 0 && result.buildingDensityPct <= 100, 'Density must be in [0, 100]');

    // M1 Fix: Assert within a meaningful tolerance.
    // Building area ≈ 1.23 km² (1,230,000 m²); circle area (r=2000m) ≈ π × 2000² ≈ 12,566,370 m²
    // ⟹ expected density ≈ 9.8%. Accept ±4% for projection distortion near equator.
    const expectedPct = 9.8;
    const tolerancePct = 4;
    assert.ok(
        Math.abs(result.buildingDensityPct - expectedPct) <= tolerancePct,
        `Expected density ~${expectedPct}% ± ${tolerancePct}%, got ${result.buildingDensityPct.toFixed(2)}%`
    );

    // Verify row was saved to DB
    const saved = await db.selectFrom('urbanParameters').selectAll().where('jobId', '=', 'test-job-1').executeTakeFirst();
    assert.ok(saved, 'Row should be saved to urban_parameters');
    assert.strictEqual(saved.buildingDensityPct, result.buildingDensityPct, 'Saved density matches returned value');

    // M1 extra: re-running same jobId should upsert (not throw or duplicate)
    const result2 = await calculateBuildingDensity({ jobId: 'test-job-1', lat, lon, radiusKm });
    assert.ok(result2.buildingDensityPct > 0, 'Upsert should succeed and return density');
    const rows = await db.selectFrom('urbanParameters').selectAll().where('jobId', '=', 'test-job-1').execute();
    assert.strictEqual(rows.length, 1, 'Duplicate jobId must upsert, not insert duplicate row');

    // Cleanup
    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();
});

test('calculateBuildingDensity returns 0 when no buildings in area', async (t) => {
    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();

    // Insert a non-building feature
    await db.insertInto('osmData')
        .values({
            osmId: 888,
            osmType: 'way',
            tags: { highway: 'residential' },
            geom: sql`ST_Transform(ST_MakeValid(ST_GeomFromText('LINESTRING(0 0, 0.01 0.01)', 4326)), 5070)`
        })
        .execute();

    const result = await calculateBuildingDensity({ jobId: 'test-job-empty', lat: 0.005, lon: 0.005, radiusKm: 2 });

    assert.strictEqual(result.buildingDensityPct, 0, 'Density should be 0 when no buildings present');

    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();
});

test('calculateBuildingDensity rejects invalid inputs (Zod)', async (t) => {
    await assert.rejects(
        () => calculateBuildingDensity({ jobId: '', lat: 0, lon: 0, radiusKm: 0 }),
        { name: 'ZodError' },
        'Should throw ZodError for radiusKm=0'
    );

    await assert.rejects(
        () => calculateBuildingDensity({ jobId: 'x', lat: 0, lon: 0, radiusKm: -1 }),
        { name: 'ZodError' },
        'Should throw ZodError for negative radiusKm'
    );
});

test('calculateRoadDensity calculates density for a road intersecting the area', async (t) => {
    const { calculateRoadDensity } = await import('../src/lib/density');
    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();

    // Insert a road LINESTRING (2km long horizontally at equator: radius 1km circle will intersect part of it)
    await db.insertInto('osmData')
        .values({
            osmId: 777,
            osmType: 'way',
            tags: { highway: 'primary' },
            geom: sql`ST_Transform(ST_MakeValid(ST_GeomFromText('LINESTRING(0 0, 0.02 0)', 4326)), 5070)`
        })
        .execute();

    // Center at 0,0, radius 1km (1000m)
    const result = await calculateRoadDensity({ jobId: 'test-job-road', lat: 0, lon: 0, radiusKm: 1 });

    assert.ok(result);
    // Road density is Total m / Area m² * 1,000,000
    // Area of 1km radius circle = PI * R^2 = ~3.14 * 10^6 m²
    // Line length = 2 degrees ~ 222km, but it starts at 0,0 so only the part going east intersects.
    // Circle radius is 1km. The line goes straight east from the center, so 1km intersects.
    // Length intersecting = 1000m.
    // Density = 1000 / (PI * 1,000,000) * 1,000 = 1000 / (PI * 1000) = 1 / PI ~ 0.3183 km/km²
    assert.strictEqual(typeof result.roadDensity, 'number');
    assert.ok(result.roadDensity > 0.3 && result.roadDensity < 0.33, `Expected ~0.318, got ${result.roadDensity}`);

    // Verify DB save
    const saved = await db.selectFrom('urbanParameters').selectAll().where('jobId', '=', 'test-job-road').executeTakeFirst();
    assert.ok(saved);
    assert.strictEqual(saved.roadDensity, result.roadDensity);

    // Upsert test
    const result2 = await calculateRoadDensity({ jobId: 'test-job-road', lat: 0, lon: 0, radiusKm: 1 });
    const rows = await db.selectFrom('urbanParameters').selectAll().where('jobId', '=', 'test-job-road').execute();
    assert.strictEqual(rows.length, 1);

    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();
});

test('calculateRoadDensity returns 0 when no roads in area', async (t) => {
    const { calculateRoadDensity } = await import('../src/lib/density');
    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();

    // Insert a non-road feature (e.g. building)
    await db.insertInto('osmData')
        .values({
            osmId: 666,
            osmType: 'way',
            tags: { building: 'yes' },
            geom: sql`ST_Transform(ST_MakeValid(ST_GeomFromText('POLYGON((0 0, 0 0.01, 0.01 0.01, 0.01 0, 0 0))', 4326)), 5070)`
        })
        .execute();

    const result = await calculateRoadDensity({ jobId: 'test-job-road-empty', lat: 0.005, lon: 0.005, radiusKm: 1 });
    assert.strictEqual(result.roadDensity, 0);

    await db.deleteFrom('osmData').execute();
    await db.deleteFrom('urbanParameters').execute();
});

test('calculateRoadDensity rejects invalid inputs (Zod)', async (t) => {
    const { calculateRoadDensity } = await import('../src/lib/density');
    await assert.rejects(
        () => calculateRoadDensity({ jobId: '', lat: 0, lon: 0, radiusKm: 0 }),
        { name: 'ZodError' },
        'Should throw ZodError for radiusKm=0'
    );
});

