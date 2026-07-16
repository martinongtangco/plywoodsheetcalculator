/**
 * rasterize.js — SVG-to-canvas rasterization utility
 *
 * Provides functions to convert SVG diagram elements to PNG images
 * for embedding in PDF exports (per ADR-003, ADR-004).
 *
 * Pipeline:
 *   1. Serialize SVG element to a string
 *   2. Create an offscreen canvas at the desired resolution
 *   3. Draw the SVG onto the canvas via an Image object
 *   4. Export the canvas as a PNG blob/data URL
 *
 * All functions are pure utilities — no React, no Zustand, no store coupling.
 */

import { escapeSvg } from './escape.js';

/**
 * Serialize an SVG DOM element to a string.
 *
 * @param {SVGSVGElement} svgElement - The SVG element to serialize
 * @returns {string} The serialized SVG string
 */
export function svgElementToString(svgElement) {
  if (!svgElement || svgElement.tagName !== 'svg') {
    throw new TypeError('Expected an SVG element');
  }

  // Clone to avoid mutating the original
  const clone = svgElement.cloneNode(true);

  // Ensure viewBox is set (required for proper scaling when drawn to canvas)
  if (!clone.getAttribute('viewBox') && clone.getAttribute('width') && clone.getAttribute('height')) {
    clone.setAttribute('viewBox', `0 0 ${clone.getAttribute('width')} ${clone.getAttribute('height')}`);
  }

  // Add XML declaration for proper parsing
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

/**
 * Convert an SVG string to a data URL.
 *
 * @param {string} svgString - The SVG content as a string
 * @returns {string} A data URL that can be used as an image source
 */
export function svgToDataUrl(svgString) {
  // Encode the SVG for use in a data URL
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Create an offscreen canvas at the given dimensions.
 *
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @returns {HTMLCanvasElement} The created canvas element
 */
export function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draw an SVG onto a canvas and return the canvas.
 *
 * @param {string} svgString - The SVG content as a string
 * @param {number} width - Output canvas width in pixels
 * @param {number} height - Output canvas height in pixels
 * @param {object} [options] - Optional configuration
 * @param {string} [options.backgroundColor='#ffffff'] - Background color
 * @param {number} [options.dpr=1] - Device pixel ratio for high-DPI displays
 * @returns {Promise<HTMLCanvasElement>} A promise that resolves with the canvas
 */
export function drawSvgToCanvas(svgString, width, height, options = {}) {
  const {
    backgroundColor = '#ffffff',
    dpr = 1,
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = createOffscreenCanvas(width * dpr, height * dpr);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Unable to get 2D canvas context'));
      return;
    }

    // Scale for high-DPI displays
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Create image from SVG data URL
    const dataUrl = svgToDataUrl(svgString);
    const img = new Image();

    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG image for rasterization'));
    };

    img.src = dataUrl;
  });
}

/**
 * Rasterize an SVG element to a PNG data URL.
 *
 * This is the main convenience function for PDF export:
 * 1. Serialize the SVG element
 * 2. Draw to an offscreen canvas
 * 3. Export as PNG data URL
 *
 * @param {SVGSVGElement} svgElement - The SVG element to rasterize
 * @param {object} [options] - Optional configuration
 * @param {number} [options.scale=2] - Scale factor (2x for good PDF quality)
 * @param {string} [options.backgroundColor='#ffffff'] - Background color
 * @param {number} [options.dpr=1] - Device pixel ratio
 * @returns {Promise<string>} A promise that resolves with the PNG data URL
 */
export function svgToPng(svgElement, options = {}) {
  const {
    scale = 2,
    backgroundColor = '#ffffff',
    dpr = 1,
  } = options;

  // Get the SVG dimensions from viewBox
  const viewBox = svgElement.getAttribute('viewBox');
  if (!viewBox) {
    throw new Error('SVG element must have a viewBox attribute');
  }

  const [, , svgWidth, svgHeight] = viewBox.split(' ').map(Number);

  if (isNaN(svgWidth) || isNaN(svgHeight)) {
    throw new Error(`Invalid viewBox: ${viewBox}`);
  }

  const canvasWidth = svgWidth * scale;
  const canvasHeight = svgHeight * scale;

  const svgString = svgElementToString(svgElement);

  return drawSvgToCanvas(svgString, canvasWidth, canvasHeight, {
    backgroundColor,
    dpr,
  }).then((canvas) => {
    return canvas.toDataURL('image/png');
  });
}

/**
 * Rasterize an SVG element to a PNG Blob.
 *
 * @param {SVGSVGElement} svgElement - The SVG element to rasterize
 * @param {object} [options] - Optional configuration
 * @param {number} [options.scale=2] - Scale factor
 * @param {string} [options.backgroundColor='#ffffff'] - Background color
 * @param {number} [options.dpr=1] - Device pixel ratio
 * @returns {Promise<Blob>} A promise that resolves with the PNG blob
 */
export function svgToPngBlob(svgElement, options = {}) {
  return svgToPng(svgElement, options).then((dataUrl) => {
    // Convert data URL to Blob
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  });
}

/**
 * Rasterize a sheet layout diagram to PNG using layout data directly.
 *
 * This function creates an SVG string from layout data and rasterizes it
 * without needing a DOM element. Useful for server-side rendering or
 * headless PDF generation.
 *
 * @param {object} layout - SheetLayout object
 * @param {object} sheet - { width, length } in mm
 * @param {object} [options] - Optional configuration
 * @param {number} [options.scale=0.2] - Scale from mm to SVG units
 * @param {number} [options.dpi=150] - Output DPI for rasterization
 * @param {string} [options.backgroundColor='#ffffff'] - Background color
 * @returns {Promise<HTMLCanvasElement>} A promise that resolves with the canvas
 */
export function layoutToCanvas(layout, sheet, options = {}) {
  const {
    scale = 0.2,
    dpi = 150,
    backgroundColor = '#ffffff',
  } = options;

  // Build SVG string manually from layout data
  const svgWidth = sheet.width * scale;
  const svgHeight = sheet.length * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`;

  // Background
  svg += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${backgroundColor}" stroke="#1e3a5f" stroke-width="${2 / scale}"/>`;

  // Offcuts
  if (layout.offcuts) {
    for (const offcut of layout.offcuts) {
      svg += `<rect x="${offcut.x * scale}" y="${offcut.y * scale}" width="${offcut.width * scale}" height="${offcut.height * scale}" fill="#e2e8f0"/>`;
    }
  }

  // Parts
  if (layout.placements) {
    for (const placement of layout.placements) {
      const part = placement.part;
      const placedLength = placement.rotated ? part.cutWidth : part.cutLength;
      const placedWidth = placement.rotated ? part.cutLength : part.cutWidth;

      const px = placement.x * scale;
      const py = placement.y * scale;
      const pw = placedLength * scale;
      const ph = placedWidth * scale;

      const fill = partFillColor(part.type);
      const stroke = placement.grainViolated ? '#dc2626' : '#1e3a5f';

      svg += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${fill}" stroke="${stroke}" stroke-width="${1 / scale}"/>`;

       // Label
       const fontSize = Math.max(6, Math.min(pw, ph) * 0.15);
       if (pw > fontSize * 3 && ph > fontSize * 1.4) {
         const label = escapeSvg(part.label || part.type);
         svg += `<text x="${px + pw / 2}" y="${py + ph / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="rgba(0,0,0,0.7)" font-family="sans-serif">${label}</text>`;
      }
    }
  }

  // Sheet dimensions
  const dimFontSize = Math.max(8, svgWidth * 0.012);
  svg += `<text x="${svgWidth / 2}" y="${dimFontSize}" text-anchor="middle" font-size="${dimFontSize}" fill="#475569" font-family="monospace">${sheet.width} mm</text>`;

  // Utilisation
  const badgeW = Math.max(50, svgWidth * 0.1);
  const badgeH = Math.max(16, svgHeight * 0.02);
  const badgeX = svgWidth - badgeW - 4;
  const badgeY = svgHeight - badgeH - 2;
  svg += `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="3" fill="rgba(30,58,95,0.85)"/>`;
  const utilFontSize = Math.max(7, svgWidth * 0.01);
  svg += `<text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${utilFontSize}" fill="#ffffff" font-family="monospace">${layout.utilisationPercent}%</text>`;

  svg += '</svg>';

  // Calculate canvas size from DPI
  const dpr = dpi / 72;
  const canvasWidth = Math.round(svgWidth * dpr);
  const canvasHeight = Math.round(svgHeight * dpr);

  return drawSvgToCanvas(svg, canvasWidth, canvasHeight, {
    backgroundColor,
    dpr,
  });
}

/**
 * Colour mapping for part types (shared between component and rasterizer).
 */
function partFillColor(type) {
  const colours = {
    side: '#93c5fd',
    top: '#86efac',
    bottom: '#fdba74',
    back: '#d8b4fe',
    shelf: '#fca5a5',
    drawer_side: '#6ee7b7',
    drawer_front_back: '#fcd34d',
    drawer_base: '#c4b5fd',
  };
  return colours[type] ?? '#93c5fd';
}