import { computeOffcuts } from './offcuts.js';

/**
 * optimised.js — Fully Optimised cut mode
 *
 * Guillotine Cut with Best-Fit Decreasing (BFD) heuristic.
 * Parts are sorted by area descending before placement.
 * Grain direction is enforced as a hard constraint unless grainConstraint === 'soft'.
 *
 * @param {Part[]} parts
 * @param {object} sheet - { width, length } in mm
 * @param {number} kerf - blade kerf in mm
 * @param {string} grainConstraint - 'hard' | 'soft'
 * @returns {SheetLayout[]}
 */
export function optimisedLayout(parts, sheet, kerf, grainConstraint = 'hard') {
  if (!parts || parts.length === 0) return [];

  // Expand parts by quantity into individual items to place
  /** @type {{ part: Part, length: number, width: number }[]} */
  const items = [];
  for (const part of parts) {
    for (let i = 0; i < part.quantity; i++) {
      items.push({
        part,
        length: part.cutLength,
        width: part.cutWidth,
      });
    }
  }

  // Sort by area descending (BFD heuristic)
  items.sort((a, b) => (b.length * b.width) - (a.length * a.width));

  const sheets = [];
  // Each sheet's free-rectangle list starts with the full sheet dimensions
  const sheetFreeRects = [[{ x: 0, y: 0, width: sheet.width, height: sheet.length }]];

  for (const item of items) {
    let placed = false;

    // Try to fit into an existing sheet (best-fit: smallest remaining space)
    /** @type {{ sheetIndex: number, x: number, y: number, rotated: boolean, remainingArea: number, grainViolated: boolean } | null} */
    let bestFit = null;

    for (let s = 0; s < sheetFreeRects.length; s++) {
      const rects = sheetFreeRects[s];

      for (let r = 0; r < rects.length; r++) {
        const rect = rects[r];
        const result = tryFitItem(item, rect, kerf, grainConstraint);

        if (result) {
          // Best-fit: choose the placement that leaves the smallest remaining area
          if (!bestFit || result.remainingArea < bestFit.remainingArea) {
            bestFit = {
              sheetIndex: s,
              x: rect.x + result.offsetX,
              y: rect.y + result.offsetY,
              rotated: result.rotated,
              remainingArea: result.remainingArea,
              grainViolated: result.grainViolated,
            };
          }
        }
      }

      // If we found a fit in this sheet, no need to check remaining rects in this sheet
      // (we already compared all rects for best fit)
      if (bestFit && bestFit.sheetIndex === s) break;
    }

    if (bestFit) {
      // Place the item in the selected sheet
      const placements = sheets[bestFit.sheetIndex]?.placements;
      if (!placements) {
        sheets[bestFit.sheetIndex] = {
          sheetIndex: bestFit.sheetIndex,
          placements: [],
          usedArea: 0,
        };
      }

      sheets[bestFit.sheetIndex].placements.push({
        part: item.part,
        x: bestFit.x,
        y: bestFit.y,
        rotated: bestFit.rotated,
        grainViolated: bestFit.grainViolated,
      });
      sheets[bestFit.sheetIndex].usedArea += item.length * item.width;

      // Split the free rectangle
      const placedWidth = bestFit.rotated ? item.width : item.length;
      const placedHeight = bestFit.rotated ? item.length : item.width;
      splitFreeRect(
        sheetFreeRects[bestFit.sheetIndex],
        bestFit.x,
        bestFit.y,
        placedWidth,
        placedHeight,
        kerf
      );
      placed = true;
    }

    if (!placed) {
      // Open a new sheet — the item could not fit on any existing sheet.
      // First check: can it even fit on a fresh sheet?
      const fitsNormally = item.length <= sheet.width && item.width <= sheet.length;
      const fitsRotated = item.width <= sheet.width && item.length <= sheet.length;
      const againstGrain = item.length !== item.width;

      // Skip if the part simply cannot fit on any sheet
      if (!fitsNormally && (!fitsRotated || (againstGrain && grainConstraint === 'hard'))) {
        continue;
      }

      const newSheetIndex = sheets.length;
      sheets.push({
        sheetIndex: newSheetIndex,
        placements: [{
          part: item.part,
          x: 0,
          y: 0,
          rotated: false,
          grainViolated: false,
        }],
        usedArea: item.length * item.width,
      });
      // Initialise this sheet's free rects by starting with the full sheet
      // and then splitting around the placed part.
      sheetFreeRects.push([{ x: 0, y: 0, width: sheet.width, height: sheet.length }]);
      splitFreeRect(
        sheetFreeRects[newSheetIndex],
        0,
        0,
        item.length,
        item.width,
        kerf
      );
    }
  }

  // Compute utilisation and offcuts for each sheet
  const sheetArea = sheet.width * sheet.length;
  return sheets.map((s, i) => ({
    sheetIndex: i,
    placements: s.placements,
    utilisationPercent: Math.round((s.usedArea / sheetArea) * 10000) / 100,
    offcuts: computeOffcuts(sheet, s.placements),
  }));
}

/**
 * Try to fit an item into a free rectangle.
 * Checks both orientations. Respects grain constraint.
 *
 * @param {object} item - { part, length, width }
 * @param {object} rect - { x, y, width, height }
 * @param {number} kerf
 * @param {string} grainConstraint
 * @returns {object | null} - { offsetX, offsetY, rotated, remainingArea, grainViolated } or null
 */
function tryFitItem(item, rect, kerf, grainConstraint) {
  const itemLength = item.length;
  const itemWidth = item.width;

  // The item's "length" should align with the sheet's length axis (horizontal).
  // "rotated" means we swap length and width of the part on the sheet.

  // Try normal orientation first: length along rect width, width along rect height
  const normalFitsW = itemLength <= rect.width && itemWidth <= rect.height;
  // Try rotated: width along rect width, length along rect height
  const rotatedFitsW = itemWidth <= rect.width && itemLength <= rect.height;

  if (normalFitsW && !rotatedFitsW) {
    const remaining = remainingAfterCut(rect, itemLength, itemWidth);
    return { offsetX: 0, offsetY: 0, rotated: false, remainingArea: remaining, grainViolated: false };
  }

  if (rotatedFitsW && !normalFitsW) {
    // Rotated placement: check grain
    // If the part is longer in its defined length, rotating means the long dimension
    // runs along the sheet width (against grain convention).
    const againstGrain = itemLength !== itemWidth; // only matters if dimensions differ
    if (againstGrain && grainConstraint === 'hard') return null;
    const remaining = remainingAfterCut(rect, itemWidth, itemLength);
    return {
      offsetX: 0, offsetY: 0, rotated: true,
      remainingArea: remaining,
      grainViolated: againstGrain,
    };
  }

  if (normalFitsW && rotatedFitsW) {
    // Both fit — prefer normal (not rotated) orientation
    const normalRemaining = remainingAfterCut(rect, itemLength, itemWidth);
    const rotatedRemaining = remainingAfterCut(rect, itemWidth, itemLength);

    if (normalRemaining <= rotatedRemaining) {
      return { offsetX: 0, offsetY: 0, rotated: false, remainingArea: normalRemaining, grainViolated: false };
    }

    // Rotated is better fit
    const againstGrain = itemLength !== itemWidth;
    if (againstGrain && grainConstraint === 'hard') {
      // Fall back to normal since hard constraint
      return { offsetX: 0, offsetY: 0, rotated: false, remainingArea: normalRemaining, grainViolated: false };
    }
    return {
      offsetX: 0, offsetY: 0, rotated: true,
      remainingArea: rotatedRemaining,
      grainViolated: againstGrain,
    };
  }

  return null;
}

/**
 * Calculate remaining usable area after placing a part in a free rectangle.
 * Uses Maximal Free Rectangles approach: the cut splits the rect,
 * we return the total area of the two remaining rects.
 *
 * @param {object} rect
 * @param {number} itemW - placed width (along rect width axis)
 * @param {number} itemH - placed height (along rect height axis)
 * @returns {number}
 */
function remainingAfterCut(rect, itemW, itemH) {
  const rightWidth = rect.width - itemW;
  const bottomHeight = rect.height - itemH;

  // After placing in the top-left corner of the free rect,
  // we split: right side and bottom side
  // Right rect: rightWidth x itemH
  // Bottom rect: rect.width x bottomHeight
  // Choose the split that leaves the larger free rect along the longer dimension
  // (standard guillotine split — split along the axis that leaves the bigger single rect)

  const rightArea = rightWidth * itemH;
  const bottomArea = rect.width * bottomHeight;

  return rightArea + bottomArea;
}

/**
 * Split a free rectangle after placing a part at (x, y) with given dimensions.
 * Uses the "maximal free rectangles" split strategy.
 * The placed part sits at the top-left of the free rectangle.
 * Kerf is removed from the adjacent free space.
 *
 * @param {object[]} freeRects - array of { x, y, width, height }
 * @param {number} partX - absolute x of placed part
 * @param {number} partY - absolute y of placed part
 * @param {number} partW - placed width
 * @param {number} partH - placed height
 * @param {number} kerf
 */
function splitFreeRect(freeRects, partX, partY, partW, partH, kerf) {
  // Find the free rect that contains this placement
  const idx = freeRects.findIndex(r =>
    r.x === partX && r.y === partY
  );

  if (idx === -1) return;

  const rect = freeRects[idx];
  freeRects.splice(idx, 1);

  // The part is placed at the top-left of the free rectangle.
  // Two new free rectangles are created:
  // 1. Right of the part: (partX + partW + kerf, partY, remainingWidth, partH)
  // 2. Below the part: (partX, partY + partH + kerf, rect.width, remainingHeight)
  //
  // We use the "split horizontally or vertically" approach:
  // Choose whichever split leaves the more useful free rectangles.

  const rightWidth = rect.width - partW - kerf;
  const bottomHeight = rect.height - partH - kerf;

  // Guillotine split: two rectangles after placing at top-left.
  //
  // Right rect: to the right of the placed part, full height of the free rect.
  // This captures everything right of the vertical cut line.
  if (rightWidth > 0) {
    freeRects.push({
      x: partX + partW + kerf,
      y: partY,
      width: rightWidth,
      height: rect.height,
    });
  }

  // Bottom rect: below the placed part, only under its width.
  // The area to the right is already covered by the right rect above.
  if (bottomHeight > 0) {
    freeRects.push({
      x: partX,
      y: partY + partH + kerf,
      width: partW,
      height: bottomHeight,
    });
  }

  // Merge adjacent rectangles to keep the list manageable
  mergeRects(freeRects);
}

/**
 * Merge free rectangles that share an edge and alignment to reduce the free-rect count.
 * Simple adjacency merging — merges rects sharing the same x with equal width,
 * or same y with equal height.
 *
 * @param {object[]} freeRects
 */
function mergeRects(freeRects) {
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < freeRects.length; i++) {
      for (let j = i + 1; j < freeRects.length; j++) {
        const a = freeRects[i];
        const b = freeRects[j];
        if (!a || !b) continue;

        // Merge horizontally: same y, same height, adjacent x
        if (a.y === b.y && a.height === b.height) {
          if (a.x + a.width === b.x) {
            a.width += b.width;
            freeRects.splice(j, 1);
            merged = true;
            break;
          }
          if (b.x + b.width === a.x) {
            b.width += a.width;
            freeRects.splice(i, 1);
            merged = true;
            break;
          }
        }

        // Merge vertically: same x, same width, adjacent y
        if (a.x === b.x && a.width === b.width) {
          if (a.y + a.height === b.y) {
            a.height += b.height;
            freeRects.splice(j, 1);
            merged = true;
            break;
          }
          if (b.y + b.height === a.y) {
            b.height += a.height;
            freeRects.splice(i, 1);
            merged = true;
            break;
          }
        }
      }
      if (merged) break;
    }
  }
}

