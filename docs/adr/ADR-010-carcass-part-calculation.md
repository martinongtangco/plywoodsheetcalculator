# ADR-010: Carcass Part Calculation Model

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

The carcass part calculation is the foundational formula of the entire application. Every downstream feature (cut list, sheet layout, PDF export, material estimation) depends on correct part dimensions. The calculation must support two construction methods that change how the box is assembled, and must account for material thickness differences between parts (e.g., sides at 18mm, shelves at 15mm, back panel at 3mm).

The two construction methods are:
- **Method A (Full-height sides):** Side panels run the full external height. Top and bottom panels sit between the sides.
- **Method B (Full-width top/bottom):** Top and bottom panels run the full external width. Side panels sit between the top and bottom.

## Decision

Use the following formulas for carcass part cut dimensions (before edge banding subtraction per ADR-008):

### Method A — Full-height sides

```
Side panel:     length = external_H,           width = external_D
Top panel:      length = external_W - (2 * sideThickness),  width = external_D - backThickness
Bottom panel:   length = external_W - (2 * sideThickness),  width = external_D - backThickness
Back panel:     length = external_W - backPanelOverlap,     width = external_H - backPanelOverlap
```

Where `backPanelOverlap` is typically 6mm (3mm rebate on each side) for a recessed back panel. V1 uses a fixed 6mm overlap.

### Method B — Full-width top/bottom

```
Side panel:     length = external_H - (topThickness + bottomThickness),  width = external_D - backThickness
Top panel:      length = external_W,                                     width = external_D - backThickness
Bottom panel:   length = external_W,                                     width = external_D - backThickness
Back panel:     length = external_W - backPanelOverlap,                 width = external_H - backPanelOverlap
```

### Assumptions

- All boxes are rectangular prisms. No curved or angled parts in V1.
- Back panel is recessed (sits inside the carcass). Face-mounted back panels are deferred (OQ-1).
- Each part type has a single quantity of 1 per box face, except:
  - Sides: always 2 per box
  - Top: 1 per box
  - Bottom: 1 per box
  - Back: 1 per box
  - Internal shelves: variable quantity specified by the user
- Internal shelf dimensions follow the same width calculation as top/bottom panels for their position.

### Edge banding

Edge banding is subtracted from the cut dimension per ADR-008. The part calculation outputs the nominal dimension; edge banding subtraction is applied as a post-processing step within the same function.

## Options Considered

- **Per-face thickness model:** Each face (left side, right side, top, bottom) can have a different material thickness. Adds flexibility but increases UI complexity and cognitive load. Deferred to V2.
- **Per-type thickness model (chosen):** All side panels share one thickness, all tops/bottoms share one thickness, back panel has one thickness. Matches how plywood is purchased (by sheet grade and thickness).
- **Include glue-up offset:** Add 0.5-1mm per joint for glue thickness. Too fine-grained for V1. Woodworkers already account for glue gaps in practice.

## Trade-off Analysis

The per-type thickness model is the right balance. In real-world cabinet making, sides, tops, and bottoms are cut from the same sheet grade and thickness in the vast majority of cases. Allowing per-face variation would add UI complexity without proportional benefit for V1.

The back panel is the most commonly different thickness (3mm MDF or plywood vs 15-18mm carcass sheets), so it gets its own thickness value.

## Consequences

- `calculateCarcassParts()` returns an array of Part objects
- Each Part has: `{ id, type, label, cutLength, cutWidth, quantity, materialThickness, edgeBandingEdges[] }`
- The function accepts `thicknesses: { side, top, bottom, back }` — per-type, not per-face
- Internal shelves use the `top`/`bottom` thickness by default but can be overridden per the thickness presets
- Back panel rebate is fixed at 6mm (3mm each side) for V1. Variable rebate is deferred.
- Unit tests must verify both construction methods produce correct internal clearance: `internal_W = external_W - (2 * sideThickness)` for Method A

## Action Items

- [x] Implement `calculateCarcassParts()` in `src/engine/parts.js`
- [x] Add unit tests for Method A with equal thicknesses
- [x] Add unit tests for Method A with mixed thicknesses
- [x] Add unit tests for Method B with equal thicknesses
- [x] Add unit tests for Method B with mixed thicknesses
- [x] Add unit tests for internal shelves
- [x] Add unit tests verifying internal clearance is consistent between methods
- [x] Add unit tests for edge banding subtraction on carcass parts
