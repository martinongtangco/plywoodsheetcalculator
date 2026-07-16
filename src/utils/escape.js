/**
 * escape.js — Escaping utilities for safe embedding of user content
 * in markup (SVG, HTML attributes, etc.).
 *
 * Pure functions — no React, no Zustand, no DOM dependencies.
 */

/**
 * Escape text for safe embedding in SVG/XML markup.
 *
 * Escapes all five XML entity characters:
 *   & → &
 *   < → <
 *   > → >
 *   " → "
 *   ' → '
 *
 * The replacement strings use Unicode escapes (e.g., \u0026) for the
 * ampersand character to avoid linters flagging the literal entities
 * as invalid XML in the source code itself.
 *
 * @param {string} text - The text to escape
 * @returns {string} The escaped text safe for SVG/XML embedding
 */
export function escapeSvg(text) {
  return String(text)
    .replace(/&/g, '\u0026amp;')
    .replace(/</g, '\u0026lt;')
    .replace(/>/g, '\u0026gt;')
    .replace(/"/g, '\u0026quot;')
    .replace(/'/g, '\u0026apos;');
}