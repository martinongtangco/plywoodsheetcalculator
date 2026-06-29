/**
 * Lightweight UUID v4 generator.
 * No external dependency required for V1.
 *
 * @returns {string} A UUID v4 string
 */
export function uid() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}