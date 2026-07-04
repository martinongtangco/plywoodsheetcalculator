# ADR-011: Drawer Part Calculation Model

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

Drawer boxes are calculated independently from the cabinet carcass but depend on the cabinet's internal dimensions. A drawer must fit within the cabinet opening with appropriate clearances for slide operation. The drawer box consists of five parts: two sides, a front/back frame, and a base panel. The calculation must account for slide type clearance and base panel positioning.

Key constraints:
- Drawer sides ride on slide tracks, so the drawer width must account for track clearance.
- Drawer base panels are typically thinner (6-12mm) than drawer sides (15-18mm).
- The base panel sits in a groove or on a ledge, typically recessed from the drawer interior.

## Decision

Use the following formulas for drawer part cut dimensions:

### Drawer Box Dimensions

```
Internal width  = cabinetInternalWidth - (trackClearancePerSide * 2)
Internal depth  = cabinetInternalDepth - drawerBackSetback
Internal height = drawerHeight - bottomThickness
```

### Drawer Part Cut Dimensions

```
Drawer side (qty 2):
  length = internalWidth
  width  = internalHeight

Drawer front/back:
  length = internalWidth + (2 * drawerSideThickness)
  width  = drawerHeight

Drawer base:
  length = internalWidth - (2 * baseInsetFromSide)
  width  = internalDepth - baseInsetFromFront
```

Where:
- `trackClearancePerSide` comes from the track type preset (default 12.5mm per side for 15mm side panels on standard undermount slides)
- `drawerBackSetback` is the distance the drawer does not use at the back of the cabinet (default 20mm for cable/access clearance)
- `baseInsetFromSide` is typically equal to `drawerSideThickness / 2` for a centered base, or the groove depth if grooved construction is used
- `baseInsetFromFront` is typically 0mm for base-to-front construction, or equals `drawerFrontThickness` if the base sits behind the front

### Drawer Side Thickness

Default drawer side thickness is 15mm. The track type preset may specify 18mm for certain full-extension slides. The `trackTypes.js` preset file provides `sideThickness` per track type.

### Quantities

- Drawer sides: 2 per drawer
- Drawer front/back: 1 per drawer (the back; the front is the drawer face which is user-specified)
- Drawer base: 1 per drawer

### Edge Banding

Drawer sides typically have edge banding on the front vertical edge where the drawer front attaches. This is handled per ADR-008.

## Options Considered

- **Groove-based base construction:** Base panel sits in a routed groove on drawer sides. Requires knowing groove depth and position. More complex but more common in production cabinetry. Deferred to V2 — V1 assumes base sits on a ledge at the front.
- **Ledge-based base construction (chosen):** Base panel sits on a nailed/screwed ledge at the front of the drawer. Simpler geometry. Base width is measured from the back of the front panel to the back of the drawer.
- **Undermount slide variant positioning:** Different slide brands position the base panel at different offsets from the drawer bottom. V1 uses a user-specified `base_offset` value. V2 will auto-calculate from slide model (OQ-5).

## Trade-off Analysis

Ledge-based construction is simpler and produces correct results for the majority of drawer builds. Groove-based construction adds variables (groove depth, groove position from edge) that most DIY woodworkers do not measure precisely. The ledge model is a safe default.

The 15mm default for drawer sides matches the most common undermount slide systems (Blum ANTRAGLIDE, Hettich undermount, etc.). The preset system allows overrides for 18mm systems.

## Consequences

- `calculateDrawerParts()` returns an array of Part objects, one set per drawer in the configuration
- Each Part has: `{ id, type, label, cutLength, cutWidth, quantity, materialThickness, edgeBandingEdges[] }`
- The function accepts `drawerConfig`, `internalDims`, `thicknesses`, and `edgeBanding`
- Drawer parts are added to the global cut list alongside carcass parts for sheet layout
- Unit tests must verify: (a) track clearance is correctly subtracted, (b) drawer fits within cabinet opening, (c) base panel dimensions account for insets

## Action Items

- [x] Implement `calculateDrawerParts()` in `src/engine/parts.js`
- [x] Add unit tests for standard 15mm drawer with undermount slides
- [x] Add unit tests for 18mm drawer with side-mount slides
- [x] Add unit tests for drawer back setback
- [x] Add unit tests for base panel inset calculations
- [x] Add unit tests for multiple drawers in one cabinet
- [x] Add unit tests for edge banding on drawer sides
