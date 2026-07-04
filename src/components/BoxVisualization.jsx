/**
 * BoxVisualization.jsx — SVG-based box preview
 *
 * Renders:
 *  1. An isometric "3D" preview of the box
 *  2. Three orthographic views (Front, Side, Top) with dimension lines
 *
 * Pure presentation component — no store coupling.
 *
 * Props:
 *   - box: Box object { externalWidth, externalHeight, externalDepth, name }
 *   - thicknesses: { side, top, bottom, back } in mm
 *   - className: additional CSS classes on the wrapper
 *   - style: inline styles on the wrapper
 */

import { useMemo } from 'react';

/* ───────────────────────────────────────────
   Isometric 3D helpers
   ─────────────────────────────────────────── */

// Dimetric projection angle (≈18.4°). Shared by isoProject and the layout
// metrics below — the layout math has to reproduce this exact projection to
// know where the drawing's edges actually land, so it must never drift out
// of sync with the constants isoProject uses.
const ISO_ANGLE = Math.atan2(1, 3);
const ISO_COS = Math.cos(ISO_ANGLE); // ≈0.949 — horizontal shift per depth unit
const ISO_SIN = Math.sin(ISO_ANGLE); // ≈0.316 — vertical shift per depth unit

/**
 * Isometric projection: 3D point → 2D screen point.
 * Uses a standard dimetric projection (≈18.4° angles). Height (y3) increases
 * upward in 3D space, so it must *decrease* sy (SVG y grows downward) — and
 * depth (z3) recedes up-and-to-the-right, the conventional orientation for
 * this kind of technical box drawing.
 */
function isoProject(x3, y3, z3, originX, originY, scale) {
  const sx = originX + (x3 + z3 * ISO_COS) * scale;
  const sy = originY - (y3 + z3 * ISO_SIN) * scale;
  return [sx, sy];
}

/**
 * Build the visible faces of a box in isometric projection.
 * Returns arrays of SVG points for front, top, and right faces, plus the
 * edge list split into visible (solid) and hidden (dashed) segments.
 */
function isoBoxFaces(W, H, D, ox, oy, s) {
  // 8 corners of the box (x=width, y=height, z=depth).
  // Origin (index 0) is the bottom-front-left corner — the box's floor line.
  const p = [
    [0, 0, 0],   // 0: bottom-front-left
    [W, 0, 0],   // 1: bottom-front-right
    [W, H, 0],   // 2: top-front-right
    [0, H, 0],   // 3: top-front-left
    [0, 0, D],   // 4: bottom-back-left
    [W, 0, D],   // 5: bottom-back-right
    [W, H, D],   // 6: top-back-right
    [0, H, D],   // 7: top-back-left
  ];

  const proj = p.map(([x, y, z]) => isoProject(x, y, z, ox, oy, s));

  // Front face (visible) — corners 0,1,2,3
  const front = [proj[0], proj[1], proj[2], proj[3]].map(([x, y]) => `${x},${y}`).join(' ');
  // Top face — corners 3,2,6,7
  const top = [proj[3], proj[2], proj[6], proj[7]].map(([x, y]) => `${x},${y}`).join(' ');
  // Right face — corners 1,5,6,2
  const right = [proj[1], proj[5], proj[6], proj[2]].map(([x, y]) => `${x},${y}`).join(' ');

  // Visible edges (solid) — the 9 edges bounding the front/top/right faces
  const visibleEdges = [
    [proj[0], proj[1]], // bottom-front
    [proj[1], proj[2]], // right-front
    [proj[2], proj[3]], // top-front
    [proj[3], proj[0]], // left-front
    [proj[3], proj[7]], // top-left (back)
    [proj[2], proj[6]], // top-right (back)
    [proj[7], proj[6]], // top-back
    [proj[1], proj[5]], // right-bottom (back)
    [proj[6], proj[5]], // right-back
  ];

  // Hidden edges (dashed) — the 3 edges meeting at the one corner (bottom-
  // back-left, index 4) that's behind the box from this viewing angle.
  const hiddenEdges = [
    [proj[0], proj[4]], // bottom-left (into depth)
    [proj[4], proj[5]], // bottom-back
    [proj[4], proj[7]], // left-back (vertical)
  ];

  return { front, top, right, visibleEdges, hiddenEdges, proj };
}

/* ───────────────────────────────────────────
   Layout / metrics
   ─────────────────────────────────────────── */

function useLayoutMetrics(box) {
  return useMemo(() => {
    const { externalWidth: W, externalHeight: H, externalDepth: D } = box;

    // Scale factor: fit the largest dimension into ~200px for the orthographic views
    const maxDim = Math.max(W, H, D);
    const targetDim = 200;
    const scale = targetDim / maxDim;

    const sW = W * scale;
    const sH = H * scale;
    const sD = D * scale;

    // Isometric view — top row.
    // The projected footprint's width/height (at scale=1) follows directly from
    // isoProject: depth pushes the back corners right by D*ISO_COS and up by
    // D*ISO_SIN, so the drawing's real span is (W + D*ISO_COS) x (H + D*ISO_SIN).
    // Sizing the block from these exact factors (instead of guessed constants)
    // keeps the bounding box calculation truthful, so the drawing can never
    // project outside the block it was allotted.
    const isoUnitW = W + D * ISO_COS;
    const isoUnitH = H + D * ISO_SIN;
    const isoTarget = 220;
    const isoScale = isoTarget / Math.max(isoUnitW, isoUnitH);

    const isoPad = 16; // breathing room above/right of the drawing itself
    const isoLabelSpace = 20; // room for the "3D Preview" text above the box
    // Room for a dimension arrow + its label. The iso labels read e.g.
    // "Height 720 mm" (wider than the orthographic views' bare "720 mm"),
    // so this needs to be wide enough for that whole string to sit outside
    // the box without clipping against the canvas edge.
    const isoDimGap = 60;
    const isoContentW = isoUnitW * isoScale;
    const isoContentH = isoUnitH * isoScale;
    // Left margin fits the Height arrow; right margin fits the Depth arrow
    // (it points up-and-right, past the box's rightmost projected corner).
    const isoWidth = isoContentW + isoDimGap * 2;
    // Top margin fits the title; bottom margin fits the Width arrow.
    const isoHeight = isoContentH + isoLabelSpace + isoPad + isoDimGap;

    // Distance from the block's left/top edge to the projection origin (the
    // box's own front-bottom-left corner, which sits at the bottom-left of
    // the projected footprint under this convention).
    const isoOriginInsetX = isoDimGap;
    const isoOriginInsetY = isoLabelSpace + isoPad + isoContentH;

    // Orthographic area — below isometric.
    // Positions are computed here (relative to an uncentered row origin at
    // 0,0) so the reserved block size below is derived from the exact same
    // numbers used to place the views — the two can't drift out of sync and
    // leave stray unused margin the way separately-guessed "area" paddings did.
    const dimGap = 30; // space for a dimension line + its label
    const orthoViewGap = 40; // gap between front and side views
    const orthoRowGap = 30; // gap between the iso row / front row / top row

    // Front — top-left of the row. dimGap to its left reserves room for the
    // height dimension line; dimGap below reserves room for the width one.
    const localFX = dimGap;
    const localFY = dimGap;

    // Side — to the right of front, separated by dimGap (front's own right-side
    // clearance) plus orthoViewGap.
    const localSX = localFX + sW + dimGap + orthoViewGap;
    const localSY = localFY;

    // Top — below front, aligned to the same left edge.
    const localTX = localFX;
    const localTY = localFY + sH + orthoRowGap + dimGap;

    // Row bounding box: rightmost edge is either the side view, or the top
    // view's right-hand depth dimension label (dimGap reserves its space).
    const orthoRowWidth = Math.max(localSX + sD, localTX + sW + dimGap);
    const orthoColHeight = localTY + sD;

    const contentWidth = Math.max(isoWidth, orthoRowWidth);
    const contentHeight = isoHeight + orthoRowGap + orthoColHeight;

    return {
      scale,
      isoScale,
      sW, sH, sD,
      isoWidth, isoHeight, isoOriginInsetX, isoOriginInsetY,
      dimGap, orthoRowGap,
      localFX, localFY, localSX, localSY, localTX, localTY,
      orthoRowWidth,
      contentWidth,
      contentHeight,
    };
  }, [box.externalWidth, box.externalHeight, box.externalDepth]);
}

/* ───────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────── */

/** Isometric 3D box, with hidden edges dashed and Width/Height/Depth call-outs */
function IsoBox({ W, H, D, originX, originY, scale, name }) {
  const { front, top, right, hiddenEdges, proj } = isoBoxFaces(W, H, D, originX, originY, scale);
  const [p0, p1, , p3, , p5] = proj; // corners: 0 front-bottom-left, 1 front-bottom-right, 3 front-top-left, 5 back-bottom-right

  return (
    <g>
      {/* Hidden edges (behind the box from this angle) — drawn first, dashed,
          so the solid faces below paint over the parts that are truly hidden. */}
      {hiddenEdges.map(([[x1, y1], [x2, y2]], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4,3" />
      ))}

      {/* Top face */}
      <polygon points={top} fill="#eff6ff" stroke="#1e293b" strokeWidth={1.3} />
      {/* Right face */}
      <polygon points={right} fill="#dbeafe" stroke="#1e293b" strokeWidth={1.3} />
      {/* Front face */}
      <polygon points={front} fill="#f8fafc" stroke="#1e293b" strokeWidth={1.3} />

      {/* Label — centered over the full footprint (front face + the part of
          the top/right faces that recede up-and-right past it), positioned
          above the box's actual topmost point (the back-top edge, not just
          the front-top one). */}
      <text
        x={originX + (W + D * ISO_COS * 0.5) * scale}
        y={originY - (H + D * ISO_SIN) * scale - 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#374151"
        fontFamily="sans-serif"
      >
        3D Preview
      </text>

      {/* Height — left of the front-left edge */}
      <DimLine x1={p0[0]} y1={p0[1]} x2={p3[0]} y2={p3[1]} label={`Height ${H} mm`} offset={-18} />
      {/* Width — below the front-bottom edge */}
      <DimLine x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} label={`Width ${W} mm`} offset={18} />
      {/* Depth — outside the receding bottom-right edge */}
      <DimLine x1={p1[0]} y1={p1[1]} x2={p5[0]} y2={p5[1]} label={`Depth ${D} mm`} offset={16} />
    </g>
  );
}

/** Dimension line with arrows and label */
function DimLine({ x1, y1, x2, y2, label, offset = 14, fontSize = 10 }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const nx = -dy / len * offset;
  const ny = dx / len * offset;

  const ox1 = x1 + nx, oy1 = y1 + ny;
  const ox2 = x2 + nx, oy2 = y2 + ny;

  const angle = Math.atan2(dy, dx);
  const arrow = 4;

  return (
    <g>
      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#4b5563" strokeWidth={0.6} />
      {/* Arrows at both ends */}
      <line
        x1={ox1} y1={oy1}
        x2={ox1 + arrow * Math.cos(angle)} y2={oy1 + arrow * Math.sin(angle)}
        stroke="#4b5563" strokeWidth={0.6}
      />
      <line
        x1={ox1 + arrow * 0.4 * Math.cos(angle - 1)} y1={oy1 + arrow * 0.4 * Math.sin(angle - 1)}
        x2={ox1} y2={oy1}
        stroke="#4b5563" strokeWidth={0.6}
      />
      <line
        x1={ox2} y1={oy2}
        x2={ox2 - arrow * Math.cos(angle)} y2={oy2 - arrow * Math.sin(angle)}
        stroke="#4b5563" strokeWidth={0.6}
      />
      <line
        x1={ox2 - arrow * 0.4 * Math.cos(angle - 1)} y1={oy2 - arrow * 0.4 * Math.sin(angle - 1)}
        x2={ox2} y2={oy2}
        stroke="#4b5563" strokeWidth={0.6}
      />
      <text
        x={(ox1 + ox2) / 2} y={(oy1 + oy2) / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill="#374151" fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  );
}

/** Orthographic view with watermark label and internal lines */
function OrthoView({ x, y, w, h, label, viewBoxLabel, thicknesses, box }) {
  const { side, top: topT, bottom: botT, back } = thicknesses;
  const { externalWidth: W, externalHeight: H, externalDepth: D } = box;

  // Scale raw mm thickness values to match the scaled view dimensions
  // scaleX maps horizontal mm → pixels, scaleY maps vertical mm → pixels
  const scaleX = w / (viewBoxLabel === 'Side' ? D : W);
  const scaleY = h / (viewBoxLabel === 'Top' ? D : H);

  return (
    <g>
      {/* Background */}
      <rect x={x} y={y} width={w} height={h} fill="#f9fafb" stroke="#374151" strokeWidth={1} />

      {/* Watermark label — big, centered, semi-transparent */}
      <text
        x={x + w / 2} y={y + h / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.min(36, w * 0.15, h * 0.2)}
        fontWeight={800}
        fill="rgba(0,0,0,0.06)"
        fontFamily="sans-serif"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>

      {/* Internal panel lines — thickness values scaled to match the view */}
      {viewBoxLabel === 'Front' && (
        <>
          <line x1={x + side * scaleX} y1={y} x2={x + side * scaleX} y2={y + h} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x + (W - side) * scaleX} y1={y} x2={x + (W - side) * scaleX} y2={y + h} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x} y1={y + topT * scaleY} x2={x + w} y2={y + topT * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x} y1={y + (H - botT) * scaleY} x2={x + w} y2={y + (H - botT) * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
        </>
      )}
      {viewBoxLabel === 'Side' && (
        <>
          <line x1={x} y1={y + (D - back) * scaleY} x2={x + w} y2={y + (D - back) * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x} y1={y + topT * scaleY} x2={x + w} y2={y + topT * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x} y1={y + (H - botT) * scaleY} x2={x + w} y2={y + (H - botT) * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
        </>
      )}
      {viewBoxLabel === 'Top' && (
        <>
          <line x1={x + side * scaleX} y1={y} x2={x + side * scaleX} y2={y + h} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x + (W - side) * scaleX} y1={y} x2={x + (W - side) * scaleX} y2={y + h} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
          <line x1={x} y1={y + (D - back) * scaleY} x2={x + w} y2={y + (D - back) * scaleY} stroke="#9ca3af" strokeWidth={0.5} strokeDasharray="3,2" />
        </>
      )}
    </g>
  );
}

/* ───────────────────────────────────────────
   Main component
   ─────────────────────────────────────────── */

export function BoxVisualization({ box, thicknesses, className = '', style }) {
  if (!box) return null;

  // Normalize dimensions — use safe defaults if missing, non-finite, or not positive.
  // A dimension of 0 (e.g. while a user is mid-edit clearing an input field) must not
  // pass through: it becomes a scaled view width of 0, and OrthoView divides by that
  // view width (scaleX/scaleY), producing 0/0 = NaN across every internal panel line.
  const positiveOr = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const numW = positiveOr(box.externalWidth, 600);
  const numH = positiveOr(box.externalHeight, 720);
  const numD = positiveOr(box.externalDepth, 570);

  // Normalize thicknesses — provide defaults if missing, null, or invalid
  const raw = thicknesses || {};
  const safeThicknesses = {
    side: positiveOr(raw.side, 18),
    top: positiveOr(raw.top, 18),
    bottom: positiveOr(raw.bottom, 18),
    back: positiveOr(raw.back, 12),
  };

  // Build a normalized box for downstream consumption
  const safeBox = { ...box, externalWidth: numW, externalHeight: numH, externalDepth: numD };

  const m = useLayoutMetrics(safeBox);
  const {
    sW, sH, sD, isoScale,
    isoWidth, isoHeight, isoOriginInsetX, isoOriginInsetY,
    contentWidth, contentHeight, orthoRowWidth,
    localFX, localFY, localSX, localSY, localTX, localTY,
    orthoRowGap,
  } = m;

  // Outer canvas margin — kept equal on every side so the whole drawing sits
  // centered in the SVG instead of hugging the top-left corner.
  const PAD = 20;

  // Each row (the iso block, the front+side row) is centered horizontally
  // within whichever row is widest, rather than both left-aligned to the
  // same x — this is what keeps the narrower row from looking off-center.
  const isoRowX = PAD + (contentWidth - isoWidth) / 2;
  const orthoRowX = PAD + (contentWidth - orthoRowWidth) / 2;

  // Isometric origin (the box's own front-bottom-left corner), placed so the
  // projected back corners land exactly isoOriginInsetX/Y in from the block's
  // own edges — never negative, never clipped.
  const isoOriginX = isoRowX + isoOriginInsetX;
  const isoOriginY = PAD + isoOriginInsetY;

  const orthoStartY = PAD + isoHeight + orthoRowGap;

  // Ortho views — the row's local (uncentered) layout, shifted by the row's
  // centering offset. localFX/localSX/etc. are also what orthoRowWidth was
  // derived from, so this can never draw outside the block reserved for it.
  const fX = orthoRowX + localFX;
  const fY = orthoStartY + localFY;
  const sX = orthoRowX + localSX;
  const sY = orthoStartY + localSY;
  const tX = orthoRowX + localTX;
  const tY = orthoStartY + localTY;

  const svgW = contentWidth + PAD * 2;
  const svgH = contentHeight + PAD * 2;

  // Safe display values for aria-label and title
  const displayName = box.name || 'Box';
  const displayW = numW;
  const displayH = numH;
  const displayD = numD;

  return (
    <div
      className={`box-visualization ${className}`}
      style={{ ...style, maxWidth: 600 }}
      role="figure"
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${displayName} visualization — ${displayW}mm × ${displayH}mm × ${displayD}mm`}
        style={{ width: '100%', height: 'auto' }}
      >
        <title>{`${displayName} — Visualization`}</title>

        {/* ── Isometric 3D Preview ── */}
        <IsoBox
          W={numW} H={numH} D={numD}
          originX={isoOriginX} originY={isoOriginY}
          scale={isoScale}
          name={displayName}
        />

        {/* ── Orthographic Views ── */}

        {/* Front */}
        <OrthoView
          x={fX} y={fY} w={sW} h={sH}
          label="Front" viewBoxLabel="Front"
          thicknesses={safeThicknesses} box={safeBox}
        />
        {/* Width dimension below front */}
        <DimLine x1={fX} y1={fY + sH} x2={fX + sW} y2={fY + sH} label={`${displayW} mm`} offset={12} />
        {/* Height dimension left of front */}
        <DimLine x1={fX} y1={fY} x2={fX} y2={fY + sH} label={`${displayH} mm`} offset={12} />

        {/* Side */}
        <OrthoView
          x={sX} y={sY} w={sD} h={sH}
          label="Side" viewBoxLabel="Side"
          thicknesses={safeThicknesses} box={safeBox}
        />
        {/* Depth dimension below side */}
        <DimLine x1={sX} y1={sY + sH} x2={sX + sD} y2={sY + sH} label={`${displayD} mm`} offset={12} />

        {/* Top */}
        <OrthoView
          x={tX} y={tY} w={sW} h={sD}
          label="Top" viewBoxLabel="Top"
          thicknesses={safeThicknesses} box={safeBox}
        />
        {/* Depth dimension right of top — negative offset because DimLine's
            normal points left for a top-to-bottom line, which would overlay
            the view instead of sitting outside its right edge. */}
        <DimLine x1={tX + sW} y1={tY} x2={tX + sW} y2={tY + sD} label={`${displayD} mm`} offset={-12} />
      </svg>
    </div>
  );
}

export default BoxVisualization;