/**
 * batch.js — Batch/Strip cut mode
 *
 * Mimics how a woodworker processes a sheet at a track saw or table saw:
 * 1. Rip full-length strips by the most common width dimension
 * 2. Cross-cut strips into final part lengths
 * 3. Kerf is deducted from available space after every cut
 *
 * @param {Part[]} parts
 * @param {object} sheet - { width, length } in mm
 * @param {number} kerf - blade kerf in mm
 * @returns {SheetLayout[]}
 */
export function batchLayout(parts, sheet, kerf) {
  // TODO: implement
  throw new Error('batchLayout not yet implemented');
}