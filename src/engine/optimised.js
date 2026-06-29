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
  // TODO: implement
  throw new Error('optimisedLayout not yet implemented');
}