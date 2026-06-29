# ADR-013: Balanced Layout Strategy

**Status:** Proposed
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

The "Balanced" cut mode sits between Batch and Optimised modes. It provides better material utilisation than batch strip-cutting while maintaining a cutting workflow that is easier to follow than fully optimised placement. The balanced mode attempts to group parts intelligently without the complexity of full guillotine free-rectangle tracking.

Balanced mode is useful when:
- The woodworker wants better material utilisation than batch mode
- The cutting sequence should still be somewhat predictable
- Parts have varying widths that don't group neatly into strips

## Decision

Implement balanced layout as a shelf-based (Next-Fit Decreasing) algorithm with grain-aware placement:

### Algorithm

1. Sort all parts by area descending (largest first)
2. For each part, find the best "shelf" (horizontal band) on the current sheet(s)
3. A shelf is created at the height (width dimension) of the first part placed in it
4. Subsequent parts fit on a shelf if their width ≤ shelf height and their length fits in the remaining shelf length (plus kerf)
5. If no shelf fits, create a new shelf below existing content
6. If no shelf fits on the current sheet, move to the next sheet

### Placement Rules

- Parts are placed with their longest dimension running along the sheet length (grain direction)
- Rotation is allowed only when `grainConstraint === 'soft'`, and rotated parts are flagged in the output
- When `grainConstraint === 'hard'`, parts are never rotated
- Kerf is added between parts on the same shelf, and between shelves (per ADR-008)

### Shelf Creation

- Each shelf starts at the next available Y position on the sheet
- Shelf height is determined by the widest part placed in it first
- Parts on the same shelf are packed left-to-right
- When a part doesn't fit on any existing shelf, a new shelf is created below all existing shelves

### Algorithm Characteristics

- Time complexity: O(n²) in the worst case (each part checked against each shelf)
- Space complexity: O(n) for shelf tracking
- Deterministic output — same input always produces the same layout
- More material-efficient than batch mode but less efficient than full guillotine optimised mode

## Options Considered

- **Shelf-based NFD (chosen):** Simple, intuitive, and provides good utilisation. Easy to explain to woodworkers: "parts are arranged in horizontal rows."
- **Two-stage batch:** First batch by width, then optimise within each strip. Hybrid approach that adds complexity without clear benefit over pure shelf-based.
- **First-Fit Decreasing on full sheet:** Treat the sheet as a 1D bin along the length axis only. Wastes space because it doesn't use the width dimension effectively.
- **Skip balanced mode entirely:** Offer only batch and optimised. The balanced mode fills a real gap — some woodworkers find batch too wasteful and optimised too unpredictable.

## Trade-off Analysis

Shelf-based NFD provides a meaningful middle ground. It is more efficient than batch because it can place parts of different widths on the same shelf (using remaining width space). It is less efficient than optimised because it does not utilise the space above/below parts on the same shelf.

The algorithm is simple enough to understand and debug, which is important for an open source project where contributors need to reason about the code. The shelf metaphor maps directly to how woodworkers think about layout: "row by row."

## Consequences

- `balancedLayout()` accepts `parts`, `sheet`, `kerf`, and `grainConstraint`
- Parts are expected to have `{ cutLength, cutWidth }` dimensions (after edge banding subtraction per ADR-008)
- The function returns `SheetLayout[]` following the shape defined in `docs/contributing/CALCULATION_ENGINE.md`
- Shelf boundaries are tracked in the output for rendering purposes (visual separation between rows)
- Unit tests must verify: (a) parts sorted by area descending, (b) shelf creation and packing, (c) grain constraint enforcement, (d) kerf between parts and shelves

## Action Items

- [ ] Implement `balancedLayout()` in `src/engine/balanced.js`
- [ ] Add unit tests for basic shelf creation and packing
- [ ] Add unit tests for grain constraint (hard and soft)
- [ ] Add unit tests for kerf between parts and between shelves
- [ ] Add unit tests for multi-sheet output
- [ ] Add integration test: parts → balanced layout → verify all parts placed