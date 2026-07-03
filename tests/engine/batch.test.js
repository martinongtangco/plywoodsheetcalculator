/**
 * batch.test.js — Unit tests for src/engine/batch.js
 *
 * Per ADR-009: every public function in the engine has at least
 * one happy-path test and one edge-case test.
 *
 * Per ADR-012: batchLayout groups parts by width, places them in
 * strips along the sheet length, with no rotation allowed.
 */
import { describe, it, expect } from 'vitest';
import { batchLayout } from '../../src/engine/batch.js';

// ============================================================
// batchLayout — Empty and edge cases
// ============================================================

describe('batchLayout — Empty and edge cases', () => {
  it('returns empty array for empty parts list', () => {
    const result = batchLayout([], { width: 1220, length: 2440 }, 3);
    expect(result).toEqual([]);
  });

  it('returns empty array for null parts', () => {
    const result = batchLayout(null, { width: 1220, length: 2440 }, 3);
    expect(result).toEqual([]);
  });

  it('returns empty array for undefined parts', () => {
    const result = batchLayout(undefined, { width: 1220, length: 2440 }, 3);
    expect(result).toEqual([]);
  });
});

// ============================================================
// batchLayout — Single part
// ============================================================

describe('batchLayout — Single part', () => {
  it('places a single part on one sheet', () => {
    const parts = [
      {
        id: 'p1',
        type: 'side',
        label: 'Side',
        cutLength: 600,
        cutWidth: 400,
        quantity: 1,
        materialThickness: 18,
        edgeBandingEdges: [],
      },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(1);
    expect(result[0].placements[0].part.id).toBe('p1');
    expect(result[0].placements[0].x).toBe(0);
    expect(result[0].placements[0].y).toBe(0);
    expect(result[0].placements[0].rotated).toBe(false);
  });

  it('calculates utilisation for a single part', () => {
    const parts = [
      {
        id: 'p1',
        type: 'side',
        label: 'Side',
        cutLength: 1220,
        cutWidth: 1220,
        quantity: 1,
        materialThickness: 18,
        edgeBandingEdges: [],
      },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result[0].utilisationPercent).toBe(50);
  });
});

// ============================================================
// batchLayout — Same-width parts (strip packing)
// ============================================================

describe('batchLayout — Same-width parts in one strip', () => {
  it('places two same-width parts in the same strip with kerf gap', () => {
    const parts = [
      {
        id: 'p1',
        type: 'side',
        label: 'Side 1',
        cutLength: 600,
        cutWidth: 400,
        quantity: 1,
        materialThickness: 18,
        edgeBandingEdges: [],
      },
      {
        id: 'p2',
        type: 'top',
        label: 'Top',
        cutLength: 500,
        cutWidth: 400,
        quantity: 1,
        materialThickness: 18,
        edgeBandingEdges: [],
      },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(2);

    const placements = result[0].placements;
    for (const p of placements) {
      expect(p.x).toBe(0);
    }

    // Sorted by length descending: 600 first, then 500
    expect(placements[0].part.id).toBe('p1');
    expect(placements[0].y).toBe(0);
    expect(placements[1].part.id).toBe('p2');
    expect(placements[1].y).toBe(603);
  });

  it('places three same-width parts in one strip', () => {
    const parts = [
      { id: 'a', type: 'side', label: 'A', cutLength: 400, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'b', type: 'side', label: 'B', cutLength: 300, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'c', type: 'side', label: 'C', cutLength: 500, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(3);

    expect(result[0].placements[0].part.id).toBe('c');
    expect(result[0].placements[0].y).toBe(0);
    expect(result[0].placements[1].part.id).toBe('a');
    expect(result[0].placements[1].y).toBe(503);
    expect(result[0].placements[2].part.id).toBe('b');
    expect(result[0].placements[2].y).toBe(906);
  });
});

// ============================================================
// batchLayout — Different-width parts (multiple strips)
// ============================================================

describe('batchLayout — Different-width parts in multiple strips', () => {
  it('places different-width parts in separate strips on same sheet', () => {
    const parts = [
      { id: 'w1', type: 'side', label: 'Wide', cutLength: 600, cutWidth: 500, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'w2', type: 'top', label: 'Narrow', cutLength: 600, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);

    const placements = result[0].placements;
    expect(placements).toHaveLength(2);

    const wide = placements.find(p => p.part.id === 'w1');
    expect(wide.x).toBe(0);

    const narrow = placements.find(p => p.part.id === 'w2');
    expect(narrow.x).toBe(503);
  });

  it('opens a new sheet when different-width strips do not fit side by side', () => {
    // Two different widths that cannot share a sheet: 600 + 3 + 650 = 1253 > 1220
    const parts = [
      { id: 'w1', type: 'side', label: 'Wide 1', cutLength: 600, cutWidth: 600, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'w2', type: 'top', label: 'Wide 2', cutLength: 600, cutWidth: 650, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    // Different width groups → different strips. 600 + 3 + 650 = 1253 > 1220
    // So they go on separate sheets
    expect(result).toHaveLength(2);
    expect(result[0].placements).toHaveLength(1);
    expect(result[1].placements).toHaveLength(1);
  });

  it('same-width wide parts share one strip along sheet length', () => {
    // Same width = same group = same strip, stacked along length
    const parts = [
      { id: 'w1', type: 'side', label: 'Wide 1', cutLength: 600, cutWidth: 800, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'w2', type: 'top', label: 'Wide 2', cutLength: 600, cutWidth: 800, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    // Same 800mm width → same strip. 600 + 3 + 600 = 1203 <= 2440 fits in one sheet
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(2);
  });
});

// ============================================================
// batchLayout — Quantity expansion
// ============================================================

describe('batchLayout — Quantity expansion', () => {
  it('expands quantity into individual placements', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Side', cutLength: 600, cutWidth: 400, quantity: 3, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(3);
  });

  it('opens a new strip on same sheet when items exceed strip length', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Side', cutLength: 800, cutWidth: 400, quantity: 4, materialThickness: 18, edgeBandingEdges: [] },
    ];
    // 4 items of 800mm x 400mm, all same width group
    // Strip 1: 800 + 3 + 800 + 3 + 800 = 2406 <= 2440 (3 items fit)
    // 4th item: cannot extend strip 1, opens new strip on same sheet
    // New strip at x = 400 + 3 = 403, width 400 <= 1220 - 403 = 817 ✓
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(1);
    expect(result[0].placements).toHaveLength(4);
  });

  it('opens a new sheet when items cannot fit in any strip or new strip', () => {
    // Use a width that fills most of the sheet so a second strip cannot fit
    // Width 610: first strip uses 610, remaining = 1220 - 610 - 3 = 607 < 610 (no room for 2nd strip)
    const parts = [
      { id: 'p1', type: 'side', label: 'Side', cutLength: 800, cutWidth: 610, quantity: 4, materialThickness: 18, edgeBandingEdges: [] },
    ];
    // Strip 1 (width 610): 800 + 3 + 800 + 3 + 800 = 2406 <= 2440 (3 items)
    // 4th item: cannot extend strip, cannot open new strip (610+3+610=1223 > 1220)
    // Must open new sheet
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toHaveLength(2);
    expect(result[0].placements).toHaveLength(3);
    expect(result[1].placements).toHaveLength(1);
  });
});

// ============================================================
// batchLayout — Grain constraint (no rotation)
// ============================================================

describe('batchLayout — Grain constraint', () => {
  it('never rotates parts', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Side', cutLength: 600, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    for (const sheet of result) {
      for (const p of sheet.placements) {
        expect(p.rotated).toBe(false);
        expect(p.grainViolated).toBe(false);
      }
    }
  });
});

// ============================================================
// batchLayout — Parts too large for sheet
// ============================================================

describe('batchLayout — Parts too large for sheet', () => {
  it('skips parts whose width exceeds sheet width', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Too Wide', cutLength: 600, cutWidth: 1500, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toEqual([]);
  });

  it('skips parts whose length exceeds sheet length', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Too Long', cutLength: 3000, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result).toEqual([]);
  });
});

// ============================================================
// batchLayout — Offcuts
// ============================================================

describe('batchLayout — Offcuts', () => {
  it('returns offcut rectangles for empty sheet areas', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'Side', cutLength: 600, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    expect(result[0].offcuts).toBeDefined();
    expect(Array.isArray(result[0].offcuts)).toBe(true);
    expect(result[0].offcuts.length).toBeGreaterThan(0);
  });
});

// ============================================================
// batchLayout — Deterministic output
// ============================================================

describe('batchLayout — Deterministic', () => {
  it('produces identical output for identical input', () => {
    const parts = [
      { id: 'a', type: 'side', label: 'A', cutLength: 400, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'b', type: 'top', label: 'B', cutLength: 500, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'c', type: 'bottom', label: 'C', cutLength: 300, cutWidth: 300, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result1 = batchLayout(parts, { width: 1220, length: 2440 }, 3);
    const result2 = batchLayout(parts, { width: 1220, length: 2440 }, 3);

    expect(result1.length).toBe(result2.length);
    expect(result1[0].placements.length).toBe(result2[0].placements.length);
    for (let i = 0; i < result1[0].placements.length; i++) {
      expect(result1[0].placements[i].part.id).toBe(result2[0].placements[i].part.id);
      expect(result1[0].placements[i].x).toBe(result2[0].placements[i].x);
      expect(result1[0].placements[i].y).toBe(result2[0].placements[i].y);
    }
  });
});

// ============================================================
// batchLayout — Zero kerf
// ============================================================

describe('batchLayout — Zero kerf', () => {
  it('handles zero kerf without gaps between parts', () => {
    const parts = [
      { id: 'p1', type: 'side', label: 'A', cutLength: 600, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
      { id: 'p2', type: 'top', label: 'B', cutLength: 500, cutWidth: 400, quantity: 1, materialThickness: 18, edgeBandingEdges: [] },
    ];
    const result = batchLayout(parts, { width: 1220, length: 2440 }, 0);
    expect(result).toHaveLength(1);
    expect(result[0].placements[1].y).toBe(600);
  });
});