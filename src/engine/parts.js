/**
 * parts.js — Part dimension calculations
 *
 * All inputs and outputs are in millimetres (mm).
 * No UI dependencies. No side effects.
 *
 * Construction methods:
 *   A = full-height sides (sides run full external height)
 *   B = full-width top/bottom (top and bottom run full external width)
 */

/**
 * Calculate cut dimensions for all carcass parts of a box.
 *
 * Per ADR-010 formulas and ADR-008 edge banding model.
 *
 * Order of operations per ADR-008:
 * 1. Calculate nominal dimension from box dimensions + material thicknesses
 * 2. Subtract edge banding thickness for each banded edge
 * 3. Output: cut dimension (what goes on the cut list)
 *
 * @param {object} box - { external_W, external_H, external_D, construction_method }
 *   construction_method: 'A' (full-height sides) or 'B' (full-width top/bottom)
 * @param {object} thicknesses - { side, top, bottom, back } in mm
 * @param {object|null} edgeBanding - { thickness } in mm, or null if no edge banding
 * @param {number} [backPanelOverlap=6] - recessed back panel overlap in mm (default 6mm = 3mm per side)
 * @param {object[]} [internalShelves=[]] - array of shelf configs:
 *   [{ quantity, thickness? }] — thickness defaults to the `top` thickness from `thicknesses`
 * @param {object} [edgeBandingEdges={}] - per-type edge banding config:
 *   { side: ['width+'], top: ['length+', 'length-', 'width+'], bottom: [], back: [], shelf: [] }
 *   Each key is a part type; each value is an array of edges to band.
 *   Edges: subset of ['length+', 'length-', 'width+', 'width-']
 * @returns {Part[]}
 */
export function calculateCarcassParts(box, thicknesses, edgeBanding, backPanelOverlap = 6, internalShelves = [], edgeBandingEdges = {}) {
  const { external_W, external_H, external_D, construction_method } = box;
  const { side, top, bottom, back } = thicknesses;
  const eb = edgeBanding ? edgeBanding.thickness : 0;

  /**
   * Apply edge banding subtraction to a nominal dimension.
   * @param {number} nominalLength - dimension along the length axis
   * @param {number} nominalWidth - dimension along the width axis
   * @param {string[]} [edges=[]] - edges to band: subset of ['length+', 'length-', 'width+', 'width-']
   * @returns {{ cutLength: number, cutWidth: number }}
   */
  function applyEdgeBanding(nominalLength, nominalWidth, edges = []) {
    let cutLength = nominalLength;
    let cutWidth = nominalWidth;

    for (const edge of edges) {
      if (edge === 'length+' || edge === 'length-') {
        cutLength -= eb;
      } else if (edge === 'width+' || edge === 'width-') {
        cutWidth -= eb;
      }
    }

    return { cutLength, cutWidth };
  }

  const parts = [];
  let partId = 0;

  /**
   * Look up the edge banding edges for a given part type.
   * @param {string} type - part type key
   * @returns {string[]}
   */
  function getEdgesForType(type) {
    return edgeBandingEdges[type] || [];
  }

  if (construction_method === 'A') {
    // Method A: sides run full external height. Top and bottom sit between them.
    //
    // Side panel:     length = external_H,           width = external_D
    // Top panel:      length = external_W - (2 * side), width = external_D - back
    // Bottom panel:   length = external_W - (2 * side), width = external_D - back
    // Back panel:     length = external_W - overlap,   width = external_H - overlap

    // Side panels (quantity: 2)
    {
      const edges = getEdgesForType('side');
      const { cutLength, cutWidth } = applyEdgeBanding(external_H, external_D, edges);
      parts.push({
        id: `carcass-side-${partId++}`,
        type: 'side',
        label: 'Side Panel',
        cutLength,
        cutWidth,
        quantity: 2,
        materialThickness: side,
        edgeBandingEdges: edges,
      });
    }

    // Top panel
    {
      const nominalLength = external_W - (2 * side);
      const nominalWidth = external_D - back;
      const edges = getEdgesForType('top');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-top-${partId++}`,
        type: 'top',
        label: 'Top Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: top,
        edgeBandingEdges: edges,
      });
    }

    // Bottom panel
    {
      const nominalLength = external_W - (2 * side);
      const nominalWidth = external_D - back;
      const edges = getEdgesForType('bottom');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-bottom-${partId++}`,
        type: 'bottom',
        label: 'Bottom Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: bottom,
        edgeBandingEdges: edges,
      });
    }

    // Back panel
    {
      const nominalLength = external_W - backPanelOverlap;
      const nominalWidth = external_H - backPanelOverlap;
      const edges = getEdgesForType('back');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-back-${partId++}`,
        type: 'back',
        label: 'Back Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: back,
        edgeBandingEdges: edges,
      });
    }

  } else if (construction_method === 'B') {
    // Method B: top and bottom run full external width. Sides sit between them.
    //
    // Side panel:     length = external_H - (top + bottom), width = external_D - back
    // Top panel:      length = external_W,                 width = external_D - back
    // Bottom panel:   length = external_W,                 width = external_D - back
    // Back panel:     length = external_W - overlap,       width = external_H - overlap

    // Side panels (quantity: 2)
    {
      const nominalLength = external_H - (top + bottom);
      const nominalWidth = external_D - back;
      const edges = getEdgesForType('side');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-side-${partId++}`,
        type: 'side',
        label: 'Side Panel',
        cutLength,
        cutWidth,
        quantity: 2,
        materialThickness: side,
        edgeBandingEdges: edges,
      });
    }

    // Top panel
    {
      const nominalLength = external_W;
      const nominalWidth = external_D - back;
      const edges = getEdgesForType('top');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-top-${partId++}`,
        type: 'top',
        label: 'Top Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: top,
        edgeBandingEdges: edges,
      });
    }

    // Bottom panel
    {
      const nominalLength = external_W;
      const nominalWidth = external_D - back;
      const edges = getEdgesForType('bottom');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-bottom-${partId++}`,
        type: 'bottom',
        label: 'Bottom Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: bottom,
        edgeBandingEdges: edges,
      });
    }

    // Back panel
    {
      const nominalLength = external_W - backPanelOverlap;
      const nominalWidth = external_H - backPanelOverlap;
      const edges = getEdgesForType('back');
      const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
      parts.push({
        id: `carcass-back-${partId++}`,
        type: 'back',
        label: 'Back Panel',
        cutLength,
        cutWidth,
        quantity: 1,
        materialThickness: back,
        edgeBandingEdges: edges,
      });
    }

  } else {
    throw new Error(`Unknown construction method: ${construction_method}. Must be 'A' or 'B'.`);
  }

  // Internal shelves — same width calculation as top/bottom panels
  // Per ADR-010: shelf length = external_W - (2 * sideThickness)
  //              shelf width = external_D - backThickness
  for (const shelf of internalShelves) {
    const shelfThickness = shelf.thickness ?? top;
    const nominalLength = external_W - (2 * side);
    const nominalWidth = external_D - back;
    const edges = getEdgesForType('shelf');
    const { cutLength, cutWidth } = applyEdgeBanding(nominalLength, nominalWidth, edges);
    parts.push({
      id: `carcass-shelf-${partId++}`,
      type: 'shelf',
      label: `Internal Shelf`,
      cutLength,
      cutWidth,
      quantity: shelf.quantity,
      materialThickness: shelfThickness,
      edgeBandingEdges: edges,
    });
  }

  return parts;
}

/**
 * Calculate internal dimensions of a box given external dimensions and thicknesses.
 *
 * @param {object} box - { external_W, external_H, external_D, construction_method }
 * @param {object} thicknesses - { side, top, bottom, back } in mm
 * @returns {{ width: number, height: number, depth: number }}
 */
export function calculateInternalDimensions(box, thicknesses) {
  const { external_W, external_H, external_D, construction_method } = box;
  const { side, top, bottom, back } = thicknesses;

  // Internal width is always external_W minus the two side thicknesses
  const internalW = external_W - (2 * side);

  if (construction_method === 'A') {
    // Method A: sides run full height, so internal height = external_H - top - bottom
    const internalH = external_H - (top + bottom);
    // Internal depth = external_D - back (back is recessed inside)
    const internalD = external_D - back;
    return { width: internalW, height: internalH, depth: internalD };

  } else if (construction_method === 'B') {
    // Method B: top/bottom run full width, so internal height = external_H - top - bottom
    const internalH = external_H - (top + bottom);
    const internalD = external_D - back;
    return { width: internalW, height: internalH, depth: internalD };

  } else {
    throw new Error(`Unknown construction method: ${construction_method}. Must be 'A' or 'B'.`);
  }
}

/**
 * Calculate cut dimensions for all parts of a drawer configuration.
 *
 * @param {object} drawerConfig - { quantity, drawer_height, track_clearance_per_side, base_position, base_offset }
 * @param {object} internalDims - { width, depth } of the cabinet interior in mm
 * @param {object} thicknesses - { side, front_back, base } in mm
 * @param {object} edgeBanding - { thickness } in mm, or null
 * @returns {Part[]}
 */
export function calculateDrawerParts(drawerConfig, internalDims, thicknesses, edgeBanding) {
  // TODO: implement
  throw new Error('calculateDrawerParts not yet implemented');
}

/**
 * Re-export as the public API name used by index.js
 */
export const calculatePartDimensions = {
  carcass: calculateCarcassParts,
  drawers: calculateDrawerParts,
};