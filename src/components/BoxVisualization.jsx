/**
 * BoxVisualization.jsx — SVG-based box preview
 *
 * Renders:
 *  1. An isometric "3D" hero preview of the box, styled with soft ambient
 *     shadow, wood-tone face shading, and pill-style dimension callouts.
 *  2. A captioned grid of the three orthographic panel views (Front, Side,
 *     Top), each in its own card.
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

// Dimetric projection angle (≈18.4°). Shared by isoProject and IsoHero's
// layout math below — the layout math has to reproduce this exact
// projection to know where the drawing's edges actually land, so it must
// never drift out of sync with the constants isoProject uses.
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

  // Hidden edges (dashed) — the 3 edges meeting at the one corner (bottom-
  // back-left, index 4) that's behind the box from this viewing angle.
  const hiddenEdges = [
    [proj[0], proj[4]], // bottom-left (into depth)
    [proj[4], proj[5]], // bottom-back
    [proj[4], proj[7]], // left-back (vertical)
  ];

  return { front, top, right, hiddenEdges, proj };
}

/* ───────────────────────────────────────────
   Dimension callout — pill label anchored to an edge with extension
   ticks back to the edge itself, consistent line weight throughout.
   ─────────────────────────────────────────── */
function DimCallout({ x1, y1, x2, y2, label, offset = 20, fontSize = 11 }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;

  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;
  const ox1 = x1 + nx, oy1 = y1 + ny;
  const ox2 = x2 + nx, oy2 = y2 + ny;
  const midX = (ox1 + ox2) / 2;
  const midY = (oy1 + oy2) / 2;

  // Short perpendicular end ticks, technical-drawing style.
  const tick = 4;
  const tnx = (-dy / len) * tick;
  const tny = (dx / len) * tick;

  const pillW = label.length * fontSize * 0.56 + 16;
  const pillH = fontSize + 10;

  return (
    <g>
      {/* Extension lines back to the box edge */}
      <line x1={x1} y1={y1} x2={ox1} y2={oy1} className="stroke-surface-300" strokeWidth={1} strokeDasharray="2,2" />
      <line x1={x2} y1={y2} x2={ox2} y2={oy2} className="stroke-surface-300" strokeWidth={1} strokeDasharray="2,2" />
      {/* Dimension line + end ticks */}
      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} className="stroke-surface-400" strokeWidth={1.25} />
      <line x1={ox1 - tnx} y1={oy1 - tny} x2={ox1 + tnx} y2={oy1 + tny} className="stroke-surface-400" strokeWidth={1.25} />
      <line x1={ox2 - tnx} y1={oy2 - tny} x2={ox2 + tnx} y2={oy2 + tny} className="stroke-surface-400" strokeWidth={1.25} />
      {/* Pill label */}
      <rect
        x={midX - pillW / 2} y={midY - pillH / 2}
        width={pillW} height={pillH} rx={pillH / 2}
        className="fill-white stroke-surface-200"
        strokeWidth={1}
      />
      <text
        x={midX} y={midY + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize}
        className="fill-surface-800 font-semibold"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

/* ───────────────────────────────────────────
   Isometric hero — the main 3D preview
   ─────────────────────────────────────────── */
function IsoHero({ W, H, D }) {
  const m = useMemo(() => {
    // The projected footprint's width/height (at scale=1) follows directly
    // from isoProject: depth pushes the back corners right by D*ISO_COS and
    // up by D*ISO_SIN, so the drawing's real span is
    // (W + D*ISO_COS) x (H + D*ISO_SIN).
    const isoUnitW = W + D * ISO_COS;
    const isoUnitH = H + D * ISO_SIN;
    const target = 260;
    const scale = target / Math.max(isoUnitW, isoUnitH);

    const padSide = 78; // room for the Height/Depth dimension pills
    const padTop = 20;
    const padBottom = 58; // room for the Width dimension pill + shadow

    const contentW = isoUnitW * scale;
    const contentH = isoUnitH * scale;

    const originX = padSide;
    const originY = padTop + contentH;

    return {
      scale,
      originX,
      originY,
      svgW: contentW + padSide * 2,
      svgH: contentH + padTop + padBottom,
    };
  }, [W, H, D]);

  const { scale, originX, originY, svgW, svgH } = m;
  const { front, top, right, hiddenEdges, proj } = isoBoxFaces(W, H, D, originX, originY, scale);
  const [p0, p1, , p3, , p5] = proj; // 0 front-bottom-left, 1 front-bottom-right, 3 front-top-left, 5 back-bottom-right

  const footprintW = (W + D * ISO_COS) * scale;
  const shadowCx = originX + footprintW / 2;
  const shadowRy = Math.max(5, footprintW * 0.045);
  const shadowRx = Math.max(shadowRy * 2.2, footprintW * 0.44);

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-elev-2 px-4 pt-5 pb-3">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`3D preview — ${W}mm wide × ${H}mm high × ${D}mm deep`}
        style={{ width: '100%', height: 'auto' }}
      >
        <title>3D box preview</title>
        <defs>
          <linearGradient id="ply-face-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF8" />
            <stop offset="100%" stopColor="#FEEDC8" />
          </linearGradient>
          <linearGradient id="ply-face-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEEDC8" />
            <stop offset="100%" stopColor="#FBC068" />
          </linearGradient>
          <linearGradient id="ply-face-right" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FBC068" />
            <stop offset="100%" stopColor="#D9822E" />
          </linearGradient>
          <radialGradient id="ply-ground-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(45,40,35,0.30)" />
            <stop offset="100%" stopColor="rgba(45,40,35,0)" />
          </radialGradient>
        </defs>

        {/* Soft ambient shadow beneath the box */}
        <ellipse cx={shadowCx} cy={originY + 9} rx={shadowRx} ry={shadowRy} fill="url(#ply-ground-shadow)" />

        {/* Hidden edges — drawn first so the solid faces paint over them */}
        {hiddenEdges.map(([[x1, y1], [x2, y2]], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-surface-300" strokeWidth={1} strokeDasharray="4,3" />
        ))}

        {/* Faces — wood-tone gradients standing in for material shading */}
        <polygon points={top} fill="url(#ply-face-top)" className="stroke-surface-800" strokeWidth={1.5} strokeLinejoin="round" />
        <polygon points={right} fill="url(#ply-face-right)" className="stroke-surface-800" strokeWidth={1.5} strokeLinejoin="round" />
        <polygon points={front} fill="url(#ply-face-front)" className="stroke-surface-800" strokeWidth={1.5} strokeLinejoin="round" />

        {/* Dimension callouts */}
        <DimCallout x1={p0[0]} y1={p0[1]} x2={p3[0]} y2={p3[1]} label={`H ${H} mm`} offset={-26} />
        <DimCallout x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} label={`W ${W} mm`} offset={30} />
        <DimCallout x1={p1[0]} y1={p1[1]} x2={p5[0]} y2={p5[1]} label={`D ${D} mm`} offset={22} />
      </svg>
    </div>
  );
}

/* ───────────────────────────────────────────
   Orthographic panel thumbnails
   ─────────────────────────────────────────── */

/** Single panel drawing — geometry matches the original technical layout
 * exactly (scaleX/scaleY selection per view), only the styling changed. */
function ThumbnailPanel({ x, y, w, h, viewBoxLabel, thicknesses, box }) {
  const { side, top: topT, bottom: botT, back } = thicknesses;
  const { externalWidth: W, externalHeight: H, externalDepth: D } = box;

  const scaleX = w / (viewBoxLabel === 'Side' ? D : W);
  const scaleY = h / (viewBoxLabel === 'Top' ? D : H);

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} className="fill-surface-50 stroke-surface-400" strokeWidth={1.25} />

      {viewBoxLabel === 'Front' && (
        <>
          <line x1={x + side * scaleX} y1={y} x2={x + side * scaleX} y2={y + h} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x + (W - side) * scaleX} y1={y} x2={x + (W - side) * scaleX} y2={y + h} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x} y1={y + topT * scaleY} x2={x + w} y2={y + topT * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x} y1={y + (H - botT) * scaleY} x2={x + w} y2={y + (H - botT) * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
        </>
      )}
      {viewBoxLabel === 'Side' && (
        <>
          <line x1={x} y1={y + (D - back) * scaleY} x2={x + w} y2={y + (D - back) * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x} y1={y + topT * scaleY} x2={x + w} y2={y + topT * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x} y1={y + (H - botT) * scaleY} x2={x + w} y2={y + (H - botT) * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
        </>
      )}
      {viewBoxLabel === 'Top' && (
        <>
          <line x1={x + side * scaleX} y1={y} x2={x + side * scaleX} y2={y + h} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x + (W - side) * scaleX} y1={y} x2={x + (W - side) * scaleX} y2={y + h} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
          <line x1={x} y1={y + (D - back) * scaleY} x2={x + w} y2={y + (D - back) * scaleY} className="stroke-surface-300" strokeWidth={1} strokeDasharray="3,2" />
        </>
      )}
    </g>
  );
}

/** A captioned card wrapping a single ThumbnailPanel. */
function PanelThumbnailCard({ label, viewBoxLabel, mmLabel, w, h, box, thicknesses }) {
  const target = 116;
  const scale = target / Math.max(w, h);
  const vw = w * scale;
  const vh = h * scale;
  const pad = 14;
  const svgW = vw + pad * 2;
  const svgH = vh + pad * 2;

  return (
    <div className="bg-white rounded-lg border border-surface-200 shadow-elev-1 hover:shadow-elev-2 transition-shadow duration-200 p-3 flex flex-col items-center">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${label} view — ${mmLabel}`}
        style={{ width: '100%', height: 'auto' }}
      >
        <title>{`${label} view`}</title>
        <ThumbnailPanel x={pad} y={pad} w={vw} h={vh} viewBoxLabel={viewBoxLabel} thicknesses={thicknesses} box={box} />
      </svg>
      <p className="mt-2 text-label-sm text-surface-800">{label}</p>
      <p className="text-label-sm font-normal text-surface-400">{mmLabel}</p>
    </div>
  );
}

/* ───────────────────────────────────────────
   Main component
   ─────────────────────────────────────────── */

export function BoxVisualization({ box, thicknesses, className = '', style }) {
  if (!box) return null;

  // Normalize dimensions — use safe defaults if missing, non-finite, or not positive.
  // A dimension of 0 (e.g. while a user is mid-edit clearing an input field) must not
  // pass through: it becomes a scaled view width of 0, and ThumbnailPanel divides by
  // that view width (scaleX/scaleY), producing 0/0 = NaN across every internal line.
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

  const safeBox = { ...box, externalWidth: numW, externalHeight: numH, externalDepth: numD };
  const displayName = box.name || 'Box';

  return (
    <div className={className} style={style} role="figure" aria-label={`${displayName} visualization`}>
      <IsoHero W={numW} H={numH} D={numD} />

      <div className="grid grid-cols-3 gap-3 mt-3">
        <PanelThumbnailCard
          label="Front" viewBoxLabel="Front" mmLabel={`${numW} × ${numH} mm`}
          w={numW} h={numH} box={safeBox} thicknesses={safeThicknesses}
        />
        <PanelThumbnailCard
          label="Side" viewBoxLabel="Side" mmLabel={`${numD} × ${numH} mm`}
          w={numD} h={numH} box={safeBox} thicknesses={safeThicknesses}
        />
        <PanelThumbnailCard
          label="Top" viewBoxLabel="Top" mmLabel={`${numW} × ${numD} mm`}
          w={numW} h={numD} box={safeBox} thicknesses={safeThicknesses}
        />
      </div>
    </div>
  );
}

export default BoxVisualization;
