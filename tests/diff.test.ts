/**
 * Tests for Story 4.2: Server-Side Geometric Diff Logic
 *
 * Unit tests for delta calculation logic extracted from /api/analyze/diff.
 * Uses Node.js built-in test runner (tsx --test).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Pure delta calculation logic (mirrored from the route) ──────────────────

interface Metrics {
    buildingDensityPct: number | null;
    roadDensity: number | null;
}

function computeDelta(metricsA: Metrics, metricsB: Metrics) {
    const buildingA = metricsA.buildingDensityPct ?? 0;
    const buildingB = metricsB.buildingDensityPct ?? 0;
    const roadA = metricsA.roadDensity ?? 0;
    const roadB = metricsB.roadDensity ?? 0;
    return {
        buildingDensityPct: buildingB - buildingA,
        roadDensity: roadB - roadA,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Delta computation — building density', () => {
    it('returns positive delta when B > A', () => {
        const result = computeDelta(
            { buildingDensityPct: 10, roadDensity: 0 },
            { buildingDensityPct: 25, roadDensity: 0 }
        );
        assert.equal(result.buildingDensityPct, 15);
    });

    it('returns negative delta when B < A', () => {
        const result = computeDelta(
            { buildingDensityPct: 30, roadDensity: 0 },
            { buildingDensityPct: 18, roadDensity: 0 }
        );
        assert.equal(result.buildingDensityPct, -12);
    });

    it('returns zero when A equals B', () => {
        const result = computeDelta(
            { buildingDensityPct: 20, roadDensity: 0 },
            { buildingDensityPct: 20, roadDensity: 0 }
        );
        assert.equal(result.buildingDensityPct, 0);
    });

    it('treats null as 0', () => {
        const result = computeDelta(
            { buildingDensityPct: null, roadDensity: null },
            { buildingDensityPct: 15, roadDensity: null }
        );
        assert.equal(result.buildingDensityPct, 15);
    });
});

describe('Delta computation — road density', () => {
    it('returns positive delta when B > A', () => {
        const result = computeDelta(
            { buildingDensityPct: 0, roadDensity: 5.0 },
            { buildingDensityPct: 0, roadDensity: 8.5 }
        );
        assert.ok(Math.abs(result.roadDensity - 3.5) < 1e-10);
    });

    it('returns negative delta when B < A', () => {
        const result = computeDelta(
            { buildingDensityPct: 0, roadDensity: 12.0 },
            { buildingDensityPct: 0, roadDensity: 9.0 }
        );
        assert.equal(result.roadDensity, -3.0);
    });

    it('treats null road density as 0', () => {
        const result = computeDelta(
            { buildingDensityPct: 0, roadDensity: null },
            { buildingDensityPct: 0, roadDensity: 7.2 }
        );
        assert.ok(Math.abs(result.roadDensity - 7.2) < 1e-10);
    });
});

describe('Delta sign semantics', () => {
    it('delta is B minus A, not A minus B', () => {
        const a = { buildingDensityPct: 5, roadDensity: 3 };
        const b = { buildingDensityPct: 20, roadDensity: 10 };
        const delta = computeDelta(a, b);
        assert.equal(delta.buildingDensityPct, 15);  // B - A = 20 - 5
        assert.equal(delta.roadDensity, 7);            // B - A = 10 - 3
    });

    it('both deltas can be computed in a single call', () => {
        const result = computeDelta(
            { buildingDensityPct: 12.5, roadDensity: 6.0 },
            { buildingDensityPct: 18.0, roadDensity: 4.5 }
        );
        assert.ok(Math.abs(result.buildingDensityPct - 5.5) < 1e-10);
        assert.ok(Math.abs(result.roadDensity - (-1.5)) < 1e-10);
    });
});
