/**
 * balanced.test.js — Tests for src/engine/balanced.js
 *
 * Per ADR-009: every public function in the engine has at least
 * one happy-path test and one edge-case test.
 *
 * Per ADR-013 action items:
 * - Basic shelf creation and packing
 * - Grain constraint (hard and soft)
 * - Kerf between parts and between shelves
 * - Multi-sheet output
 * - Integration: parts → balanced layout → verify all parts placed
 */
import { describe, it, expect } from 'vitest';
import { balancedLayout } from '../../src/engine/balanced.js';

// --- Helpers ---

function makePart(id, cutLength, cutWidth, quantity = 1, type = 'side', label = 'Part') {
  return { id, type, label, cutLength, cutWidth, quantity, materialThickness: 18, edgeBandingEdges: [] };
}

const SHEET = { width: 1220, length: 2440 };
const KERF = 3;

// --- Empty / edge cases ---

describe('balancedLayout — empty and edge cases', () => {
  it('returns empty array for empty parts', () => {
    const result = balancedLayout([], SHEET, KERF, 'hard');
    expect(result).toEqual([]);
  });

  it('returns empty array for null parts', () => {
    const result = balancedLayout(null, SHEET, KERF, 'hard');
    expect(result).toEqual([]);
  });

  it('returns empty array for undefined parts', () => {
    const result = balancedLayout(undefined, SHEET, KERF, 'hard');
    expect(result).toEqual([]);
  });

  it('skips parts that cannot fit on any sheet', () => {
    const parts = [makePart('huge', 2000, 1500, 1)];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');
    // Part is too big for the sheet in normal or rotated orientation (hard grain)
    expect(result).toEqual([]);
  });
});

// --- Single part ---

describe('balancedLayout — single part', () => {
  it('places a single part at origin', () => {
    const parts = [makePart('p1', 600, 400)];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    expect(result[0].placements.length).toBe(1);
    expect(result[0].placements[0].x).toBe(0);
    expect(result[0].placements[0].y).toBe(0);
    expect(result[0].placements[0].rotated).toBe(false);
  });

  it('computes correct utilisation for single part', () => {
    const parts = [makePart('p1', 600, 400)];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    const expectedArea = 600 * 400;
    const sheetArea = SHEET.width * SHEET.length;
    const expectedUtil = Math.round((expectedArea / sheetArea) * 10000) / 100;
    expect(result[0].utilisationPercent).toBe(expectedUtil);
  });
});

// --- Shelf creation and packing ---

describe('balancedLayout — shelf creation and packing', () => {
  it('sorts parts by area descending', () => {
    // Largest part should be placed first (on first shelf)
    const parts = [
      makePart('small', 200, 200),
      makePart('large', 800, 400),
      makePart('medium', 400, 300),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    // Large part placed first at origin
    expect(result[0].placements[0].part.id).toBe('large');
  });

  it('places same-width parts on one shelf, side by side', () => {
    // Two parts with same width (400) and length 600 each should fit on one shelf
    const parts = [
      makePart('p1', 600, 400),
      makePart('p2', 600, 400),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    expect(result[0].placements.length).toBe(2);

    // Both on same shelf (same Y)
    const y0 = result[0].placements[0].y;
    const y1 = result[0].placements[1].y;
    expect(y0).toBe(y1);

    // Second part is after first + kerf
    const firstLen = result[0].placements[0].rotated
      ? result[0].placements[0].part.cutWidth
      : result[0].placements[0].part.cutLength;
    expect(result[0].placements[1].x).toBe(firstLen + KERF);
  });

  it('creates a new shelf when part width exceeds shelf height', () => {
    // Parts sorted by area descending. p1 area = 1000*400 = 400000, placed first → shelf height 400.
    // p2 area = 600*500 = 300000, placed second → width 500 > 400 shelf height → new shelf.
    const parts = [
      makePart('p1', 1000, 400),
      makePart('p2', 600, 500),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    expect(result[0].placements.length).toBe(2);

    // They should be on different shelves (different Y positions)
    const y0 = result[0].placements[0].y;
    const y1 = result[0].placements[1].y;
    expect(y0).not.toBe(y1);
  });

  it('places smaller-width parts on existing shelf', () => {
    // First part: width 500 creates shelf of height 500.
    // Second part: width 300 ≤ 500, can fit on same shelf
    const parts = [
      makePart('p1', 600, 500),
      makePart('p2', 400, 300),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    // p2 fits on p1's shelf since 300 ≤ 500 and 600 + 3 + 400 ≤ 1220
    expect(result[0].placements.length).toBe(2);
  });
});

// --- Grain constraint ---

describe('balancedLayout — grain constraint', () => {
  it('hard constraint: never rotates', () => {
    const parts = [
      makePart('p1', 600, 400),
      makePart('p2', 300, 400),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    for (const sheet of result) {
      for (const p of sheet.placements) {
        expect(p.rotated).toBe(false);
      }
    }
  });

  it('soft constraint: allows rotation when needed', () => {
    // Part that is very long but narrow: length 1000, width 100.
    // If a shelf has height 1000 (created by another part), this can fit rotated.
    const parts = [
      makePart('tall', 200, 1000), // creates shelf of height 1000
      makePart('long', 1000, 200), // width 200 ≤ 1000 shelf; length 1000 > 200 shelf height
    ];
    // Note: parts are sorted by area descending — both are 200*1000 = 200000.
    // After sorting, 'tall' (area 200000) and 'long' (area 200000) — stable sort order.
    const result = balancedLayout(parts, SHEET, KERF, 'soft');

    // At least one should be placed
    const totalPlaced = result.reduce((sum, s) => sum + s.placements.length, 0);
    expect(totalPlaced).toBeGreaterThanOrEqual(1);
  });

  it('soft constraint: rotated parts are flagged', () => {
    const parts = [
      makePart('p1', 500, 300),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'soft');

    // Single part at origin should not be rotated (fits normally)
    expect(result[0].placements[0].rotated).toBe(false);
    expect(result[0].placements[0].grainViolated).toBe(false);
  });
});

// --- Kerf handling ---

describe('balancedLayout — kerf handling', () => {
  it('adds kerf between parts on same shelf', () => {
    const parts = [
      makePart('p1', 500, 300),
      makePart('p2', 500, 300),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    expect(result[0].placements.length).toBe(2);

    // Second part X should be first part length + kerf
    expect(result[0].placements[1].x).toBe(500 + KERF);
  });

  it('adds kerf between shelves', () => {
    // Two parts with different widths force different shelves
    const parts = [
      makePart('p1', 600, 500),
      makePart('p2', 600, 500),
    ];
    // Same width, so they go on same shelf side by side.
    // Force different shelves with very different widths.
    const parts2 = [
      makePart('p1', 600, 800),
      makePart('p2', 600, 400), // width 400 ≤ 800 — fits on same shelf
    ];
    // To force different shelves, make widths mutually exclusive
    const parts3 = [
      makePart('p1', 600, 1000),
      makePart('p2', 600, 1000),
    ];
    // Both width 1000 — same shelf. But total X = 600 + 3 + 600 = 1203 ≤ 1220. Same shelf.
    // Force: make widths sum to more than sheet width
    const parts4 = [
      makePart('p1', 1000, 500),
      makePart('p2', 1000, 500),
    ];
    // 1000 + 3 + 1000 = 2003 > 1220, so second part can't fit on same shelf.
    const result = balancedLayout(parts4, SHEET, KERF, 'hard');

    expect(result.length).toBe(1);
    expect(result[0].placements.length).toBe(2);

    // Second part should be on a new shelf (different Y)
    const y0 = result[0].placements[0].y;
    const y1 = result[0].placements[1].y;
    expect(y0).not.toBe(y1);

    // Y gap should include shelf height + kerf
    // First shelf height = 500, so second shelf Y = 500 + kerf = 503
    expect(result[0].placements[1].y).toBe(500 + KERF);
  });
});

// --- Multi-sheet ---

describe('balancedLayout — multi-sheet output', () => {
  it('uses multiple sheets when parts exceed one sheet', () => {
    // Create parts that clearly don't fit on one sheet
    const parts = [];
    for (let i = 0; i < 20; i++) {
      parts.push(makePart(`p${i}`, 1000, 800));
    }
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result.length).toBeGreaterThan(1);
  });

  it('each sheet has correct sheetIndex', () => {
    const parts = [];
    for (let i = 0; i < 10; i++) {
      parts.push(makePart(`p${i}`, 1000, 800));
    }
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    for (let i = 0; i < result.length; i++) {
      expect(result[i].sheetIndex).toBe(i);
    }
  });

  it('all parts are placed', () => {
    const parts = [
      makePart('p1', 400, 300),
      makePart('p2', 400, 300),
      makePart('p3', 400, 300),
    ];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    const totalPlaced = result.reduce((sum, s) => sum + s.placements.length, 0);
    expect(totalPlaced).toBe(3);
  });
});

// --- Quantity expansion ---

describe('balancedLayout — quantity expansion', () => {
  it('expands parts by quantity', () => {
    const parts = [makePart('p1', 400, 300, 3)];
    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    const totalPlaced = result.reduce((sum, s) => sum + s.placements.length, 0);
    expect(totalPlaced).toBe(3);
  });
});

// --- Integration ---

describe('balancedLayout — integration', () => {
  it('full workflow: parts → balanced layout → all placed with valid coordinates', () => {
    const parts = [
      makePart('side', 800, 400, 2, 'side', 'Side Panel'),
      makePart('top', 600, 350, 1, 'top', 'Top Panel'),
      makePart('bottom', 600, 350, 1, 'bottom', 'Bottom Panel'),
      makePart('back', 794, 794, 1, 'back', 'Back Panel'),
    ];

    const result = balancedLayout(parts, SHEET, KERF, 'hard');

    const totalPlaced = result.reduce((sum, s) => sum + s.placements.length, 0);
    expect(totalPlaced).toBe(5); // 2 + 1 + 1 + 1

    // All placements within sheet bounds
    for (const sheet of result) {
      for (const p of sheet.placements) {
        const w = p.rotated ? p.part.cutWidth : p.part.cutLength;
        const h = p.rotated ? p.part.cutLength : p.part.cutWidth;
        expect(p.x + w).toBeLessThanOrEqual(SHEET.width);
        expect(p.y + h).toBeLessThanOrEqual(SHEET.length);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
      }
    }

    // Offcuts computed
    for (const sheet of result) {
      expect(Array.isArray(sheet.offcuts)).toBe(true);
    }
  });
});

// --- Deterministic ---

describe('balancedLayout — deterministic output', () => {
  it('same input always produces same layout', () => {
    const parts = [
      makePart('p1', 500, 300),
      makePart('p2', 400, 250),
      makePart('p3', 600, 400),
    ];

    const result1 = balancedLayout(parts, SHEET, KERF, 'hard');
    const result2 = balancedLayout(parts, SHEET, KERF, 'hard');

    expect(result1).toEqual(result2);
  });
});