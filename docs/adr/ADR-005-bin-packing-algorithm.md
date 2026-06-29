# ADR-005: Bin-Packing Algorithm for Optimised Cut Mode

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

Parts are always rectangles. No irregular shapes. Grain direction is a hard constraint: a part cannot be rotated against grain. The algorithm must run entirely in the browser (no WASM, no worker threads in V1). "Fully Optimised" mode is one of three modes. The algorithm does not need to be perfect — it needs to be fast, understandable, and correct. A custom implementation is preferred over pulling in a heavy dependency.

## Decision

Implement a custom Guillotine Cut algorithm with Best-Fit Decreasing (BFD) heuristic, approximately 200 lines of code.

## Options Considered

- **Guillotine Cut + BFD (custom ~200 lines):** Well-suited to sheet goods cutting because it models real-world cutting workflows (every cut goes edge-to-edge). Fast enough to run synchronously in the browser. Easy to understand and debug.
- **Maximal Rectangles algorithm:** More optimal than guillotine cutting, but produces placements that cannot be achieved with straight guillotine cuts. A woodworker cannot physically cut a maximal-rectangle placement without expensive CNC equipment.
- **First-Fit Decreasing Strip Packing:** Simpler than guillotine but wastes space. Does not model the free-rectangle tracking that guillotine algorithms provide.
- **Existing npm library (e.g., `binpacking`, `2d-bin-packing`):** Saves implementation time but introduces a dependency whose codebase we did not audit. Most libraries do not support grain-direction constraints, meaning we would need to fork and modify them.

## Trade-off Analysis

Custom Guillotine + BFD is the right balance of correctness, performance, and maintainability for this domain. The algorithm is well-understood, well-documented in academic literature, and maps directly to how a track saw or table saw actually cuts a sheet.

The trade-off is that guillotine packing is not provably optimal. For typical cabinet projects (10-30 parts per sheet), the difference between guillotine and optimal packing is usually 1-3%. That is within the margin of error introduced by part placement choices and kerf tolerances.

## Consequences

- Algorithm lives in `src/engine/optimised.js` as a pure function
- Parts are sorted by area descending before placement (BFD heuristic)
- Free rectangles are tracked and scored for each part placement
- Grain constraint prevents rotation when set to `hard`
- When grain constraint is `soft`, rotations against grain are allowed but flagged in the output
- Algorithm runs synchronously on the main thread — acceptable for V1 project sizes

## Action Items

- [x] Implement Guillotine + BFD in `src/engine/optimised.js`
- [ ] Add unit tests for grain constraint enforcement
- [ ] Add unit tests for kerf deduction on every cut
- [ ] Add stress test with 50+ parts to verify main-thread performance