/**
 * offcuts.test.js — Unit tests for src/engine/offcuts.js
 *
 * Per ADR-009: every public function in the engine has at least
 * one happy-path test and one edge-case test.
 *
 * Per ADR-019: computeOffcuts() was extracted from batch.js,
 * balanced.js, and optimised.js into a shared module.
 */
import { describe, it, expect } from 'vitest';
import { computeOffcuts } from '../../src/engine/offcuts.js';

// ============================================================
// computeOffcuts — Empty placements
// ============================================================

describe('computeOffcuts — Empty placements', () => {
  it('returns single offcut equal to sheet when no placements', () => {
    const sheet = { width: 1220, length: 2440 };
    const result = computeOffcuts(sheet, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      x: 0,
      y: 0,
      width: 1220,
      height: 2440,
    });
  });
});

// ============================================================
// computeOffcuts — Single placement
// ============================================================

describe('computeOffcuts — Single placement', () => {
  it('returns correct remaining offcuts for one part at origin', () => {
    const sheet = { width: 1000, length: 2000 };
    const placements = [
      {
        x: 0,
        y: 0,
        rotated: false,
        part: { cutLength: 400, cutWidth: 300 },
      },
    ];

    const result = computeOffcuts(sheet, placements);

    // The part occupies x:[0,400], y:[0,300]
    // Expected offcuts:
    //   Band y=0..300: gap right of part  →  { x:400, y:0, w:600, h:300 }
    //   Band y=300..2000: full width     →  { x:0, y:300, w:1000, h:1700 }
    expect(result).toHaveLength(2);

    const rightOfPart = result.find(o => o.x === 400 && o.y === 0);
    expect(rightOfPart).toBeTruthy();
    expect(rightOfPart.width).toBe(600);
    expect(rightOfPart.height).toBe(300);

    const belowPart = result.find(o => o.x === 0 && o.y === 300);
    expect(belowPart).toBeTruthy();
    expect(belowPart.width).toBe(1000);
    expect(belowPart.height).toBe(1700);
  });

  it('handles part that fills the entire sheet', () => {
    const sheet = { width: 1000, length: 2000 };
    const placements = [
      {
        x: 0,
        y: 0,
        rotated: false,
        part: { cutLength: 1000, cutWidth: 2000 },
      },
    ];

    const result = computeOffcuts(sheet, placements);
    expect(result).toHaveLength(0);
  });

  it('handles rotated part', () => {
    const sheet = { width: 1000, length: 2000 };
    const placements = [
      {
        x: 0,
        y: 0,
        rotated: true,
        // rotated: width along X, length along Y
        part: { cutLength: 400, cutWidth: 300 },
      },
    ];

    const result = computeOffcuts(sheet, placements);

    // Rotated: occupies x:[0,300], y:[0,400]
    expect(result).toHaveLength(2);

    const rightOfPart = result.find(o => o.x === 300 && o.y === 0);
    expect(rightOfPart).toBeTruthy();
    expect(rightOfPart.width).toBe(700);
    expect(rightOfPart.height).toBe(400);

    const belowPart = result.find(o => o.x === 0 && o.y === 400);
    expect(belowPart).toBeTruthy();
    expect(belowPart.width).toBe(1000);
    expect(belowPart.height).toBe(1600);
  });
});

// ============================================================
// computeOffcuts — Adjacent placements merge gaps
// ============================================================

describe('computeOffcuts — Adjacent placements', () => {
  it('merges gaps when two parts sit side by side', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 0, y: 0, rotated: false, part: { cutLength: 300, cutWidth: 500 } },
      { x: 300, y: 0, rotated: false, part: { cutLength: 300, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Parts occupy x:[0,300] and x:[300,600], both y:[0,500]
    // These are adjacent (no gap between them)
    // Offcuts:
    //   Band y=0..500: gap x:600..1000  →  { x:600, y:0, w:400, h:500 }
    //   Band y=500..1000: full width   →  { x:0, y:500, w:1000, h:500 }
    expect(result).toHaveLength(2);

    const rightGap = result.find(o => o.x === 600 && o.y === 0);
    expect(rightGap).toBeTruthy();
    expect(rightGap.width).toBe(400);
    expect(rightGap.height).toBe(500);

    const bottomGap = result.find(o => o.x === 0 && o.y === 500);
    expect(bottomGap).toBeTruthy();
    expect(bottomGap.width).toBe(1000);
    expect(bottomGap.height).toBe(500);
  });

  it('emits offcut between non-adjacent parts on same row', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 0, y: 0, rotated: false, part: { cutLength: 200, cutWidth: 500 } },
      { x: 600, y: 0, rotated: false, part: { cutLength: 200, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Parts occupy x:[0,200] and x:[600,800], both y:[0,500]
    // Offcuts:
    //   Band y=0..500: gap x:200..600  →  { x:200, y:0, w:400, h:500 }
    //   Band y=0..500: gap x:800..1000 →  { x:800, y:0, w:200, h:500 }
    //   Band y=500..1000: full width   →  { x:0, y:500, w:1000, h:500 }
    expect(result).toHaveLength(3);

    const betweenGap = result.find(o => o.x === 200 && o.y === 0);
    expect(betweenGap).toBeTruthy();
    expect(betweenGap.width).toBe(400);

    const rightGap = result.find(o => o.x === 800 && o.y === 0);
    expect(rightGap).toBeTruthy();
    expect(rightGap.width).toBe(200);

    const bottomGap = result.find(o => o.x === 0 && o.y === 500);
    expect(bottomGap).toBeTruthy();
    expect(bottomGap.width).toBe(1000);
  });

  it('handles parts on different rows', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 0, y: 0, rotated: false, part: { cutLength: 500, cutWidth: 300 } },
      { x: 0, y: 500, rotated: false, part: { cutLength: 400, cutWidth: 300 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Part 1: x:[0,500], y:[0,300]
    // Part 2: x:[0,400], y:[500,800]
    // There is a gap row y:300..500 (full width offcut)
    // Offcuts:
    //   Band y=0..300: gap x:500..1000   →  { x:500, y:0, w:500, h:300 }
    //   Band y=300..500: full width      →  { x:0, y:300, w:1000, h:200 }
    //   Band y=500..800: gap x:400..1000 →  { x:400, y:500, w:600, h:300 }
    //   Band y=800..1000: full width     →  { x:0, y:800, w:1000, h:200 }
    expect(result).toHaveLength(4);
  });
});

// ============================================================
// computeOffcuts — Kerf gaps preserved as offcuts
// ============================================================

describe('computeOffcuts — Kerf gaps', () => {
  it('preserves kerf gap between placements as offcut', () => {
    const sheet = { width: 1000, length: 1000 };
    // Two parts with a 3mm kerf gap between them
    const placements = [
      { x: 0, y: 0, rotated: false, part: { cutLength: 200, cutWidth: 500 } },
      { x: 203, y: 0, rotated: false, part: { cutLength: 200, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Part 1 occupies x:[0,200], Part 2 occupies x:[203,403]
    // The 3mm kerf gap at x:[200,203] should appear as an offcut
    expect(result).toContainEqual({
      x: 200,
      y: 0,
      width: 3,
      height: 500,
    });
  });
});

// ============================================================
// computeOffcuts — Edge cases
// ============================================================

describe('computeOffcuts — Edge cases', () => {
  it('handles part touching right edge of sheet', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 500, y: 0, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Part occupies x:[500,1000], y:[0,500]
    // Offcuts:
    //   Band y=0..500: gap x:0..500     →  { x:0, y:0, w:500, h:500 }
    //   Band y=500..1000: full width    →  { x:0, y:500, w:1000, h:500 }
    expect(result).toHaveLength(2);
  });

  it('handles part touching bottom edge of sheet', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 0, y: 500, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);

    // Part occupies x:[0,500], y:[500,1000]
    // Offcuts:
    //   Band y=0..500: full width       →  { x:0, y:0, w:1000, h:500 }
    //   Band y=500..1000: gap x:500..1000 → { x:500, y:500, w:500, h:500 }
    expect(result).toHaveLength(2);

    const topGap = result.find(o => o.y === 0);
    expect(topGap).toBeTruthy();
    expect(topGap.width).toBe(1000);
    expect(topGap.height).toBe(500);
  });

  it('returns no offcuts when multiple parts completely fill sheet', () => {
    const sheet = { width: 1000, length: 1000 };
    const placements = [
      { x: 0, y: 0, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
      { x: 500, y: 0, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
      { x: 0, y: 500, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
      { x: 500, y: 500, rotated: false, part: { cutLength: 500, cutWidth: 500 } },
    ];

    const result = computeOffcuts(sheet, placements);
    expect(result).toHaveLength(0);
  });
});