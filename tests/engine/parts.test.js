/**
 * parts.test.js — Unit tests for src/engine/parts.js
 *
 * Covers:
 * - calculateCarcassParts (Method A and B)
 * - calculateInternalDimensions
 * - calculateDrawerParts (stub — should throw)
 *
 * Per ADR-009: every public function in the engine has at least
 * one happy-path test and one edge-case test.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateCarcassParts,
  calculateInternalDimensions,
  calculateDrawerParts,
} from '../../src/engine/parts.js';

// ============================================================
// Shared fixtures
// ============================================================

const standardBoxA = {
  external_W: 800,
  external_H: 600,
  external_D: 400,
  construction_method: 'A',
};

const standardBoxB = {
  external_W: 800,
  external_H: 600,
  external_D: 400,
  construction_method: 'B',
};

const standardThicknesses = {
  side: 18,
  top: 18,
  bottom: 18,
  back: 3,
};

// ============================================================
// calculateCarcassParts — Method A
// ============================================================

describe('calculateCarcassParts — Method A', () => {
  it('returns 4 part types: side (x2), top, bottom, back', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    expect(parts).toHaveLength(4);
    expect(parts.map(p => p.type)).toEqual(['side', 'top', 'bottom', 'back']);
  });

  it('side panels have correct dimensions: external_H x external_D', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const side = parts.find(p => p.type === 'side');
    expect(side.cutLength).toBe(600); // external_H
    expect(side.cutWidth).toBe(400);  // external_D
    expect(side.quantity).toBe(2);
  });

  it('top panel: (external_W - 2*side) x (external_D - back)', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const top = parts.find(p => p.type === 'top');
    expect(top.cutLength).toBe(800 - 2 * 18); // 764
    expect(top.cutWidth).toBe(400 - 3);        // 397
    expect(top.quantity).toBe(1);
  });

  it('bottom panel matches top panel dimensions', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const top = parts.find(p => p.type === 'top');
    const bottom = parts.find(p => p.type === 'bottom');
    expect(bottom.cutLength).toBe(top.cutLength);
    expect(bottom.cutWidth).toBe(top.cutWidth);
  });

  it('back panel: (external_W - overlap) x (external_H - overlap)', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const back = parts.find(p => p.type === 'back');
    // Default overlap is 6mm
    expect(back.cutLength).toBe(800 - 6);  // 794
    expect(back.cutWidth).toBe(600 - 6);   // 594
  });

  it('custom backPanelOverlap is respected', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null, 10);
    const back = parts.find(p => p.type === 'back');
    expect(back.cutLength).toBe(800 - 10); // 790
    expect(back.cutWidth).toBe(600 - 10);  // 590
  });

  it('side panel has correct material thickness', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const side = parts.find(p => p.type === 'side');
    expect(side.materialThickness).toBe(18);
  });

  it('back panel has correct material thickness', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const back = parts.find(p => p.type === 'back');
    expect(back.materialThickness).toBe(3);
  });

  it('each part has a unique id', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const ids = parts.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each part has an empty edgeBandingEdges array by default', () => {
    const parts = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    for (const part of parts) {
      expect(Array.isArray(part.edgeBandingEdges)).toBe(true);
      expect(part.edgeBandingEdges).toHaveLength(0);
    }
  });
});

// ============================================================
// calculateCarcassParts — Method B
// ============================================================

describe('calculateCarcassParts — Method B', () => {
  it('returns 4 part types: side (x2), top, bottom, back', () => {
    const parts = calculateCarcassParts(standardBoxB, standardThicknesses, null);
    expect(parts).toHaveLength(4);
    expect(parts.map(p => p.type)).toEqual(['side', 'top', 'bottom', 'back']);
  });

  it('side panels: (external_H - top - bottom) x (external_D - back)', () => {
    const parts = calculateCarcassParts(standardBoxB, standardThicknesses, null);
    const side = parts.find(p => p.type === 'side');
    expect(side.cutLength).toBe(600 - 18 - 18); // 564
    expect(side.cutWidth).toBe(400 - 3);        // 397
    expect(side.quantity).toBe(2);
  });

  it('top panel: external_W x (external_D - back)', () => {
    const parts = calculateCarcassParts(standardBoxB, standardThicknesses, null);
    const top = parts.find(p => p.type === 'top');
    expect(top.cutLength).toBe(800);             // external_W
    expect(top.cutWidth).toBe(400 - 3);          // 397
  });

  it('bottom panel matches top panel dimensions', () => {
    const parts = calculateCarcassParts(standardBoxB, standardThicknesses, null);
    const top = parts.find(p => p.type === 'top');
    const bottom = parts.find(p => p.type === 'bottom');
    expect(bottom.cutLength).toBe(top.cutLength);
    expect(bottom.cutWidth).toBe(top.cutWidth);
  });

  it('back panel dimensions are identical to Method A', () => {
    const partsA = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const partsB = calculateCarcassParts(standardBoxB, standardThicknesses, null);
    const backA = partsA.find(p => p.type === 'back');
    const backB = partsB.find(p => p.type === 'back');
    expect(backB.cutLength).toBe(backA.cutLength);
    expect(backB.cutWidth).toBe(backA.cutWidth);
  });
});

// ============================================================
// calculateCarcassParts — Edge banding
// ============================================================

describe('calculateCarcassParts — Edge banding', () => {
  it('edge banding parameter is accepted without error', () => {
    expect(() => {
      calculateCarcassParts(standardBoxA, standardThicknesses, { thickness: 2 });
    }).not.toThrow();
  });

  it('null edge banding produces same result as { thickness: 0 }', () => {
    const partsNull = calculateCarcassParts(standardBoxA, standardThicknesses, null);
    const partsZero = calculateCarcassParts(standardBoxA, standardThicknesses, { thickness: 0 });
    for (let i = 0; i < partsNull.length; i++) {
      expect(partsZero[i].cutLength).toBe(partsNull[i].cutLength);
      expect(partsZero[i].cutWidth).toBe(partsNull[i].cutWidth);
    }
  });
});

// ============================================================
// calculateCarcassParts — Edge cases
// ============================================================

describe('calculateCarcassParts — Edge cases', () => {
  it('throws on unknown construction method', () => {
    expect(() => {
      calculateCarcassParts(
        { ...standardBoxA, construction_method: 'C' },
        standardThicknesses,
        null
      );
    }).toThrow(/Unknown construction method/);
  });

  it('throws on empty string construction method', () => {
    expect(() => {
      calculateCarcassParts(
        { ...standardBoxA, construction_method: '' },
        standardThicknesses,
        null
      );
    }).toThrow();
  });

  it('handles zero-thickness back panel', () => {
    const parts = calculateCarcassParts(standardBoxA, { ...standardThicknesses, back: 0 }, null);
    const top = parts.find(p => p.type === 'top');
    // top width = external_D - back = 400 - 0 = 400
    expect(top.cutWidth).toBe(400);
  });

  it('handles very thin material (3mm)', () => {
    const thinThicknesses = { side: 3, top: 3, bottom: 3, back: 3 };
    const parts = calculateCarcassParts(standardBoxA, thinThicknesses, null);
    const top = parts.find(p => p.type === 'top');
    expect(top.cutLength).toBe(800 - 2 * 3); // 794
  });

  it('Method B handles different top and bottom thicknesses', () => {
    const mixedThicknesses = { side: 18, top: 18, bottom: 25, back: 3 };
    const parts = calculateCarcassParts(standardBoxB, mixedThicknesses, null);
    const side = parts.find(p => p.type === 'side');
    expect(side.cutLength).toBe(600 - 18 - 25); // 557
  });
});

// ============================================================
// calculateInternalDimensions
// ============================================================

describe('calculateInternalDimensions', () => {
  it('Method A: correct internal dimensions', () => {
    const result = calculateInternalDimensions(standardBoxA, standardThicknesses);
    expect(result.width).toBe(800 - 2 * 18);  // 764
    expect(result.height).toBe(600 - 18 - 18); // 564
    expect(result.depth).toBe(400 - 3);         // 397
  });

  it('Method B: same internal dimensions as Method A', () => {
    const resultA = calculateInternalDimensions(standardBoxA, standardThicknesses);
    const resultB = calculateInternalDimensions(standardBoxB, standardThicknesses);
    expect(resultB.width).toBe(resultA.width);
    expect(resultB.height).toBe(resultA.height);
    expect(resultB.depth).toBe(resultA.depth);
  });

  it('throws on unknown construction method', () => {
    expect(() => {
      calculateInternalDimensions(
        { ...standardBoxA, construction_method: 'C' },
        standardThicknesses
      );
    }).toThrow(/Unknown construction method/);
  });

  it('handles symmetric box', () => {
    const box = {
      external_W: 500,
      external_H: 500,
      external_D: 500,
      construction_method: 'A',
    };
    const thicknesses = { side: 18, top: 18, bottom: 18, back: 3 };
    const result = calculateInternalDimensions(box, thicknesses);
    expect(result.width).toBe(464);
    expect(result.height).toBe(464);
    expect(result.depth).toBe(497);
  });
});

// ============================================================
// calculateCarcassParts — Internal Shelves (ADR-010)
// ============================================================

describe('calculateCarcassParts — Internal Shelves', () => {
  it('adds shelf parts when internalShelves array is provided', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      [{ quantity: 2 }]
    );
    // 4 base parts + 1 shelf entry
    expect(parts).toHaveLength(5);
    const shelf = parts.find(p => p.type === 'shelf');
    expect(shelf).toBeDefined();
    expect(shelf.quantity).toBe(2);
  });

  it('shelf dimensions match top/bottom panel dimensions (Method A)', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      [{ quantity: 1 }]
    );
    const top = parts.find(p => p.type === 'top');
    const shelf = parts.find(p => p.type === 'shelf');
    // Shelf should have same width calculation: external_W - 2*side
    expect(shelf.cutLength).toBe(top.cutLength);
    expect(shelf.cutWidth).toBe(top.cutWidth);
  });

  it('shelf dimensions match top/bottom panel dimensions (Method B)', () => {
    const parts = calculateCarcassParts(
      standardBoxB,
      standardThicknesses,
      null,
      6,
      [{ quantity: 1 }]
    );
    const top = parts.find(p => p.type === 'top');
    const shelf = parts.find(p => p.type === 'shelf');
    // Shelf width = external_W - 2*side (same as top/bottom in both methods)
    expect(shelf.cutLength).toBe(800 - 2 * 18); // 764
    expect(shelf.cutWidth).toBe(400 - 3);       // 397
    // Top in Method B is full width
    expect(top.cutLength).toBe(800);
  });

  it('shelf defaults to top thickness when thickness not specified', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      [{ quantity: 1 }]
    );
    const shelf = parts.find(p => p.type === 'shelf');
    expect(shelf.materialThickness).toBe(18); // same as top
  });

  it('shelf uses custom thickness when specified', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      [{ quantity: 1, thickness: 15 }]
    );
    const shelf = parts.find(p => p.type === 'shelf');
    expect(shelf.materialThickness).toBe(15);
  });

  it('supports multiple shelf entries with different quantities', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      [{ quantity: 2 }, { quantity: 1, thickness: 15 }]
    );
    const shelves = parts.filter(p => p.type === 'shelf');
    expect(shelves).toHaveLength(2);
    expect(shelves[0].quantity).toBe(2);
    expect(shelves[1].quantity).toBe(1);
    expect(shelves[0].materialThickness).toBe(18); // defaults to top
    expect(shelves[1].materialThickness).toBe(15);
  });

  it('empty internalShelves array produces no shelf parts', () => {
    const parts = calculateCarcassParts(
      standardBoxA,
      standardThicknesses,
      null,
      6,
      []
    );
    expect(parts).toHaveLength(4);
    expect(parts.find(p => p.type === 'shelf')).toBeUndefined();
  });
});

// ============================================================
// calculateCarcassParts — Edge Banding Subtraction (ADR-010)
// ============================================================

describe('calculateCarcassParts — Edge Banding Subtraction', () => {
  const boxA = {
    external_W: 800,
    external_H: 600,
    external_D: 400,
    construction_method: 'A',
  };

  const thicknesses = {
    side: 18,
    top: 18,
    bottom: 18,
    back: 3,
  };

  it('edge banding on top panel length+ reduces cutLength', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { top: ['length+'] }
    );
    const top = parts.find(p => p.type === 'top');
    // Nominal: 800 - 2*18 = 764. With 2mm on length+: 762
    expect(top.cutLength).toBe(762);
    expect(top.cutWidth).toBe(397); // unchanged
    expect(top.edgeBandingEdges).toContain('length+');
  });

  it('edge banding on top panel length+ and length- reduces cutLength by 2x', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { top: ['length+', 'length-'] }
    );
    const top = parts.find(p => p.type === 'top');
    // Nominal: 764. With 2mm on both length edges: 760
    expect(top.cutLength).toBe(760);
    expect(top.cutWidth).toBe(397);
  });

  it('edge banding on all four edges of top panel', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { top: ['length+', 'length-', 'width+', 'width-'] }
    );
    const top = parts.find(p => p.type === 'top');
    // Nominal: 764 x 397. With 2mm on all edges: 760 x 393
    expect(top.cutLength).toBe(760);
    expect(top.cutWidth).toBe(393);
  });

  it('edge banding on side panel width+ (visible front edge)', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { side: ['width+'] }
    );
    const side = parts.find(p => p.type === 'side');
    // Nominal: 600 x 400. With 2mm on width+: 600 x 398
    expect(side.cutLength).toBe(600);
    expect(side.cutWidth).toBe(398);
  });

  it('edge banding on shelf with single edge', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [{ quantity: 1 }],
      { shelf: ['width+'] }
    );
    const shelf = parts.find(p => p.type === 'shelf');
    // Nominal: 764 x 397. With 2mm on width+: 764 x 395
    expect(shelf.cutLength).toBe(764);
    expect(shelf.cutWidth).toBe(395);
    expect(shelf.edgeBandingEdges).toContain('width+');
  });

  it('Method B edge banding on side panel', () => {
    const boxB = {
      ...boxA,
      construction_method: 'B',
    };
    const parts = calculateCarcassParts(
      boxB,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { side: ['length+', 'width+'] }
    );
    const side = parts.find(p => p.type === 'side');
    // Method B nominal: (600 - 18 - 18) x (400 - 3) = 564 x 397
    // With 2mm on length+ and width+: 562 x 395
    expect(side.cutLength).toBe(562);
    expect(side.cutWidth).toBe(395);
  });

  it('no edge banding config produces nominal dimensions', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      {} // empty edge banding config
    );
    const top = parts.find(p => p.type === 'top');
    // Nominal: 764 x 397 — no subtraction
    expect(top.cutLength).toBe(764);
    expect(top.cutWidth).toBe(397);
  });

  it('edge banding edges are recorded on each part', () => {
    const parts = calculateCarcassParts(
      boxA,
      thicknesses,
      { thickness: 2 },
      6,
      [],
      { top: ['length+'], side: ['width+'], back: [], shelf: [] }
    );
    const top = parts.find(p => p.type === 'top');
    const side = parts.find(p => p.type === 'side');
    const bottom = parts.find(p => p.type === 'bottom');
    const back = parts.find(p => p.type === 'back');

    expect(top.edgeBandingEdges).toContain('length+');
    expect(side.edgeBandingEdges).toContain('width+');
    expect(bottom.edgeBandingEdges).toEqual([]);
    expect(back.edgeBandingEdges).toEqual([]);
  });
});

// ============================================================
// calculateDrawerParts
// ============================================================

describe('calculateDrawerParts', () => {
  it('throws "not yet implemented" error', () => {
    expect(() => {
      calculateDrawerParts({}, {}, {}, null);
    }).toThrow('calculateDrawerParts not yet implemented');
  });
});
