# ADR-008: Kerf and Edge Banding Calculation Model

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

Kerf is the material removed by the blade on every cut. It must be subtracted from available sheet space, not added to part dimensions. Edge banding is applied after cutting. The cut dimension must be reduced by the edge banding thickness so the final assembled dimension is correct. The cut list must always show the dimension to set on the saw fence — not the finished dimension. The calculation engine is pure functions with no UI dependencies (`src/engine/`). It must be fully unit-testable.

## Decision

Apply kerf and edge banding using the following order of operations:

### Kerf Model
- Kerf is managed at the sheet-packing level, not the part level
- When the bin-packing algorithm places a part, it reserves `part dimension + kerf` in the direction of the cut
- The last part in a strip does not consume kerf on its outer edge (the cut is already complete)
- Kerf is never added to a part's recorded dimension — it only affects placement coordinates in the sheet layout

### Edge Banding Model
- Edge banding is subtracted from the cut dimension before the part reaches the cut list
- For each edge marked for banding, subtract the banding material thickness from that dimension
- Example: a 400mm shelf with 2mm solid wood edge banding on the top edge → cut dimension is 398mm

### Order of Operations for a Single Part

1. Calculate nominal dimension from box dimensions + material thicknesses
2. Subtract edge banding thickness for each banded edge
3. Output: cut dimension (what goes on the cut list, what the woodworker sets on the saw fence)
4. Kerf is applied during sheet packing (steps happen in `batch.js`, `balanced.js`, `optimised.js`)

### Cut List Output

The cut list shows the cut dimension only. The woodworker reads the cut list and sets the saw fence to that value. After cutting, edge banding is applied to reach the finished dimension.

## Options Considered

- **Kerf added to part dimensions:** Incorrect. The part does not get bigger because of kerf. Kerf is waste material between cuts.
- **Kerf subtracted from part dimensions:** Incorrect for the same reason. The part's cut dimension is independent of kerf.
- **Edge banding added to cut dimensions:** Incorrect. Edge banding is applied after cutting. Adding it would make the finished piece too large.
- **Edge banding subtracted from cut dimensions:** Correct. The cut piece is smaller than the finished piece by exactly the banding thickness.

## Trade-off Analysis

This model matches physical reality. A woodworker who cuts a shelf knows: "I need the shelf to be 400mm when done. The edge banding is 2mm thick. So I cut to 398mm." The calculator encodes this logic.

The trade-off is conceptual overhead for contributors who do not understand woodworking. That is why this ADR exists — to codify the domain knowledge permanently.

## Consequences

- `src/engine/parts.js` calculates cut dimensions (nominal - edge banding)
- `src/engine/batch.js`, `balanced.js`, `optimised.js` manage kerf during placement
- The cut list component reads cut dimensions directly from the engine output — no post-processing
- PDF export shows cut dimensions, not finished dimensions
- A "Saw Fence" column in the cut list makes the intent explicit
- Unit tests must verify: (a) kerf does not appear in part dimensions, (b) edge banding is correctly subtracted, (c) last part in a strip does not consume trailing kerf

## Action Items

- [x] Document kerf model in `src/engine/` files via JSDoc
- [x] Document edge banding model in `src/engine/parts.js`
- [x] Add unit tests for kerf placement (including trailing kerf edge case)
- [x] Add unit tests for edge banding subtraction on single and double edges
- [x] Add unit test for the full pipeline: box dimensions → cut dimensions → sheet layout
