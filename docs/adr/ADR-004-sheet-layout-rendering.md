# ADR-004: 2D Sheet Layout Rendering

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

Sheet layouts are composed entirely of labelled rectangles on a fixed-size background. The diagrams must be embeddable in the PDF export. The diagrams must be accessible (screen reader labels on parts). We want contributors who know HTML/CSS to be able to work on diagrams without learning a canvas API.

## Decision

Use inline SVG rendered as React components for all 2D sheet layout diagrams.

## Options Considered

- **Inline SVG (React components):** Declarative, accessible, styleable with CSS, embeddable in PDF via canvas rasterization. Contributors who know HTML can work on SVG immediately.
- **HTML5 Canvas:** Imperative API. Every frame requires a full redraw. No built-in accessibility — screen readers cannot read canvas content. Requires manual hit-detection for interactivity.
- **Konva.js:** Rich canvas library with scene graphs and events, but adds a heavy dependency for what is essentially labelled rectangles.
- **D3.js:** Powerful data visualization library, but overkill for rectangle packing diagrams. steep learning curve for contributors unfamiliar with data joins.
- **Recharts:** Designed for charts (bar, line, scatter), not spatial layouts. Would fight the library to render sheet diagrams.

## Trade-off Analysis

Inline SVG is the obvious choice. Sheet diagrams are rectangles with labels — exactly what SVG was designed for. React renders SVG elements naturally (`<rect>`, `<text>`, `<g>`). Accessibility is built in: `<title>` and `<desc>` elements provide screen reader support. CSS styling works on SVG elements, so theming is straightforward.

For PDF embedding, the SVG is serialized to a string, drawn to an offscreen `<canvas>`, and the canvas is exported as a PNG for pdf-lib. This pipeline is well-documented and reliable.

## Consequences

- Sheet diagrams are React components that return SVG JSX
- Diagram components accept plain data props (placements, sheet dimensions) — no store coupling
- Accessibility labels are required on all diagram parts
- SVG-to-PNG rasterization pipeline needed for PDF export

## Action Items

- [x] Create SVG diagram component in `src/components/` — `SheetLayoutDiagram.jsx`
- [x] Implement SVG-to-canvas rasterization utility — `src/utils/rasterize.js`
- [x] Add accessibility labels (title, desc, role) to all diagram elements
- [x] Test diagram rendering at various zoom levels for PDF quality — `tests/utils/rasterize.test.js`
