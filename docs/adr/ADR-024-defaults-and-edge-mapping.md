# ADR-024: Explicit `cutMode` Default and Edge Naming Mapping

**Status:** Accepted
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-008 (Kerf & Edge Banding Model), ADR-014 (Project Data Model), ADR-015 (UI Integration Architecture)

## Context

This ADR addresses two related gaps in the project defaults and data flow:

### Gap 1: Missing `cutMode` in Default Project

The `defaultProject()` function in `src/utils/validate.js` (L54-68) does not set a `cutMode` field:

```js
export function defaultProject() {
  return {
    id: uid(),
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    sheetSize: { width: 1220, length: 2440, id: 'standard_18mm' },
    kerf: 3,
    grainConstraint: 'soft',
    boxes: [],
    drawers: [],
    groups: [],
    // cutMode is NOT set
  };
}
```

The `runLayout` action in `projectStore.js` (L532) reads `project.cutMode || 'balanced'`, meaning the field is implicitly optional. While this works, it creates a隐 (hidden) dependency on the fallback:
- The data model (ADR-014) should explicitly define all fields
- Import/export round-trips will not include `cutMode` on projects created before this field was added
- A future change removing the `|| 'balanced'` fallback would silently break new projects

### Gap 2: Edge Banding Naming Mismatch

The UI and the engine use different naming conventions for edge banding edges:

**UI (`src/components/BoxConfig.jsx`, L31-45):**
Uses semantic, user-facing names: `'front'`, `'back'`, `'left'`, `'right'`

**Engine (`src/engine/parts.js`):**
Expects coordinate-based names: `'length+'`, `'length-'`, `'width+'`, `'width-'`

The current code passes the UI edge names directly to the engine (via `box.edgeBanding.edges` in `calculateAllParts`, L456-461). The engine's `applyEdgeBanding()` function checks for these edge names against its coordinate-based expectations. If the names do not match, edge banding is silently ignored — no error, no warning, just incorrect cut dimensions.

There is no explicit mapping layer, no documentation of the expected contract, and no test verifying the translation.

## Decision

### Part A: Add `cutMode: 'balanced'` to `defaultProject()`

```js
export function defaultProject() {
  return {
    // ... existing fields
    cutMode: 'balanced',  // NEW: explicit default
    grainConstraint: 'soft',
    // ...
  };
}
```

This makes the default explicit in the data model. The `|| 'balanced'` fallback in `runLayout` can remain as a safety net for legacy projects loaded from localStorage.

### Part B: Create Edge Name Mapping Function

Create `src/utils/edgeNames.js` with two functions:

```js
/**
 * Map UI edge names to engine edge names for a given part type.
 *
 * UI names: 'front', 'back', 'left', 'right' (user-facing, semantic)
 * Engine names: 'length+', 'length-', 'width+', 'width-' (coordinate-based)
 *
 * The mapping depends on the part type because "front" means different
 * things for a side panel versus a top panel.
 *
 * @param {string} partType - 'side' | 'top' | 'bottom'
 * @param {string} uiEdge - 'front' | 'back' | 'left' | 'right'
 * @returns {string|null} Engine edge name, or null if no mapping exists
 */
export function uiEdgeToEngineEdge(partType, uiEdge) { /* ... */ }

/**
 * Map engine edge names back to UI edge names (for display in cut list).
 *
 * @param {string} partType - 'side' | 'top' | 'bottom'
 * @param {string} engineEdge - 'length+' | 'length-' | 'width+' | 'width-'
 * @returns {string|null} UI edge name, or null if no mapping exists
 */
export function engineEdgeToUiEdge(partType, engineEdge) { /* ... */ }
```

The mapping will be applied in `calculateAllParts()` when passing `edgeBanding.edges` to `calculateCarcassParts()`, and in the cut list display when rendering edge banding info back to the user.

### Mapping Table

| Part Type | UI Edge | Engine Edge | Rationale |
|---|---|---|---|
| `side` | `front` | `width+` | Front edge of side = positive width axis |
| `side` | `back` | `width-` | Back edge of side = negative width axis |
| `top` | `left` | `length-` | Left edge of top = negative length axis |
| `top` | `right` | `length+` | Right edge of top = positive length axis |
| `top` | `back` | `width-` | Back edge of top = negative width axis |
| `bottom` | `left` | `length-` | Left edge of bottom = negative length axis |
| `bottom` | `right` | `length+` | Right edge of bottom = positive length axis |

**Note:** The exact mapping must be verified against the current engine implementation. If the current engine already uses UI names internally, this mapping becomes a no-op pass-through, but the explicit function still documents the contract.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Explicit mapping function (chosen)** | Documents the contract, testable, reversible | Requires a new file and integration points |
| **Use engine names in the UI** | No mapping needed | Confusing for users ("length+" is not intuitive) |
| **Change engine to use UI names** | Engine becomes more user-friendly | Breaking change to engine API; larger refactor |
| **Do nothing** | Zero effort | Silent incorrect behaviour; undocumented contract |

## Trade-off Analysis

The mapping function is a small investment (one file, ~50 lines including tests) that eliminates a silent failure mode. Even if the current engine and UI happen to use the same names by coincidence, the explicit mapping documents the intent and prevents future regressions if either side changes independently.

## Consequences

- `defaultProject()` explicitly sets `cutMode: 'balanced'`
- New projects have `cutMode` in their serialized data
- `src/utils/edgeNames.js` provides the single source of truth for edge name translation
- `calculateAllParts()` uses the mapping when passing edge data to the engine
- Cut list display uses the reverse mapping for user-facing output
- A test file `tests/utils/edgeNames.test.js` verifies all mapping combinations

## Action Items

- [x] Add `cutMode: 'balanced'` to `defaultProject()` in `src/utils/validate.js`
- [x] Create `src/utils/edgeNames.js` with mapping functions
- [x] Verify current engine edge name expectations in `src/engine/parts.js`
- [x] Update `calculateAllParts()` to map UI edges to engine edges
- [x] Update cut list display to map engine edges back to UI names
- [x] Create `tests/utils/edgeNames.test.js`
- [ ] Update ADR-014 data model to include `cutMode` field
