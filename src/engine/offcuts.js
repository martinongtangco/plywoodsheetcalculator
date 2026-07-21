/**
 * offcuts.js — Shared offcut computation for layout algorithms.
 *
 * Extracted from batch.js, balanced.js, and optimised.js per ADR-019.
 * This is a pure algorithmic utility: given a sheet dimension and a set of
 * placements, it derives the rectangular offcut regions that remain unused.
 *
 * Uses a horizontal sweep-line approach: sorts placements by Y, then by X,
 * and walks across each row to find gaps between placements.
 *
 * Kerf-aware: each occupied rectangle is inflated by the kerf width so that
 * kerf gaps (material consumed by the saw blade) are excluded from the
 * reported offcut regions. Without this, kerf gaps between adjacent parts
 * would be reported as usable offcut space.
 *
 * @param {object} sheet - { width, length } in mm
 * @param {object[]} placements - array of { part, x, y, rotated }
 * @param {number} [kerf=0] - blade kerf width in mm
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function computeOffcuts(sheet, placements, kerf = 0) {
  if (placements.length === 0) {
    return [{ x: 0, y: 0, width: sheet.width, height: sheet.length }];
  }

  // Build occupied rectangles, inflated by kerf so kerf gaps are excluded
  // from offcut regions. Each rectangle is expanded by kerf on all four sides
  // and clamped to the sheet boundaries.
  const occupied = placements.map(p => {
    const w = p.rotated ? p.part.cutWidth : p.part.cutLength;
    const h = p.rotated ? p.part.cutLength : p.part.cutWidth;
    return {
      x: Math.max(0, p.x - kerf),
      y: Math.max(0, p.y - kerf),
      w: Math.min(sheet.width, p.x + w + kerf) - Math.max(0, p.x - kerf),
      h: Math.min(sheet.length, p.y + h + kerf) - Math.max(0, p.y - kerf),
    };
  });

  // Collect all unique y-coordinates where bands start/end
  const yCoords = new Set();
  yCoords.add(0);
  for (const r of occupied) {
    yCoords.add(r.y);
    yCoords.add(r.y + r.h);
  }
  const sortedY = [...yCoords].sort((a, b) => a - b);

  const offcuts = [];

  // For each horizontal strip between consecutive y-coordinates
  for (let i = 0; i < sortedY.length - 1; i++) {
    const stripY = sortedY[i];
    const stripH = sortedY[i + 1] - stripY;
    if (stripH <= 0) continue;

    // Find which occupied rects cover this strip
    const intervals = occupied
      .filter(r => r.y <= stripY && r.y + r.h >= stripY + stripH)
      .map(r => [r.x, r.x + r.w])
      .sort((a, b) => a[0] - b[0]);

    // Merge overlapping intervals
    const merged = [];
    for (const [start, end] of intervals) {
      if (merged.length > 0 && start <= merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
      } else {
        merged.push([start, end]);
      }
    }

    // Emit offcuts before first interval, between intervals, after last
    let cursorX = 0;
    for (const [start, end] of merged) {
      if (cursorX < start) {
        offcuts.push({ x: cursorX, y: stripY, width: start - cursorX, height: stripH });
      }
      cursorX = Math.max(cursorX, end);
    }
    if (cursorX < sheet.width) {
      offcuts.push({ x: cursorX, y: stripY, width: sheet.width - cursorX, height: stripH });
    }
  }

  // If nothing covers the bottom of the sheet
  const maxY = sortedY[sortedY.length - 1];
  if (maxY < sheet.length) {
    offcuts.push({ x: 0, y: maxY, width: sheet.width, height: sheet.length - maxY });
  }

  return offcuts;
}