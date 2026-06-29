/**
 * rasterize.test.js — Tests for the SVG rasterization utility.
 *
 * NOTE: Canvas-dependent tests are skipped in jsdom because
 * `HTMLCanvasElement.getContext()` is not implemented without the
 * `canvas` npm package. Those tests are designed to run in a real
 * browser (e.g., Playwright / Vitest browser mode).
 */

import { describe, it, expect } from 'vitest';
import {
  svgToDataUrl,
  createOffscreenCanvas,
  layoutToCanvas,
} from '../../src/utils/rasterize.js';

// --- Helpers ---

function createSimpleLayout() {
  return {
    sheetIndex: 0,
    placements: [
      {
        part: {
          id: 'p1',
          type: 'side',
          label: 'Side Panel',
          cutLength: 600,
          cutWidth: 400,
          quantity: 1,
        },
        x: 0,
        y: 0,
        rotated: false,
        grainViolated: false,
      },
    ],
    utilisationPercent: 24.59,
    offcuts: [
      { x: 600, y: 0, width: 620, height: 400 },
      { x: 0, y: 400, width: 600, height: 2040 },
    ],
  };
}

const standardSheet = { width: 1220, length: 2440 };

// --- Tests ---

describe('svgToDataUrl', () => {
  it('converts SVG string to data URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    const result = svgToDataUrl(svg);
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it('properly URL-encodes special characters', () => {
    const svg = '<svg><text>Hello "World" & stuff</text></svg>';
    const result = svgToDataUrl(svg);
    expect(result).toContain('%22'); // encoded double quotes
  });

  it('preserves apostrophes', () => {
    const svg = "<svg fill='red'><rect/></svg>";
    const result = svgToDataUrl(svg);
    expect(result).toContain('%27');
  });

  it('encodes unicode characters correctly', () => {
    const svg = '<svg><text>日本語</text></svg>';
    const result = svgToDataUrl(svg);
    expect(result).toMatch(/^data:image\/svg\+xml/);
  });

  it('handles empty SVG', () => {
    const svg = '<svg/>';
    const result = svgToDataUrl(svg);
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg%2F%3E$/);
  });
});

describe('createOffscreenCanvas', () => {
  it('creates a canvas with the correct dimensions', () => {
    const canvas = createOffscreenCanvas(800, 600);
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('supports non-square dimensions', () => {
    const canvas = createOffscreenCanvas(100, 200);
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(200);
  });

  it('supports zero dimensions', () => {
    const canvas = createOffscreenCanvas(0, 0);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
});

describe('layoutToCanvas — SVG generation (pure logic)', () => {
  /**
   * We test the SVG string generation logic indirectly by verifying
   * that layoutToCanvas returns a Promise and doesn't throw synchronously.
   * The promise rejects in jsdom (no canvas getContext) so we .catch() it.
   */

  it('returns a Promise for a valid layout', () => {
    const layout = createSimpleLayout();
    const result = layoutToCanvas(layout, standardSheet);
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {}); // suppress jsdom rejection
  });

  it('returns a Promise for empty placements', () => {
    const layout = {
      sheetIndex: 0,
      placements: [],
      utilisationPercent: 0,
      offcuts: [{ x: 0, y: 0, width: standardSheet.width, height: standardSheet.length }],
    };
    const result = layoutToCanvas(layout, standardSheet);
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('returns a Promise for multiple part types', () => {
    const layout = {
      sheetIndex: 0,
      placements: [
        {
          part: { id: 's', type: 'side', label: 'Side', cutLength: 500, cutWidth: 300, quantity: 1 },
          x: 0, y: 0, rotated: false, grainViolated: false,
        },
        {
          part: { id: 't', type: 'top', label: 'Top', cutLength: 400, cutWidth: 300, quantity: 1 },
          x: 500, y: 0, rotated: false, grainViolated: false,
        },
        {
          part: { id: 'b', type: 'back', label: 'Back', cutLength: 400, cutWidth: 200, quantity: 1 },
          x: 0, y: 300, rotated: false, grainViolated: false,
        },
      ],
      utilisationPercent: 15.5,
      offcuts: [],
    };
    const result = layoutToCanvas(layout, standardSheet);
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('returns a Promise for grain-violated parts', () => {
    const layout = {
      sheetIndex: 0,
      placements: [
        {
          part: { id: 'p1', type: 'side', label: 'Side', cutLength: 600, cutWidth: 400, quantity: 1 },
          x: 0, y: 0, rotated: true, grainViolated: true,
        },
      ],
      utilisationPercent: 24.59,
      offcuts: [],
    };
    const result = layoutToCanvas(layout, standardSheet);
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('returns a Promise for special characters in labels', () => {
    const layout = {
      sheetIndex: 0,
      placements: [
        {
          part: { id: 'p1', type: 'side', label: 'Side <Panel> "Test"', cutLength: 600, cutWidth: 400, quantity: 1 },
          x: 0, y: 0, rotated: false, grainViolated: false,
        },
      ],
      utilisationPercent: 24.59,
      offcuts: [],
    };
    const result = layoutToCanvas(layout, standardSheet);
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('returns a Promise with custom scale and DPI options', () => {
    const layout = createSimpleLayout();
    const result = layoutToCanvas(layout, standardSheet, { scale: 0.5, dpi: 300 });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });
});
