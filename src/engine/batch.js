/**
 * batch.js — Batch/Strip cut mode
 *
 * Mimics how a woodworker processes a sheet at a track saw or table saw:
 * 1. Group parts by their width dimension
 * 2. For each width group, rip full-length strips from the sheet
 * 3. Cross-cut strips into individual part lengths
 * 4. Kerf is deducted from available space between cuts, not after the last cut
 *
 * Per ADR-012:
 * - Parts are grouped by cutWidth
 * - Within each strip, parts are sorted by cutLength descending (longest first)
 * - Grain direction is a hard constraint: no rotation allowed
 * - Deterministic output: same input always produces same layout
 *
 * @param {Part[]} parts - Array of Part objects with { cutLength, cutWidth, quantity, ... }
 * @param {object} sheet - { width, length } in mm
 * @param {number} kerf - blade kerf in mm
 * @returns {SheetLayout[]}
 */
export function batchLayout(parts, sheet, kerf) {
  if (!parts || parts.length === 0) return [];

  // Expand parts by quantity into individual items to place
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

  // Group items by their width dimension (the strip width)
  const widthGroups = new Map();
  for (const item of items) {
    if (!widthGroups.has(item.width)) {
      widthGroups.set(item.width, []);
    }
    widthGroups.get(item.width).push(item);
  }

  // Sort each group by length descending (longest first for stability)
  for (const [, group] of widthGroups) {
    group.sort((a, b) => b.length - a.length);
  }

  // Sort width groups by width descending (wider strips first)
  const sortedWidths = [...widthGroups.keys()].sort((a, b) => b - a);

  // Sheet tracking structure
  // Each sheet tracks strips. Each strip has a width and a list of placed parts with their lengths.
  const sheets = [];
  // Each sheet: { placements: [], usedArea: number, strips: [{ width: number, partLengths: number[] }] }

  for (const stripWidth of sortedWidths) {
    const groupItems = widthGroups.get(stripWidth);

    for (const item of groupItems) {
      // Part length runs along sheet length axis.
      // Strip width runs along sheet width axis.
      // No rotation (grain hard constraint).

      if (stripWidth > sheet.width || item.length > sheet.length) {
        continue; // Cannot fit on any sheet
      }

      let placed = false;

      // Try existing sheets: find one with a matching-width strip that has room
      for (const sheetData of sheets) {
        for (const strip of sheetData.strips) {
          if (strip.width === stripWidth) {
            // Calculate how much length is used in this strip (sum of part lengths + kerfs between)
            const usedLength = strip.partLengths.reduce((s, l) => s + l, 0) +
              (strip.partLengths.length > 0 ? (strip.partLengths.length - 1) * kerf : 0);
            const availableLength = sheet.length - usedLength -
              (strip.partLengths.length > 0 ? kerf : 0); // kerf before next part

            if (availableLength >= item.length) {
              // Place in this strip
              const partY = usedLength + (strip.partLengths.length > 0 ? kerf : 0);
              const partX = getStripX(sheetData, strip, kerf);

              sheetData.placements.push({
                part: item.part,
                x: partX,
                y: partY,
                rotated: false,
                grainViolated: false,
              });

              sheetData.usedArea += item.length * stripWidth;
              strip.partLengths.push(item.length);
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }

      if (!placed) {
        // Try to start a new strip in an existing sheet
        let foundSheet = null;
        for (const sheetData of sheets) {
          const usedWidth = calculateUsedWidth(sheetData, kerf);
          const availableWidth = sheet.width - usedWidth;
          // Need stripWidth + kerf (if there are existing strips)
          const existingStripsCount = sheetData.strips.length;
          const neededWidth = stripWidth + (existingStripsCount > 0 ? kerf : 0);
          if (availableWidth >= neededWidth) {
            foundSheet = sheetData;
            break;
          }
        }

        if (foundSheet) {
          const partX = calculateUsedWidth(foundSheet, kerf) +
            (foundSheet.strips.length > 0 ? kerf : 0);

          foundSheet.placements.push({
            part: item.part,
            x: partX,
            y: 0,
            rotated: false,
            grainViolated: false,
          });

          foundSheet.usedArea += item.length * stripWidth;
          foundSheet.strips.push({
            width: stripWidth,
            partLengths: [item.length],
          });
          placed = true;
        }

        if (!placed) {
          // Open a new sheet
          const newSheetData = {
            placements: [{
              part: item.part,
              x: 0,
              y: 0,
              rotated: false,
              grainViolated: false,
            }],
            usedArea: item.length * stripWidth,
            strips: [{
              width: stripWidth,
              partLengths: [item.length],
            }],
          };
          sheets.push(newSheetData);
        }
      }
    }
  }

  // Compute utilisation and offcuts
  const sheetArea = sheet.width * sheet.length;
  return sheets.map((s, i) => ({
    sheetIndex: i,
    placements: s.placements,
    utilisationPercent: Math.round((s.usedArea / sheetArea) * 10000) / 100,
    offcuts: computeOffcuts(sheet, s.placements),
  }));
}

/**
 * Calculate the total width used by all strips in a sheet (including kerfs between strips).
 * @param {object} sheetData
 * @param {number} kerf
 * @returns {number}
 */
function calculateUsedWidth(sheetData, kerf) {
  let total = 0;
  for (let i = 0; i < sheetData.strips.length; i++) {
    total += sheetData.strips[i].width;
    if (i < sheetData.strips.length - 1) {
      total += kerf;
    }
  }
  return total;
}

/**
 * Get the x position of a specific strip within its sheet.
 * @param {object} sheetData
 * @param {object} strip
 * @param {number} kerf
 * @returns {number}
 */
function getStripX(sheetData, strip, kerf) {
  let x = 0;
  for (const s of sheetData.strips) {
    if (s === strip) break;
    x += s.width + kerf;
  }
  return x;
}

/**
 * Compute approximate offcut rectangles from a sheet layout.
 * Uses a sweep-line approach along y-coordinates.
 *
 * @param {object} sheet - { width, length }
 * @param {object[]} placements
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
function computeOffcuts(sheet, placements) {
  if (placements.length === 0) {
    return [{ x: 0, y: 0, width: sheet.width, height: sheet.length }];
  }

  // Build occupied rectangles
  const occupied = placements.map(p => ({
    x: p.x,
    y: p.y,
    w: p.rotated ? p.part.cutWidth : p.part.cutLength,
    h: p.rotated ? p.part.cutLength : p.part.cutWidth,
  }));

  // Collect all unique y-coordinates
  const yCoords = new Set();
  yCoords.add(0);
  for (const r of occupied) {
    yCoords.add(r.y);
    yCoords.add(r.y + r.h);
  }
  const sortedY = [...yCoords].sort((a, b) => a - b);

  const offcuts = [];

  for (let i = 0; i < sortedY.length - 1; i++) {
    const stripY = sortedY[i];
    const stripH = sortedY[i + 1] - stripY;
    if (stripH <= 0) continue;

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

    // Emit offcuts for gaps
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

  const maxY = sortedY[sortedY.length - 1];
  if (maxY < sheet.length) {
    offcuts.push({ x: 0, y: maxY, width: sheet.width, height: sheet.length - maxY });
  }

  return offcuts;
}