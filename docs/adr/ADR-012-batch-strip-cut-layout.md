# ADR-012: Batch/Strip Cut Layout Strategy

**Status:** Proposed
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

The "Batch" cut mode is the simplest layout strategy and mirrors how a woodworker actually cuts a sheet at a track saw or table saw. Rather than an algorithmic optimization, batch cutting follows a predictable pattern: rip full-length strips from the sheet, then cross-cut those strips into individual part lengths. This mode is not about material efficiency — it is about workflow simplicity and repeatability.

Batch cutting is particularly useful when:
- The woodworker is using a track saw with limited fence travel
- Many parts share the same width (e.g., multiple shelves of identical width)
- The woodworker prefers a linear cutting workflow over jigsaw-style placement

## Decision

Implement batch layout as a two-pass strip-cutting algorithm:

### Pass 1 — Rip strips

Group parts by their width dimension. For each unique width group:
1. Calculate the strip width: `maxPartWidth + kerf` (kerf added only between parts, not after the last part)
2. Rip a full-length strip from the sheet at that width
3. Track the remaining length on the sheet

When the remaining sheet length cannot accommodate another strip, move to the next sheet.

### Pass 2 — Cross-cut strips

For each ripped strip:
1. Sort parts in that strip by length descending (longest first for stability)
2. Cross-cut parts from the strip, adding kerf between cuts
3. The last part in a strip does not consume trailing kerf (per ADR-008)
4. Track offcut segments that are too small for remaining parts

### Grain Constraint

Grain direction is enforced as a hard constraint in batch mode. Parts are placed with their longest dimension aligned with the strip length (which runs along the sheet length). Rotation is not allowed in batch mode — the strip direction is fixed.

If a part cannot fit in the current strip, a new strip is ripped. If no strip can accommodate the part on the current sheet, a new sheet is started.

### Algorithm Characteristics

- Time complexity: O(n log n) for sorting, O(n) for placement
- Space complexity: O(n) for strip tracking
- No backtracking or optimization — purely sequential
- Deterministic output — same input always produces the same layout

## Options Considered

- **Group by width (chosen):** Most natural grouping for strip cutting. Parts of the same width share a strip, minimizing waste within a strip.
- **Group by length:** Would produce strips cut by length first, then ripped to width. Less common in practice and harder to explain to woodworkers.
- **No grouping (single strip per part):** Every part gets its own full-length strip. Extremely wasteful but simplest to implement. Not worth the simplicity trade-off.
- **Hybrid (group by most common width):** Identify the most common width, group those parts, then handle outliers individually. Adds complexity without proportional benefit for the batch mode.

## Trade-off Analysis

Grouping by width is the most intuitive and matches real-world workflow. A woodworker using batch mode thinks: "I have six 400mm-wide shelves — rip a 400mm strip, then cross-cut to length." The algorithm encodes exactly this logic.

The trade-off is material efficiency. Batch mode will generally use more sheets than optimised mode because it does not attempt to fit parts into irregular remaining space. This is acceptable — batch mode is a workflow choice, not an optimization choice. The app shows sheet utilisation percentages so the user can compare modes.

## Consequences

- `batchLayout()` accepts `parts`, `sheet`, and `kerf`. No grain constraint parameter — grain is always hard in batch mode.
- Parts are expected to have `{ cutLength, cutWidth }` dimensions (after edge banding subtraction per ADR-008).
- The function returns `SheetLayout[]` following the shape defined in `docs/contributing/CALCULATION_ENGINE.md`.
- Offcuts are tracked as full-length remaining strip segments after cross-cutting.
- Unit tests must verify: (a) parts grouped correctly by width, (b) kerf between parts but not after the last, (c) new sheet started when current sheet is exhausted, (d) grain direction is never rotated

## Action Items

- [ ] Implement `batchLayout()` in `src/engine/batch.js`
- [ ] Add unit tests for basic strip grouping
- [ ] Add unit tests for kerf between parts (not after last)
- [ ] Add unit tests for multi-sheet output
- [ ] Add unit tests for offcut tracking
- [ ] Add integration test: parts → batch layout → verify all parts placed