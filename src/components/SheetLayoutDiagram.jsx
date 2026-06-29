/**
 * SheetLayoutDiagram.jsx — SVG-based 2D sheet layout rendering
 *
 * Renders a single sheet layout as an accessible inline SVG diagram.
 * Accepts plain data props (placements, sheet dimensions) — no store coupling.
 *
 * Props:
 *   - layout: SheetLayout object { sheetIndex, placements, utilisationPercent, offcuts }
 *   - sheet: { width, length } in mm
 *   - scale: optional number to override auto-scaling
 *   - showOffcuts: whether to render offcut regions (default true)
 *   - showLabels: whether to render part labels (default true)
 *   - showGrainArrows: whether to render grain direction arrows (default true)
 *   - className: additional CSS classes on the wrapper
 *   - style: inline styles on the wrapper
 */

import { useMemo } from 'react';

/**
 * Determine the SVG viewBox and scaled coordinates for a layout.
 */
function useLayoutMetrics(layout, sheet, scale) {
  return useMemo(() => {
    if (scale) {
      // User-provided scale: mm to SVG units
      return {
        viewBoxWidth: sheet.width * scale,
        viewBoxHeight: sheet.length * scale,
        toSvgX: (x) => x * scale,
        toSvgY: (y) => y * scale,
        toSvgW: (w) => w * scale,
        toSvgH: (h) => h * scale,
      };
    }

    // Auto-scale so the sheet fits nicely.
    // We pick a target width in SVG units and compute the scale from that.
    const targetSvgWidth = 800;
    const computedScale = targetSvgWidth / sheet.width;

    return {
      viewBoxWidth: sheet.width * computedScale,
      viewBoxHeight: sheet.length * computedScale,
      toSvgX: (x) => x * computedScale,
      toSvgY: (y) => y * computedScale,
      toSvgW: (w) => w * computedScale,
      toSvgH: (h) => h * computedScale,
    };
  }, [layout, sheet, scale]);
}

/**
 * Determine the font size for a part label based on the scaled rectangle size.
 */
function labelFontSize(svgW, svgH) {
  const minDim = Math.min(svgW, svgH);
  if (minDim < 20) return 0; // too small to render
  if (minDim < 40) return 8;
  if (minDim < 80) return 10;
  if (minDim < 150) return 12;
  return 14;
}

/**
 * Check if text can fit inside the rectangle.
 */
function canFitText(svgW, svgH, fontSize) {
  if (fontSize === 0) return false;
  // Rough estimate: text width ≈ fontSize * charCount * 0.6
  return svgW > fontSize * 3 && svgH > fontSize * 1.4;
}

/**
 * Generate a unique accessible ID prefix for this diagram instance.
 */
let diagramCounter = 0;
function useDiagramId() {
  // Simple counter-based ID — sufficient for SPA usage
  diagramCounter++;
  return `sheet-diagram-${diagramCounter}`;
}

/**
 * Render part label lines — splits label into multiple lines if needed.
 */
function renderLabelLines(label, svgX, svgY, svgW, svgH, fontSize, maxWidthChars) {
  if (fontSize === 0 || !canFitText(svgW, svgH, fontSize)) return null;

  // Split long labels into two lines at the first " — " or truncate
  let lines = [label];
  if (label.includes(' — ')) {
    const [first, ...rest] = label.split(' — ');
    lines = [first, rest.join(' — ')];
  }

  // If a single line is too long, truncate
  const maxChars = maxWidthChars || Math.floor(svgW / (fontSize * 0.6));
  lines = lines.map((line) => {
    if (line.length > maxChars && maxChars > 3) {
      return line.slice(0, maxChars - 1) + '…';
    }
    return line;
  });

  const lineHeight = fontSize * 1.2;
  const totalH = lineHeight * lines.length;
  const startY = svgY + (svgH - totalH) / 2 + lineHeight;

  return lines.map((line, i) => (
    <text
      key={i}
      x={svgX + svgW / 2}
      y={startY - (lines.length - 1 - i) * lineHeight}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={fontSize}
      fill="rgba(0,0,0,0.7)"
      fontFamily="sans-serif"
      pointerEvents="none"
    >
      {line}
    </text>
  ));
}

/**
 * Get the fill colour for a part based on its type.
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

/**
 * Get the stroke colour for grain-violated parts.
 */
function partStrokeColor(grainViolated) {
  return grainViolated ? '#dc2626' : '#1e3a5f';
}

export function SheetLayoutDiagram({
  layout,
  sheet,
  scale,
  showOffcuts = true,
  showLabels = true,
  showGrainArrows = true,
  className = '',
  style,
}) {
  if (!layout || !sheet) return null;

  const { viewBoxWidth, viewBoxHeight, toSvgX, toSvgY, toSvgW, toSvgH } =
    useLayoutMetrics(layout, sheet);

  const id = useDiagramId();

  // Grain direction arrow dimensions
  const arrowMargin = Math.min(20, viewBoxHeight * 0.02);
  const arrowHeight = Math.min(40, viewBoxHeight * 0.05);
  const arrowWidth = 8;

  return (
    <div
      className={`sheet-layout-diagram ${className}`}
      style={style}
      role="figure"
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Sheet ${layout.sheetIndex + 1} layout — ${layout.placements.length} parts, ${layout.utilisationPercent}% utilised`}
        style={{ width: '100%', height: 'auto' }}
      >
        <title>{`Sheet ${layout.sheetIndex + 1} — ${layout.placements.length} parts placed`}</title>
        <desc>
          {`Sheet ${layout.sheetIndex + 1} of ${sheet.width}mm × ${sheet.length}mm. `}
          {`${layout.placements.length} parts placed with ${layout.utilisationPercent}% utilisation.`
}
        </desc>

        {/* Sheet background */}
        <rect
          x={0}
          y={0}
          width={viewBoxWidth}
          height={viewBoxHeight}
          fill="#f0f4f8"
          stroke="#1e3a5f"
          strokeWidth={2 / (viewBoxWidth / sheet.width)}
        />

        {/* Grain direction indicator */}
        {showGrainArrows && (
          <g
            aria-hidden="true"
            transform={`translate(${arrowMargin}, ${arrowMargin})`}
          >
            <line
              x1={0}
              y1={arrowHeight / 2}
              x2={arrowWidth * 2}
              y2={arrowHeight / 2}
              stroke="#64748b"
              strokeWidth={Math.max(1, arrowWidth * 0.2)}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={arrowWidth * 2.5}
              y={arrowHeight / 2 + 3}
              fontSize={Math.max(8, arrowHeight * 0.5)}
              fill="#64748b"
              fontFamily="sans-serif"
            >
              Grain →
            </text>
          </g>
        )}

        {/* Arrowhead marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={arrowWidth}
            markerHeight={arrowHeight * 0.5}
            refX={arrowWidth}
            refY={arrowHeight * 0.25}
            orient="auto"
          >
            <polygon
              points={`0,0 ${arrowWidth},${arrowHeight * 0.25} 0,${arrowHeight * 0.5}`}
              fill="#64748b"
            />
          </marker>
        </defs>

        {/* Offcut regions */}
        {showOffcuts &&
          layout.offcuts?.map((offcut, idx) => {
            const ox = toSvgX(offcut.x);
            const oy = toSvgY(offcut.y);
            const ow = toSvgW(offcut.width);
            const oh = toSvgH(offcut.height);
            return (
              <rect
                key={`offcut-${idx}`}
                x={ox}
                y={oy}
                width={ow}
                height={oh}
                fill="#e2e8f0"
                stroke="none"
                aria-hidden="true"
              />
            );
          })}

        {/* Part placements */}
        {layout.placements.map((placement, idx) => {
          const part = placement.part;
          const placedLength = placement.rotated ? part.cutWidth : part.cutLength;
          const placedWidth = placement.rotated ? part.cutLength : part.cutWidth;

          const px = toSvgX(placement.x);
          const py = toSvgY(placement.y);
          const pw = toSvgW(placedLength);
          const ph = toSvgH(placedWidth);

          const fs = labelFontSize(pw, ph);
          const strokeW = Math.max(1, 2 / (viewBoxWidth / sheet.width));

          return (
            <g key={`part-${idx}`}>
              {/* Part rectangle */}
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={partFillColor(part.type)}
                stroke={partStrokeColor(placement.grainViolated)}
                strokeWidth={strokeW}
                role="img"
                aria-label={`${part.label}: ${placedLength}mm × ${placedWidth}mm${placement.grainViolated ? ', grain violated' : ''}${placement.rotated ? ', rotated' : ''}`}
              />

              {/* Part label */}
              {showLabels &&
                renderLabelLines(
                  part.label || `${part.type} ${idx + 1}`,
                  px,
                  py,
                  pw,
                  ph,
                  fs
                )}

              {/* Dimensions label (smaller, below name) */}
              {showLabels && fs > 0 && canFitText(pw, ph, fs * 0.8) && (
                <text
                  x={px + pw / 2}
                  y={py + ph - fs * 0.5}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={fs * 0.8}
                  fill="rgba(0,0,0,0.5)"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {`${placedLength}×${placedWidth}`}
                </text>
              )}
            </g>
          );
        })}

        {/* Sheet dimensions annotation */}
        <g aria-hidden="true">
          {/* Width annotation (top) */}
          <text
            x={viewBoxWidth / 2}
            y={Math.max(12, arrowMargin + arrowHeight + 10)}
            textAnchor="middle"
            fontSize={Math.max(9, viewBoxWidth * 0.012)}
            fill="#475569"
            fontFamily="monospace"
          >
            {sheet.width} mm
          </text>

          {/* Length annotation (left side, rotated) */}
          <text
            x={-viewBoxHeight / 2}
            y={Math.max(10, arrowMargin - 4)}
            textAnchor="middle"
            fontSize={Math.max(9, viewBoxWidth * 0.012)}
            fill="#475569"
            fontFamily="monospace"
            transform={`rotate(-90, ${-viewBoxHeight / 2}, ${Math.max(10, arrowMargin - 4)})`}
          >
            {sheet.length} mm
          </text>
        </g>

        {/* Utilisation badge */}
        <g aria-hidden="true">
          <rect
            x={viewBoxWidth - Math.max(60, viewBoxWidth * 0.1) - 8}
            y={viewBoxHeight - Math.max(20, viewBoxHeight * 0.02) - 4}
            width={Math.max(60, viewBoxWidth * 0.1)}
            height={Math.max(20, viewBoxHeight * 0.02)}
            rx={4}
            fill="rgba(30,58,95,0.85)"
          />
          <text
            x={viewBoxWidth - Math.max(60, viewBoxWidth * 0.1) - 8 + (Math.max(60, viewBoxWidth * 0.1)) / 2}
            y={viewBoxHeight - Math.max(20, viewBoxHeight * 0.02) - 4 + (Math.max(20, viewBoxHeight * 0.02)) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(9, viewBoxWidth * 0.012)}
            fill="#ffffff"
            fontFamily="monospace"
          >
            {layout.utilisationPercent}%
          </text>
        </g>
      </svg>
    </div>
  );
}

/**
 * SheetLayouts — renders multiple sheet diagrams with navigation.
 */
export function SheetLayouts({
  layouts,
  sheet,
  scale,
  showOffcuts = true,
  showLabels = true,
  showGrainArrows = true,
  className = '',
}) {
  if (!layouts || layouts.length === 0) {
    return (
      <div className={`sheet-layouts-empty ${className}`}>
        <p>No sheet layouts to display. Add parts and run the layout algorithm.</p>
      </div>
    );
  }

  return (
    <div className={`sheet-layouts ${className}`} role="list" aria-label="Sheet layouts">
      {/* Summary */}
      <div className="sheet-layouts-summary mb-4">
        <p className="text-sm text-gray-600">
          {layouts.length} sheet{layouts.length !== 1 ? 's' : ''} required
        </p>
      </div>

      {layouts.map((layout) => (
        <div
          key={layout.sheetIndex}
          role="listitem"
          className="sheet-layouts-item mb-6 border rounded-lg p-4 bg-white"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Sheet {layout.sheetIndex + 1} — {layout.placements.length} parts
          </h3>
          <SheetLayoutDiagram
            layout={layout}
            sheet={sheet}
            scale={scale}
            showOffcuts={showOffcuts}
            showLabels={showLabels}
            showGrainArrows={showGrainArrows}
          />
        </div>
      ))}
    </div>
  );
}

export default SheetLayoutDiagram;