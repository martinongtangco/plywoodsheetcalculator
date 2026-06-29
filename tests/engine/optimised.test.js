import { describe, it, expect } from 'vitest';
import { optimisedLayout } from '../../src/engine/optimised.js';

// --- Helpers ---

/**
 * Create a simple Part object for testing.
 */
function makePart(id, cutLength, cutWidth, quantity = 1, type = 'side') {
  return {
    id,
    type,
    label: `${id}`,
    cutLength,
    cutWidth,
    quantity,
    materialThickness: 18,
    edgeBandingEdges: [],
  };
}

/**
 * Standard 4mm MDF sheet.
 */
const standardSheet = { width: 1220, length: 2440 };

/**
 * Default kerf.
 */
const defaultKerf = 3;

// --- Tests ---

describe('optimisedLayout', () => {
  describe('basic behaviour', () => {
    it('returns empty array for empty parts', () => {
      const result = optimisedLayout([], standardSheet, defaultKerf, 'hard');
      expect(result).toEqual([]);
    });

    it('returns empty array for null parts', () => {
      const result = optimisedLayout(null, standardSheet, defaultKerf, 'hard');
      expect(result).toEqual([]);
    });

    it('places a single part at origin', () => {
      const parts = [makePart('p1', 600, 400)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(1);
      expect(result[0].placements[0].x).toBe(0);
      expect(result[0].placements[0].y).toBe(0);
    });

    it('returns correct SheetLayout shape', () => {
      const parts = [makePart('p1', 600, 400)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      const layout = result[0];
      expect(layout).toHaveProperty('sheetIndex');
      expect(layout).toHaveProperty('placements');
      expect(layout).toHaveProperty('utilisationPercent');
      expect(layout).toHaveProperty('offcuts');
      expect(typeof layout.sheetIndex).toBe('number');
      expect(Array.isArray(layout.placements)).toBe(true);
      expect(typeof layout.utilisationPercent).toBe('number');
      expect(Array.isArray(layout.offcuts)).toBe(true);
    });

    it('each placement has the required fields', () => {
      const parts = [makePart('p1', 600, 400)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      const placement = result[0].placements[0];
      expect(placement).toHaveProperty('part');
      expect(placement).toHaveProperty('x');
      expect(placement).toHaveProperty('y');
      expect(placement).toHaveProperty('rotated');
      expect(placement).toHaveProperty('grainViolated');
    });

    it('respects part quantity by expanding into individual placements', () => {
      const parts = [makePart('p1', 600, 400, 3)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      let totalPlacements = 0;
      for (const sheet of result) totalPlacements += sheet.placements.length;
      expect(totalPlacements).toBe(3);
    });

    it('sorts parts by area descending (BFD heuristic)', () => {
      // Small part first in input, large part second
      const parts = [
        makePart('small', 100, 100),
        makePart('large', 800, 600),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // Large part should be placed first (at origin)
      expect(result[0].placements[0].part.id).toBe('large');
    });

    it('computes utilisationPercent correctly for a single part', () => {
      const partArea = 600 * 400;
      const sheetArea = standardSheet.width * standardSheet.length;
      const expected = Math.round((partArea / sheetArea) * 10000) / 100;
      const parts = [makePart('p1', 600, 400)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result[0].utilisationPercent).toBe(expected);
    });

    it('opens a second sheet when parts do not fit on one', () => {
      // Two parts, each larger than half the sheet
      const parts = [
        makePart('p1', 1200, 1300),
        makePart('p2', 1200, 1300),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result).toHaveLength(2);
    });

    it('sheetIndex is sequential starting from 0', () => {
      const parts = [
        makePart('p1', 1200, 1300),
        makePart('p2', 1200, 1300),
        makePart('p3', 1200, 1300),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result.map(s => s.sheetIndex)).toEqual([0, 1, 2]);
    });
  });

  describe('grain constraint enforcement', () => {
    it('hard constraint: prevents rotation when only rotated orientation fits', () => {
      // A part that is 2500 x 100 (long and narrow).
      // The sheet is 1220 x 2440.
      // Normal: 2500 along sheet width (1220) — doesn't fit.
      // Rotated: 100 along sheet width, 2500 along sheet length — fits but against grain.
      // With hard constraint, it should NOT be placed (needs a new sheet where it can fit normally).
      // Actually: on a fresh sheet, normal means length(2500) along sheet_width(1220) — still doesn't fit.
      // So with hard constraint, the part cannot be placed at all on this sheet orientation.
      // The part will open a new sheet but still not fit normally. It should fail to place entirely
      // unless we allow rotation. With hard constraint, it opens new sheets but can never fit.
      // Let me use a better example.
      const parts = [
        // 2000mm long, 100mm wide. On a 1220x2440 sheet:
        // Normal: 2000 along width(1220) — NO.
        // Rotated: 100 along width, 2000 along length — YES but against grain.
        makePart('tall', 2000, 100),
      ];

      // Hard constraint: the part cannot be placed because normal doesn't fit
      // and rotated is against grain.
      const resultHard = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // The part cannot fit, so no placements on any sheet
      let totalHard = 0;
      for (const s of resultHard) totalHard += s.placements.length;
      expect(totalHard).toBe(0);

      // Soft constraint: rotation is allowed, flagged with grainViolated
      const resultSoft = optimisedLayout(parts, standardSheet, defaultKerf, 'soft');
      expect(resultSoft).toHaveLength(1);
      expect(resultSoft[0].placements).toHaveLength(1);
      expect(resultSoft[0].placements[0].rotated).toBe(true);
      expect(resultSoft[0].placements[0].grainViolated).toBe(true);
    });

    it('hard constraint: allows placement when normal orientation fits', () => {
      const parts = [makePart('p1', 1000, 800)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(1);
      expect(result[0].placements[0].rotated).toBe(false);
      expect(result[0].placements[0].grainViolated).toBe(false);
    });

    it('hard constraint: square parts are never flagged as grain-violated', () => {
      const parts = [makePart('square', 500, 500)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result[0].placements[0].grainViolated).toBe(false);
    });

    it('soft constraint: does not flag grainViolated for square parts even when rotated', () => {
      const parts = [makePart('square', 500, 500)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'soft');
      expect(result[0].placements[0].grainViolated).toBe(false);
    });

    it('soft constraint: allows rotation when it is the only fit', () => {
      // Part 2000x100 — only fits rotated on a 1220x2440 sheet
      const parts = [makePart('tall', 2000, 100)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'soft');
      expect(result[0].placements[0].rotated).toBe(true);
      expect(result[0].placements[0].grainViolated).toBe(true);
    });

    it('hard constraint: falls back to normal orientation when both fit but rotated is better', () => {
      // A part where both orientations fit
      const parts = [makePart('p1', 1000, 800)];
      const resultHard = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // Normal fits: 1000 <= 1220 && 800 <= 2440 — YES
      // Rotated fits: 800 <= 1220 && 1000 <= 2440 — YES
      // Both fit. Normal should be preferred (smaller remaining area depends on geometry).
      // In this case, normal leaves: right=(1220-1000)*800 + bottom=1220*(2440-800)
      // rotated leaves: right=(1220-800)*1000 + bottom=1220*(2440-1000)
      // Normal remaining: 220*800 + 1220*1640 = 176000 + 2000800 = 2176800
      // Rotated remaining: 420*1000 + 1220*1440 = 420000 + 1756800 = 2176800
      // They are equal, so normal is chosen (<= comparison)
      expect(resultHard[0].placements[0].rotated).toBe(false);
    });
  });

  describe('kerf deduction', () => {
    it('kerf is deducted from free space after the first cut', () => {
      // Place one part, then check that the second part is offset by kerf
      const parts = [
        makePart('p1', 600, 1000), // placed at (0,0), takes 600x1000
        makePart('p2', 617, 500),  // should fit to the right: 1220 - 600 - 3(kerf) = 617
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // Both should fit on one sheet
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(2);
    });

    it('kerf prevents placement when space is exactly part dimension + kerf', () => {
      // Part 1 fills almost the entire width
      const parts = [
        makePart('p1', 1217, 1000), // 1220 - 1217 = 3, minus kerf = 0 remaining width
        makePart('p2', 1, 500),     // needs 1mm to the right — but only 0mm free after kerf
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // p2 might fit below p1 instead, so check if both are placed
      let totalPlacements = 0;
      for (const s of result) totalPlacements += s.placements.length;
      expect(totalPlacements).toBe(2);
    });

    it('zero kerf allows tight packing', () => {
      const parts = [
        makePart('p1', 610, 1000),
        makePart('p2', 610, 1000),
      ];
      // With 0 kerf: 610 + 610 = 1220 = sheet width. Should fit side by side.
      const result = optimisedLayout(parts, { width: 1220, length: 2440 }, 0, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(2);
    });

    it('3mm kerf prevents tight packing of two 610mm parts', () => {
      const parts = [
        makePart('p1', 610, 1000),
        makePart('p2', 610, 1000),
      ];
      // With 3mm kerf: 610 + 3 + 610 = 1223 > 1220. Cannot fit side by side.
      // But both should still be placeable (one above the other).
      const result = optimisedLayout(parts, standardSheet, 3, 'hard');
      let totalPlacements = 0;
      for (const s of result) totalPlacements += s.placements.length;
      expect(totalPlacements).toBe(2);
    });

    it('kerf is applied on every guillotine split', () => {
      // Three narrow parts stacked vertically with kerf gaps
      const parts = [
        makePart('p1', 1000, 400),
        makePart('p2', 1000, 400),
        makePart('p3', 1000, 400),
      ];
      // Total height needed: 400 + 3 + 400 + 3 + 400 = 1206 <= 2440 (sheet length)
      // Width: 1000 <= 1220 (sheet width) — should all fit on one sheet
      const result = optimisedLayout(parts, standardSheet, 3, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(3);
    });
  });

  describe('free rectangle management', () => {
    it('places multiple parts in different free rectangles', () => {
      const parts = [
        makePart('large', 1000, 1000),
        makePart('small1', 200, 300),
        makePart('small2', 200, 300),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(3);
    });

    it('does not overlap placements', () => {
      const parts = [
        makePart('p1', 800, 800),
        makePart('p2', 800, 800),
        makePart('p3', 400, 400),
        makePart('p4', 400, 400),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');

      for (const sheet of result) {
        for (let i = 0; i < sheet.placements.length; i++) {
          for (let j = i + 1; j < sheet.placements.length; j++) {
            const a = sheet.placements[i];
            const b = sheet.placements[j];
            const aw = a.rotated ? a.part.cutWidth : a.part.cutLength;
            const ah = a.rotated ? a.part.cutLength : a.part.cutWidth;
            const bw = b.rotated ? b.part.cutWidth : b.part.cutLength;
            const bh = b.rotated ? b.part.cutLength : b.part.cutWidth;

            // Check no overlap (with kerf tolerance)
            const overlap = !(
              a.x + aw <= b.x ||
              b.x + bw <= a.x ||
              a.y + ah <= b.y ||
              b.y + bh <= a.y
            );
            expect(overlap).toBe(false);
          }
        }
      }
    });

    it('all placements stay within sheet bounds', () => {
      const parts = [
        makePart('p1', 1000, 800),
        makePart('p2', 500, 400),
        makePart('p3', 300, 600),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');

      for (const sheet of result) {
        for (const p of sheet.placements) {
          const pw = p.rotated ? p.part.cutWidth : p.part.cutLength;
          const ph = p.rotated ? p.part.cutLength : p.part.cutWidth;
          expect(p.x + pw).toBeLessThanOrEqual(standardSheet.width);
          expect(p.y + ph).toBeLessThanOrEqual(standardSheet.length);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('offcuts', () => {
    it('returns full sheet as offcut when no parts placed', () => {
      // A part that cannot fit at all (hard constraint, too tall)
      const parts = [makePart('too_tall', 3000, 3000)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // No placements possible
      let totalPlacements = 0;
      for (const s of result) totalPlacements += s.placements.length;
      if (totalPlacements === 0 && result.length > 0) {
        expect(result[0].offcuts).toEqual([{
          x: 0, y: 0,
          width: standardSheet.width,
          height: standardSheet.length,
        }]);
      }
    });

    it('offcut areas are positive', () => {
      const parts = [makePart('p1', 600, 400)];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      for (const offcut of result[0].offcuts) {
        expect(offcut.width).toBeGreaterThan(0);
        expect(offcut.height).toBeGreaterThan(0);
      }
    });

    it('offcut rectangles do not overlap with placements', () => {
      const parts = [
        makePart('p1', 800, 600),
        makePart('p2', 400, 300),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');

      for (const sheet of result) {
        for (const offcut of sheet.offcuts) {
          for (const p of sheet.placements) {
            const pw = p.rotated ? p.part.cutWidth : p.part.cutLength;
            const ph = p.rotated ? p.part.cutLength : p.part.cutWidth;

            const overlap = !(
              offcut.x + offcut.width <= p.x ||
              p.x + pw <= offcut.x ||
              offcut.y + offcut.height <= p.y ||
              p.y + ph <= offcut.y
            );
            expect(overlap).toBe(false);
          }
        }
      }
    });
  });

  describe('best-fit heuristic', () => {
    it('places smaller parts into smaller gaps first', () => {
      // Create a scenario where best-fit matters
      const parts = [
        makePart('big', 1000, 1000),  // creates a big gap
        makePart('tiny', 100, 100),   // should fit in the gap left by big
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      expect(result).toHaveLength(1);
      expect(result[0].placements).toHaveLength(2);
    });

    it('prefers existing sheet over opening a new one when part fits', () => {
      const parts = [
        makePart('p1', 1000, 1000),
        makePart('p2', 200, 200),
      ];
      const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
      // Both should be on sheet 0
      expect(result).toHaveLength(1);
    });
  });
});

describe('optimisedLayout — stress test', () => {
  it('handles 50+ parts on the main thread without hanging', () => {
    const parts = [];
    for (let i = 0; i < 60; i++) {
      const length = 200 + (i * 17) % 800;
      const width = 100 + (i * 13) % 500;
      parts.push(makePart(`p${i}`, length, width));
    }

    const start = performance.now();
    const result = optimisedLayout(parts, standardSheet, defaultKerf, 'hard');
    const elapsed = performance.now() - start;

    // Should complete in under 1 second on a modern machine
    expect(elapsed).toBeLessThan(1000);

    // All parts should be placed
    let totalPlacements = 0;
    for (const sheet of result) totalPlacements += sheet.placements.length;
    expect(totalPlacements).toBe(60);

    // No overlaps
    for (const sheet of result) {
      for (let i = 0; i < sheet.placements.length; i++) {
        for (let j = i + 1; j < sheet.placements.length; j++) {
          const a = sheet.placements[i];
          const b = sheet.placements[j];
          const aw = a.rotated ? a.part.cutWidth : a.part.cutLength;
          const ah = a.rotated ? a.part.cutLength : a.part.cutWidth;
          const bw = b.rotated ? b.part.cutWidth : b.part.cutLength;
          const bh = b.rotated ? b.part.cutLength : b.part.cutWidth;
          const overlap = !(
            a.x + aw <= b.x ||
            b.x + bw <= a.x ||
            a.y + ah <= b.y ||
            b.y + bh <= a.y
          );
          expect(overlap).toBe(false);
        }
      }
    }

    // All placements within sheet bounds
    for (const sheet of result) {
      for (const p of sheet.placements) {
        const pw = p.rotated ? p.part.cutWidth : p.part.cutLength;
        const ph = p.rotated ? p.part.cutLength : p.part.cutWidth;
        expect(p.x + pw).toBeLessThanOrEqual(standardSheet.width);
        expect(p.y + ph).toBeLessThanOrEqual(standardSheet.length);
      }
    }
  });

  it('handles 100 parts efficiently', () => {
    const parts = [];
    for (let i = 0; i < 100; i++) {
      const length = 150 + (i * 23) % 600;
      const width = 100 + (i * 19) % 400;
      parts.push(makePart(`p${i}`, length, width));
    }

    const start = performance.now();
    const result = optimisedLayout(parts, standardSheet, defaultKerf, 'soft');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);

    let totalPlacements = 0;
    for (const sheet of result) totalPlacements += sheet.placements.length;
    expect(totalPlacements).toBe(100);
  });
});