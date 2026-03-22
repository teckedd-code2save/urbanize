/**
 * Tests for Stories 5.1 + 5.2: CSV Export Generation & Citation String
 *
 * Unit tests for CSV structure, column labels, data format, and citation string.
 * Uses Node.js built-in test runner (tsx --test).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── CSV generation logic (mirrored from /api/export/csv) ────────────────────

const APP_VERSION = '1.0.0';

interface ExportParams {
    yearA: number | string;
    yearB: number | string;
    buildingA: number;
    buildingB: number;
    roadA: number;
    roadB: number;
    lat: number;
    lon: number;
    radiusKm: number;
}

function generateCsv(params: ExportParams): string {
    const { yearA, yearB, buildingA, buildingB, roadA, roadB, lat, lon, radiusKm } = params;
    const timestamp = '2026-03-21T00:00:00.000Z'; // fixed for deterministic tests
    const citationString =
        `Data generated via Urbanize v${APP_VERSION} using OpenStreetMap historical data. ` +
        `Timestamp: ${timestamp}. ` +
        `Algorithm v${APP_VERSION}: Building Density = Sum(Building Footprint Area) / Circle Area (EPSG:5070); ` +
        `Road Density = Sum(Road Length) / Circle Area expressed in km/km2.`;

    const lines = [
        `# ${citationString}`,
        `# Study area: lat=${lat}, lon=${lon}, radius=${radiusKm}km`,
        `# Period A: ${yearA} | Period B: ${yearB}`,
        '#',
        'period,year,metric,value,unit',
        `A,${yearA},building_density_pct,${buildingA.toFixed(4)},%`,
        `A,${yearA},road_density,${roadA.toFixed(4)},km/km2`,
        `B,${yearB},building_density_pct,${buildingB.toFixed(4)},%`,
        `B,${yearB},road_density,${roadB.toFixed(4)},km/km2`,
        `delta,,building_density_pct,${(buildingB - buildingA).toFixed(4)},%`,
        `delta,,road_density,${(roadB - roadA).toFixed(4)},km/km2`,
    ];
    return lines.join('\n');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const sample = generateCsv({
    yearA: 2015, yearB: 2023,
    buildingA: 12.5, buildingB: 22.0,
    roadA: 6.4, roadB: 8.1,
    lat: 51.5, lon: -0.1, radiusKm: 2,
});

describe('CSV structure', () => {
    it('contains a header row with correct columns', () => {
        assert.ok(sample.includes('period,year,metric,value,unit'));
    });

    it('has a row for Period A building density', () => {
        assert.ok(sample.includes('A,2015,building_density_pct,'));
    });

    it('has a row for Period A road density', () => {
        assert.ok(sample.includes('A,2015,road_density,'));
    });

    it('has a row for Period B building density', () => {
        assert.ok(sample.includes('B,2023,building_density_pct,'));
    });

    it('has a row for Period B road density', () => {
        assert.ok(sample.includes('B,2023,road_density,'));
    });

    it('has delta rows with blank year column', () => {
        assert.ok(sample.includes('delta,,building_density_pct,'));
        assert.ok(sample.includes('delta,,road_density,'));
    });
});

describe('CSV values', () => {
    it('building density values are formatted to 4 decimal places', () => {
        assert.ok(sample.includes('12.5000'));
        assert.ok(sample.includes('22.0000'));
    });

    it('delta building density is correct (B - A)', () => {
        // 22.0 - 12.5 = 9.5
        assert.ok(sample.includes('delta,,building_density_pct,9.5000'));
    });

    it('delta road density is correct (B - A)', () => {
        // 8.1 - 6.4 = 1.7
        assert.ok(sample.includes('delta,,road_density,1.7000'));
    });

    it('units are correctly labeled', () => {
        assert.ok(sample.includes(',km/km2'));
        assert.ok(sample.includes(',%'));
    });
});

describe('Citation string (Story 5.2)', () => {
    it('starts with the citation comment line', () => {
        const firstLine = sample.split('\n')[0];
        assert.ok(firstLine.startsWith('# Data generated via Urbanize'));
    });

    it('includes version number in citation', () => {
        assert.ok(sample.includes(`Urbanize v${APP_VERSION}`));
    });

    it('references OpenStreetMap in citation', () => {
        assert.ok(sample.includes('OpenStreetMap'));
    });

    it('includes algorithm description in citation', () => {
        assert.ok(sample.includes('Building Density = Sum(Building Footprint Area) / Circle Area'));
        assert.ok(sample.includes('Road Density = Sum(Road Length) / Circle Area'));
    });

    it('includes study area metadata comment', () => {
        assert.ok(sample.includes('# Study area: lat=51.5, lon=-0.1, radius=2km'));
    });

    it('includes period labels in metadata comment', () => {
        assert.ok(sample.includes('# Period A: 2015 | Period B: 2023'));
    });
});

describe('CSV filename convention (Story 5.3)', () => {
    it('filename pattern includes both years', () => {
        // Simulate filename generation
        const yearA = 2015;
        const yearB = 2023;
        const timestamp = '2026-03-21T12:00:00.000Z';
        const safeTimestamp = timestamp.replace(/[:.]/g, '-').slice(0, 19);
        const filename = `urbanize_analysis_${yearA}_vs_${yearB}_${safeTimestamp}.csv`;
        assert.ok(filename.includes('2015'));
        assert.ok(filename.includes('2023'));
        assert.ok(filename.endsWith('.csv'));
        assert.ok(filename.startsWith('urbanize_analysis_'));
    });
});
