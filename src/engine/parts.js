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
 * @param {object} box - { external_W, external_H, external_D, construction_method }
 * @param {object} thicknesses - { side, top, bottom, back } in mm
 * @param {object} edgeBanding - { thickness } in mm, or null
 * @returns {Part[]}
 */
export function calculateCarcassParts(box, thicknesses, edgeBanding) {
  // TODO: implement
  throw new Error('calculateCarcassParts not yet implemented');
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