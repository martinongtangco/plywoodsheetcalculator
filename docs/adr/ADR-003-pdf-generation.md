# ADR-003: PDF Generation Strategy

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

No backend exists and none is planned for V1. The PDF must include 2D sheet layout diagrams (SVG-based visuals). The output must be portable and reproducible — same input always produces the same PDF. Contributors should be able to run the full app locally with `pnpm run dev` — no API keys, no services.

## Decision

Use `pdf-lib` for client-side PDF generation, with SVG diagrams rendered to canvas and embedded as images in the PDF.

## Options Considered

- **pdf-lib (client-side):** Lightweight, zero dependencies, works entirely in the browser. Can embed PNG/JPEG images drawn from SVG via canvas. Mature and actively maintained.
- **jsPDF (client-side):** More feature-rich for text layout but significantly larger bundle. Auto-table plugin is useful but adds another dependency. Text wrapping and pagination are harder to control than expected.
- **Browser `window.print()` with print CSS:** Simplest approach but least portable. Output varies by browser and printer driver. Cannot guarantee reproducibility. Cannot be programmatically downloaded without user interaction.
- **Serverless function calling Puppeteer:** Produces perfect PDFs but requires a backend, API keys, and network connectivity. Violates the no-backend, fully-offline requirement.

## Trade-off Analysis

`pdf-lib` is the right choice because it satisfies all constraints: client-side, no API keys, reproducible output, and the ability to embed visual diagrams. The trade-off is that text layout (wrapping, pagination) must be done manually — there is no built-in auto-layout engine. For a structured output like a cut list table, this is manageable with fixed-column layouts.

SVG diagrams are rendered to an offscreen canvas using `SVGRenderingContext` and then embedded as PNG images in the PDF. This bridges the gap between our SVG-based diagram rendering (ADR-004) and pdf-lib's image embedding.

## Consequences

- PDF generation runs entirely in the browser
- Large projects may cause brief main-thread blocking during PDF generation — acceptable for V1, can be moved to a Web Worker in V2
- SVG diagrams are rasterized for PDF embedding (vector fidelity is lost, but acceptable at reasonable DPI)
- Contributors need zero setup to generate PDFs locally

## Action Items

- [x] Add `pdf-lib` to dependencies
- [ ] Implement PDF generation module in `src/pdf/`
- [ ] Add SVG-to-canvas-to-PNG pipeline for sheet diagrams
- [ ] Consider Web Worker for PDF generation if main-thread blocking becomes noticeable