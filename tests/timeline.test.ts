/**
 * Tests for Story 4.1: Timeline UI & Time Period Selection
 *
 * Unit tests for timeline year range generation and Year A ≠ Year B validation.
 * These test pure logic extracted from the TimelineSelector, not the React component itself.
 * Uses Node.js built-in test runner (tsx --test).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Helpers (extracted from TimelineSelector) ────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_START = 2015;

function buildYearRange(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

type SelectionResult = { error: string | null; yearA: number | null; yearB: number | null };

function selectYear(existingYearA: number | null, clicked: number): SelectionResult {
    if (existingYearA === null) {
        return { error: null, yearA: clicked, yearB: null };
    }
    if (clicked === existingYearA) {
        return { error: 'Please select two different years.', yearA: existingYearA, yearB: null };
    }
    const a = Math.min(existingYearA, clicked);
    const b = Math.max(existingYearA, clicked);
    return { error: null, yearA: a, yearB: b };
}

const FULL_THRESHOLD = 50;
const PARTIAL_THRESHOLD = 10;

function classify(count: number): 'full' | 'partial' | 'none' {
    if (count >= FULL_THRESHOLD) return 'full';
    if (count >= PARTIAL_THRESHOLD) return 'partial';
    return 'none';
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Timeline year range', () => {
    it('should start at 2015', () => {
        const range = buildYearRange(YEAR_START, CURRENT_YEAR);
        assert.equal(range[0], 2015);
    });

    it('should end at the current year', () => {
        const range = buildYearRange(YEAR_START, CURRENT_YEAR);
        assert.equal(range[range.length - 1], CURRENT_YEAR);
    });

    it('should produce a contiguous range with no gaps', () => {
        const range = buildYearRange(YEAR_START, CURRENT_YEAR);
        for (let i = 1; i < range.length; i++) {
            assert.equal(range[i] - range[i - 1], 1);
        }
    });

    it('should contain at least 9 years (2015 to 2023+)', () => {
        const range = buildYearRange(YEAR_START, CURRENT_YEAR);
        assert.ok(range.length >= 9, `Expected ≥9 years, got ${range.length}`);
    });
});

describe('Year A ≠ Year B validation', () => {
    it('should set yearA on first click', () => {
        const result = selectYear(null, 2018);
        assert.equal(result.yearA, 2018);
        assert.equal(result.yearB, null);
        assert.equal(result.error, null);
    });

    it('should set yearB and order A < B on second click (forward)', () => {
        const result = selectYear(2018, 2023);
        assert.equal(result.yearA, 2018);
        assert.equal(result.yearB, 2023);
        assert.equal(result.error, null);
    });

    it('should set yearB and order A < B when clicking backwards', () => {
        const result = selectYear(2023, 2018);
        assert.equal(result.yearA, 2018);
        assert.equal(result.yearB, 2023);
        assert.equal(result.error, null);
    });

    it('should return an error when yearA equals yearB', () => {
        const result = selectYear(2020, 2020);
        assert.equal(result.error, 'Please select two different years.');
        assert.equal(result.yearB, null);
    });

    it('should retain yearA when a same-year error occurs', () => {
        const result = selectYear(2020, 2020);
        assert.equal(result.yearA, 2020);
    });
});

describe('Data availability threshold classification', () => {
    it('should classify ≥50 features as full', () => {
        assert.equal(classify(50), 'full');
        assert.equal(classify(200), 'full');
    });

    it('should classify 10–49 features as partial', () => {
        assert.equal(classify(10), 'partial');
        assert.equal(classify(49), 'partial');
    });

    it('should classify <10 features as none', () => {
        assert.equal(classify(0), 'none');
        assert.equal(classify(9), 'none');
    });
});
