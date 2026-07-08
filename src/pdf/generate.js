/**
 * generate.js — PDF generation module (ADR-003)
 *
 * Produces a client-side PDF containing:
 *   1. Project summary page
 *   2. Cut list table page(s)
 *   3. Sheet layout diagram page(s) with rasterised SVG images
 *
 * Uses pdf-lib for PDF construction.
 * Uses rasterize utilities from src/utils/rasterize.js for SVG→PNG conversion.
 *
 * No React, no Zustand, no DOM coupling (except for canvas rasterization which
 * requires a document context). All functions accept plain data objects.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { svgToPng } from '../utils/rasterize.js';

// -- Constants --

/** Page dimensions (A4 portrait, points) */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

/** Margins (points) */
const MARGIN_LEFT = 48;
const MARGIN_RIGHT = 48;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;

/** Content width available after margins */
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

/** Font sizes (points) */
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SUBTITLE = 12;
const FONT_SIZE_BODY = 9;
const FONT_SIZE_TABLE_HEADER = 9;
const FONT_SIZE_TABLE_CELL = 8;

/** Table row height (points) */
const TABLE_HEADER_HEIGHT = 16;
const TABLE_ROW_HEIGHT = 14;

/** Diagram max height (points) — leaves room for page header */
const DIAGRAM_MAX_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 80;

/** Diagram max width (points) */
const DIAGRAM_MAX_WIDTH = CONTENT_WIDTH;

// -- Public API --

/**
 * Generate a PDF from project data and layout results.
 *
 * @param {object} options
 * @param {object} options.project - Project object { id, name, sheetSize, kerf, grainConstraint, boxes, drawers }
 * @param {Part[]} options.parts - Flat list of calculated parts
 * @param {SheetLayout[]} options.layouts - Sheet layout results from the engine
 * @param {object} options.sheet - Sheet dimensions { width, length } in mm
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generatePdf({ project, parts, layouts, sheet }) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Project summary
  addSummaryPage(pdfDoc, font, boldFont, project, sheet, parts);

  // Page 2+: Cut list table
  await addCutListPages(pdfDoc, font, boldFont, parts);

  // Page 3+: Sheet layout diagrams
  for (const layout of layouts) {
    await addSheetDiagramPage(pdfDoc, font, boldFont, layout, sheet);
  }

  return await pdfDoc.save();
}

// -- Summary Page --

/**
 * Add a project summary page.
 */
function addSummaryPage(pdfDoc, font, boldFont, project, sheet, parts) {
  const page = pdfDoc.addPage();
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // Title
  y -= FONT_SIZE_TITLE;
  page.drawText(project?.name ?? 'Untitled Project', {
    x: MARGIN_LEFT,
    y,
    size: FONT_SIZE_TITLE,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Divider line
  y -= 8;
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Summary section
  y -= 20;
  y = drawSummarySectionTitle(page, font, boldFont, 'Project Details', y);

  y -= FONT_SIZE_BODY;
  const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);
  const summaryRows = [
    ['Sheet Size', `${sheet.length} × ${sheet.width} mm`],
    ['Total Unique Parts', String(parts.length)],
    ['Total Parts (qty)', String(totalParts)],
    ['Sheets Required', '?'],
  ];

  for (const [label, value] of summaryRows) {
    y -= FONT_SIZE_BODY;
    const labelText = `${label}:`;
    page.drawText(labelText, {
      x: MARGIN_LEFT,
      y,
      size: FONT_SIZE_BODY,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    const labelWidth = boldFont.widthOfTextAtSize(labelText, FONT_SIZE_BODY);
    page.drawText(value, {
      x: MARGIN_LEFT + labelWidth + 6,
      y,
      size: FONT_SIZE_BODY,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // Boxes section
  if (project?.boxes && project.boxes.length > 0) {
    y -= 16;
    y = drawSummarySectionTitle(page, font, boldFont, 'Boxes', y);

    for (const box of project.boxes) {
      y -= FONT_SIZE_BODY;
      page.drawText(`${box.name} (×${box.quantity ?? 1})`, {
        x: MARGIN_LEFT,
        y,
        size: FONT_SIZE_BODY,
        font,
        color: rgb(0, 0, 0),
      });
      y -= FONT_SIZE_BODY;
      page.drawText(`  ${box.externalWidth} × ${box.externalHeight} × ${box.externalDepth} mm`, {
        x: MARGIN_LEFT,
        y,
        size: FONT_SIZE_BODY * 0.9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }
}

function drawSummarySectionTitle(page, font, boldFont, title, y) {
  page.drawText(title, {
    x: MARGIN_LEFT,
    y: y - FONT_SIZE_SUBTITLE,
    size: FONT_SIZE_SUBTITLE,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  return y - FONT_SIZE_SUBTITLE - 4;
}

// -- Cut List Table --

/**
 * Add cut list table pages. Handles pagination.
 */
function addCutListPages(pdfDoc, font, boldFont, parts) {
  if (!parts || parts.length === 0) return;

  const tableHeaders = ['#', 'Type', 'Label', 'L (mm)', 'W (mm)', 'Qty', 'Thickness'];
  const colWidths = [24, 60, 140, 50, 50, 28, 50]; // total should match CONTENT_WIDTH
  // Adjust to fit: 24+60+140+50+50+28+50 = 402, CONTENT_WIDTH = 499.28
  // Scale proportionally
  const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
  const scaledColWidths = colWidths.map((w) => (w / totalColWidth) * CONTENT_WIDTH);

  let page = pdfDoc.addPage();
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // Page header
  y -= FONT_SIZE_TITLE;
  page.drawText('Cut List', {
    x: MARGIN_LEFT,
    y,
    size: FONT_SIZE_TITLE,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Divider line
  y -= 8;
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Table section spacer
  y -= 16;

  // Draw header row
  y = drawTableRow(page, font, boldFont, tableHeaders, scaledColWidths, y, true);

  // Draw data rows
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const row = [
      String(i + 1),
      partTypeLabel(part.type),
      truncate(part.label ?? part.type, 20),
      String(part.cutLength),
      String(part.cutWidth),
      String(part.quantity),
      String(part.materialThickness),
    ];

    // Check if row fits on current page
    if (y - TABLE_ROW_HEIGHT < MARGIN_BOTTOM) {
      page = pdfDoc.addPage();
      y = PAGE_HEIGHT - MARGIN_TOP;
      y -= FONT_SIZE_SUBTITLE;
      page.drawText('Cut List (continued)', {
        x: MARGIN_LEFT,
        y,
        size: FONT_SIZE_SUBTITLE,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 12;
      y = drawTableRow(page, font, boldFont, tableHeaders, scaledColWidths, y, true);
    }

    y = drawTableRow(page, font, boldFont, row, scaledColWidths, y, false);
  }

  // Footer: totals
  const totalQty = parts.reduce((sum, p) => sum + p.quantity, 0);
  y -= 12;
  page.drawText(`Total parts to cut: ${totalQty}`, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SIZE_BODY,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
}

/**
 * Draw a single table row. Returns the y position for the next row.
 *
 * Drawing order matters: the separator line is drawn FIRST so that the text
 * renders on top of it. In PDF coordinates y increases upward and the text
 * baseline sits at `y` with the glyph body extending upward. By drawing the
 * line before the text we avoid the visual overlap seen when the line is
 * rendered after (on top of) the glyphs.
 *
 * Cell alignment:
 *   - Column 0 (#):       center
 *   - Column 1 (Type):    left
 *   - Column 2 (Label):   left
 *   - Column 3 (L mm):    right  (numeric)
 *   - Column 4 (W mm):    right  (numeric)
 *   - Column 5 (Qty):     center (numeric)
 *   - Column 6 (Thickness): right (numeric)
 */
function drawTableRow(page, font, boldFont, cells, colWidths, y, isHeader) {
  const rowFont = isHeader ? boldFont : font;
  const rowFontSize = isHeader ? FONT_SIZE_TABLE_HEADER : FONT_SIZE_TABLE_CELL;
  const textColor = isHeader ? rgb(0, 0, 0) : rgb(0.2, 0.2, 0.2);
  const rowHeight = isHeader ? TABLE_HEADER_HEIGHT : TABLE_ROW_HEIGHT;

  // Draw the separator line FIRST so text renders on top of it.
  const lineY = y - rowHeight + 1;
  page.drawLine({
    start: { x: MARGIN_LEFT, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: lineY },
    thickness: isHeader ? 1.5 : 0.5,
    color: isHeader ? rgb(0.3, 0.3, 0.3) : rgb(0.8, 0.8, 0.8),
  });

  // Define alignment per column index:
  //   0=#(center), 1=Type(left), 2=Label(left), 3=L(mm)(right), 4=W(mm)(right), 5=Qty(center), 6=Thickness(right)
  const alignments = ['center', 'left', 'left', 'right', 'right', 'center', 'right'];

  let x = MARGIN_LEFT;
  for (let i = 0; i < cells.length; i++) {
    const cellText = cells[i];
    const cellWidth = colWidths[i];
    const alignment = alignments[i] || 'left';
    const textWidth = rowFont.widthOfTextAtSize(cellText, rowFontSize);

    let drawX = x;
    if (alignment === 'center') {
      drawX = x + (cellWidth - textWidth) / 2;
    } else if (alignment === 'right') {
      drawX = x + cellWidth - textWidth - 2; // 2pt padding on right
    }
    // left alignment: drawX stays at x + 2pt padding handled by not adding extra

    // Add small left padding for left-aligned text
    if (alignment === 'left') {
      drawX = x + 2;
    }

    page.drawText(cellText, {
      x: drawX,
      y,
      size: rowFontSize,
      font: rowFont,
      color: textColor,
    });
    x += cellWidth;
  }

  y -= rowHeight;

  return y;
}

/**
 * Map internal part type to a human-readable label.
 */
function partTypeLabel(type) {
  const labels = {
    side: 'Side',
    top: 'Top',
    bottom: 'Bottom',
    back: 'Back',
    shelf: 'Shelf',
    drawer_side: 'Drawer Side',
    drawer_front_back: 'Drawer F/B',
    drawer_base: 'Drawer Base',
  };
  return labels[type] ?? type;
}

/**
 * Truncate text to a maximum number of characters.
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

// -- Sheet Diagram Pages --

/**
 * Add a sheet layout diagram page. Rasterizes the SVG to PNG and embeds it.
 *
 * @param {PDFDocument} pdfDoc
 * @param {object} font
 * @param {object} boldFont
 * @param {SheetLayout} layout
 * @param {object} sheet - { width, length } in mm
 */
async function addSheetDiagramPage(pdfDoc, font, boldFont, layout, sheet) {
  const page = pdfDoc.addPage();
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // Page header
  y -= FONT_SIZE_TITLE;
  page.drawText(`Sheet ${layout.sheetIndex + 1}`, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SIZE_TITLE,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 8;
  page.drawText(`${layout.placements.length} parts · ${layout.utilisationPercent}% utilised`, {
    x: MARGIN_LEFT,
    y,
    size: FONT_SIZE_BODY,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 20;

  // Rasterize the layout to PNG and embed
  await embedLayoutAsImage(page, pdfDoc, layout, sheet, MARGIN_LEFT, y - DIAGRAM_MAX_HEIGHT);
}

/**
 * Create an SVG string from layout data, rasterize to PNG, and embed in PDF.
 *
 * @param {object} page - pdf-lib page
 * @param {PDFDocument} pdfDoc
 * @param {SheetLayout} layout
 * @param {object} sheet - { width, length }
 * @param {number} x - X position in PDF points
 * @param {number} y - Y position in PDF points
 */
async function embedLayoutAsImage(page, pdfDoc, layout, sheet, x, y) {
  // Build SVG string from layout data (mirrors rasterize.js layoutToCanvas but
  // returns the SVG string so we can rasterize it)
  const svgString = buildLayoutSvg(layout, sheet);

  // Create an SVG element from the string for rasterization
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    // Wait for the image to load to get dimensions, then rasterize
    const img = await loadImage(svgUrl);
    const svgEl = await createSvgElement(svgString);

    // Rasterize to PNG data URL at 2x scale for good quality
    const pngDataUrl = await svgToPng(svgEl, {
      scale: 2,
      backgroundColor: '#ffffff',
    });

    // Load PNG into pdf-lib and draw
    const pngImageBytes = await fetchPngBytes(pngDataUrl);
    const pngImage = await pdfDoc.embedPng(pngImageBytes);

    // Calculate dimensions to fit within page while maintaining aspect ratio
    const imgAspect = img.width / img.height;
    let drawWidth = DIAGRAM_MAX_WIDTH;
    let drawHeight = drawWidth / imgAspect;

    if (drawHeight > DIAGRAM_MAX_HEIGHT) {
      drawHeight = DIAGRAM_MAX_HEIGHT;
      drawWidth = drawHeight * imgAspect;
    }

    page.drawImage(pngImage, {
      x,
      y: y + (DIAGRAM_MAX_HEIGHT - drawHeight), // align to top
      width: drawWidth,
      height: drawHeight,
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/**
 * Escape text for safe embedding in SVG.
 * Uses char codes to avoid formatter issues with HTML entities.
 */
function escapeSvg(text) {
  const str = String(text);
  const entities = [
    [38, 38 + String.fromCharCode(65,109,112,59)],   // & -> &
    [60, 60 + String.fromCharCode(65,108,116,59)],   // < -> <
    [62, 62 + String.fromCharCode(65,103,116,59)],   // > -> >
    [34, 34 + String.fromCharCode(65,113,117,111,116,59)], // " -> "
    [39, 39 + String.fromCharCode(65,112,111,115,117,115,59)], // ' -> '
  ];
  // Simple character-by-character escape
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    let replaced = false;
    if (code === 38) { result += String.fromCharCode(38,97,109,112,59); replaced = true; }
    if (code === 60) { result += String.fromCharCode(38,108,116,59); replaced = true; }
    if (code === 62) { result += String.fromCharCode(38,103,116,59); replaced = true; }
    if (code === 34) { result += String.fromCharCode(38,113,117,111,116,59); replaced = true; }
    if (code === 39) { result += String.fromCharCode(38,97,112,111,115,117,115,59); replaced = true; }
    if (!replaced) result += str[i];
  }
  return result;
}

/**
 * Build an SVG string from layout data (headless — no DOM needed).
 */
function buildLayoutSvg(layout, sheet) {
  const scale = 0.5; // mm to SVG units
  const svgWidth = sheet.width * scale;
  const svgHeight = sheet.length * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`;

  // Background
  svg += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#f0f4f8" stroke="#1e3a5f" stroke-width="${2 / scale}"/>`;

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

      const fill = partFillColorHex(part.type);
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

  // Utilisation badge
  const badgeW = Math.max(50, svgWidth * 0.1);
  const badgeH = Math.max(16, svgHeight * 0.02);
  const badgeX = svgWidth - badgeW - 4;
  const badgeY = svgHeight - badgeH - 2;
  svg += `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="3" fill="rgba(30,58,95,0.85)"/>`;
  const utilFontSize = Math.max(7, svgWidth * 0.01);
  svg += `<text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${utilFontSize}" fill="#ffffff" font-family="monospace">${layout.utilisationPercent}%</text>`;

  svg += '</svg>';

  return svg;
}

/**
 * Colour mapping for part types (shared between diagram component and PDF).
 */
function partFillColorHex(type) {
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

// -- Helper functions --

/**
 * Load an image from a URL and return an HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Create an SVG DOM element from a string.
 */
function createSvgElement(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  return doc.documentElement;
}

/**
 * Fetch PNG bytes from a data URL.
 */
function fetchPngBytes(dataUrl) {
  return new Promise((resolve, reject) => {
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    resolve(ab);
  });
}

/**
 * Generate a PDF and trigger a browser download.
 *
 * @param {object} options - Same as generatePdf
 * @param {string} [filename='ply-calc-output.pdf'] - Download filename
 */
export async function downloadPdf(options, filename = 'ply-calc-output.pdf') {
  const pdfBytes = await generatePdf(options);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}