/**
 * src/pdf/index.js — Public API for PDF module
 *
 * Re-exports:
 *   - generatePdf: produces PDF bytes from project data
 *   - downloadPdf: produces PDF bytes and triggers browser download
 */

export { generatePdf, downloadPdf } from './generate.js';