import { computeOffcuts } from './offcuts.js';

/**
 * balanced.js — Balanced cut mode
 *
 * Shelf-based Next-Fit Decreasing (NFD2D) algorithm with grain-aware placement.
 *
 * Algorithm (per ADR-013):
 * 1. Sort all parts by area descending (largest first)
 * 2. For each part, find the best "shelf" (horizontal band) on the current sheet(s)
 * 3. A shelf is created at the height (width dimension) of the first part placed in it
 * 4. Subsequent parts fit on a shelf if their width ≤ shelf height and their length
 *    fits in the remaining shelf length (plus kerf)
 * 5. If no shelf fits, create a new shelf below existing content
 * 6. If no shelf fits on the current sheet, move to the next sheet
 *
 * Coordinate system (consistent with batch.js and optimised.js):
 * - X axis: 0 → sheet.width (shorter dimension)
 * - Y axis: 0 → sheet.length (longer dimension / grain direction)
 * - Normal placement: cutLength along X, cutWidth along Y
 * - Rotated placement: cutWidth along X, cutLength along Y
 *
 * Placement rules:
 * - Rotation allowed only when grainConstraint === 'soft'
 * - Kerf added between parts on the same shelf and between shelves (per ADR-008)
 *
 * @param {Part[]} parts - Array of Part objects with { cutLength, cutWidth, quantity, ... }
 * @param {object} sheet - { width, length } in mm
 * @param {number} kerf - blade kerf in mm
 * @param {string} grainConstraint - 'hard' | 'soft'
 * @returns {SheetLayout[]}
 */
export function balancedLayout(parts, sheet, kerf, grainConstraint = 'hard') {
  if (!parts || parts.length === 0) return [];

  // Expand parts by quantity into individual items
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

  if (items.length === 0) return [];

  // Sort by area descending (largest first — NFD heuristic)
  items.sort((a, b) => (b.length * b.width) - (a.length * a.width));

  // Each sheet tracks shelves and placements
  // Shelf: { y, height, usedWidth, placements }
  // - y: Y position of the shelf (along sheet length / grain axis)
  // - height: Y dimension of the shelf (determined by first part placed)
  // - usedWidth: X dimension consumed so far (along sheet width axis)
  const sheets = [];

  for (const item of items) {
    let placed = false;

    const itemLength = item.length; // cutLength — along X in normal orientation
    const itemWidth = item.width;   // cutWidth — along Y in normal orientation
    const isSquare = itemLength === itemWidth;

    // Try existing sheets (in order — first sheet with room)
    for (const sheetData of sheets) {
      if (placed) break;

      // Try existing shelves — best-fit by remaining space
      let bestFit = null;

      for (const shelf of sheetData.shelves) {
        const result = tryPlaceOnShelf(item, shelf, sheet, kerf, grainConstraint, isSquare);
        if (result && (!bestFit || result.remaining < bestFit.remaining)) {
          bestFit = { ...result, shelf };
        }
      }

      if (bestFit) {
        const { x, rotated, grainViolated, shelf } = bestFit;
        const placedX = rotated ? itemWidth : itemLength;

        // Record placement
        sheetData.placements.push({
          part: item.part,
          x,
          y: shelf.y,
          rotated,
          grainViolated,
        });

        shelf.placements.push({
          part: item.part,
          x,
          y: shelf.y,
          rotated,
        });

        // Update shelf usedWidth from placement data
        recalcShelfUsedWidth(shelf);
        sheetData.usedArea += itemLength * itemWidth;
        placed = true;
        continue;
      }

      // Try creating a new shelf on this sheet
      const newShelfY = nextShelfY(sheetData, kerf);
      const remainingSheetHeight = sheet.length - newShelfY;

      if (remainingSheetHeight > 0) {
        // Normal: cutWidth along Y (shelf height), cutLength along X
        if (itemWidth <= remainingSheetHeight && itemLength <= sheet.width) {
          const newShelf = createShelf(newShelfY, itemWidth, itemLength, item.part, false);
          sheetData.shelves.push(newShelf);
          sheetData.placements.push({
            part: item.part,
            x: 0,
            y: newShelfY,
            rotated: false,
            grainViolated: false,
          });
          sheetData.usedArea += itemLength * itemWidth;
          placed = true;
          continue;
        }

        // Rotated: cutLength along Y (shelf height), cutWidth along X (only soft)
        if (!isSquare && grainConstraint === 'soft') {
          if (itemLength <= remainingSheetHeight && itemWidth <= sheet.width) {
            const newShelf = createShelf(newShelfY, itemLength, itemWidth, item.part, true);
            sheetData.shelves.push(newShelf);
            sheetData.placements.push({
              part: item.part,
              x: 0,
              y: newShelfY,
              rotated: true,
              grainViolated: true,
            });
            sheetData.usedArea += itemLength * itemWidth;
            placed = true;
            continue;
          }
        }
      }
    }

    // Open a new sheet
    if (!placed) {
      // Check normal orientation
      const fitsNormal = itemLength <= sheet.width && itemWidth <= sheet.length;
      const fitsRotated = !isSquare && grainConstraint === 'soft' &&
        itemWidth <= sheet.width && itemLength <= sheet.length;

      if (!fitsNormal && !fitsRotated) {
        continue; // Part cannot fit on any fresh sheet
      }

      const finalRotated = !fitsNormal && fitsRotated;
      const shelfHeight = finalRotated ? itemLength : itemWidth;
      const shelfUsed = finalRotated ? itemWidth : itemLength;

      const newSheetData = {
        shelves: [createShelf(0, shelfHeight, shelfUsed, item.part, finalRotated)],
        placements: [{
          part: item.part,
          x: 0,
          y: 0,
          rotated: finalRotated,
          grainViolated: finalRotated && !isSquare,
        }],
        usedArea: itemLength * itemWidth,
      };
      sheets.push(newSheetData);
    }
  }

  // Compute utilisation and offcuts
  const sheetArea = sheet.width * sheet.length;
  return sheets.map((s, i) => ({
    sheetIndex: i,
    placements: s.placements,
    utilisationPercent: Math.round((s.usedArea / sheetArea) * 10000) / 100,
    offcuts: computeOffcuts(sheet, s.placements, kerf),
  }));
}

/**
 * Try to place an item on an existing shelf.
 * Returns placement info or null.
 *
 * @param {object} item
 * @param {object} shelf
 * @param {object} sheet
 * @param {number} kerf
 * @param {string} grainConstraint
 * @param {boolean} isSquare
 * @returns {object | null}
 */
function tryPlaceOnShelf(item, shelf, sheet, kerf, grainConstraint, isSquare) {
  const itemLength = item.length;
  const itemWidth = item.width;

  // Kerf gap before this item if shelf already has parts
  const gapKerf = shelf.placements.length > 0 ? kerf : 0;
  const availableX = sheet.width - shelf.usedWidth - gapKerf;

  // Normal orientation: cutLength along X, cutWidth must fit shelf height
  if (itemWidth <= shelf.height && availableX >= itemLength) {
    const x = shelf.usedWidth + gapKerf;
    const remaining = availableX - itemLength;
    return { x, rotated: false, grainViolated: false, remaining };
  }

  // Rotated orientation: cutWidth along X, cutLength must fit shelf height (only soft)
  if (!isSquare && grainConstraint === 'soft') {
    if (itemLength <= shelf.height && availableX >= itemWidth) {
      const x = shelf.usedWidth + gapKerf;
      const remaining = availableX - itemWidth;
      return { x, rotated: true, grainViolated: true, remaining };
    }
  }

  return null;
}

/**
 * Create a new shelf object with the first part placed.
 *
 * @param {number} y
 * @param {number} height
 * @param {number} usedWidth
 * @param {object} part
 * @param {boolean} rotated
 * @returns {object}
 */
function createShelf(y, height, usedWidth, part, rotated) {
  return {
    y,
    height,
    usedWidth,
    placements: [{
      part,
      x: 0,
      y,
      rotated,
    }],
  };
}

/**
 * Recalculate the usedWidth of a shelf from its placements.
 *
 * @param {object} shelf
 */
function recalcShelfUsedWidth(shelf) {
  if (shelf.placements.length === 0) {
    shelf.usedWidth = 0;
    return;
  }
  const last = shelf.placements[shelf.placements.length - 1];
  const partX = last.rotated ? last.part.cutWidth : last.part.cutLength;
  shelf.usedWidth = last.x + partX;
}

/**
 * Calculate the Y position where a new shelf would start.
 * This is the maximum (y + height) of all existing shelves, plus kerf.
 *
 * @param {object} sheetData
 * @param {number} kerf
 * @returns {number}
 */
function nextShelfY(sheetData, kerf) {
  if (sheetData.shelves.length === 0) return 0;
  let maxY = 0;
  for (const shelf of sheetData.shelves) {
    const shelfBottom = shelf.y + shelf.height;
    if (shelfBottom > maxY) {
      maxY = shelfBottom;
    }
  }
  return maxY + kerf;
}

