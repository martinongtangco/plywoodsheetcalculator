/**
 * balanced.js — Balanced cut mode
 *
 * Starts with batch/strip grouping, then runs a secondary pass
 * to check if any offcut areas can absorb parts from the next sheet.
 * If absorbing saves a sheet, parts are reassigned.
 *
 * @param {Part[]} parts
 * @param {object} sheet - { width, length } in mm
 * @param {number} kerf - blade kerf in mm
 * @param {string} grainConstraint - 'hard' | 'soft'
 * @returns {SheetLayout[]}
 */
export function balancedLayout(parts, sheet, kerf, grainConstraint = 'hard') {
  // TODO: implement
  throw new Error('balancedLayout not yet implemented');
}