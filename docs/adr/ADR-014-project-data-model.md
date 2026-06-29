# ADR-014: Project Data Model

**Status:** Proposed
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

The application manages a hierarchical data structure: a Project contains multiple Boxes, each Box contains carcass dimensions and optional DrawerConfigurations, and each DrawerConfiguration produces drawer parts. The data model must support:
- Multiple boxes per project (e.g., a kitchen with 8 cabinets)
- Multiple drawers per box
- Per-box material thickness overrides
- Per-project sheet size and kerf settings
- JSON export/import round-tripping
- localStorage persistence via Zustand persist middleware

The data model must be serializable to JSON with no circular references, no functions, and no non-serializable types (Date, Map, Set, etc.).

## Decision

Use the following data model:

### Project

```js
{
  id: string,              // UUID v4
  name: string,            // User-provided project name
  createdAt: number,       // Unix timestamp (serializable)
  updatedAt: number,       // Unix timestamp (serializable)
  sheetSize: { width: number, length: number, id: string },  // mm, id references presets
  kerf: number,            // mm, references presets or custom
  grainConstraint: 'hard' | 'soft',
  boxes: Box[],
  drawers: DrawerConfig[]
}
```

### Box

```js
{
  id: string,              // UUID v4
  name: string,            // e.g., "Base Cabinet Left", "Wall Cabinet Center"
  quantity: number,        // How many identical boxes (default 1)
  externalWidth: number,   // mm
  externalHeight: number,  // mm
  externalDepth: number,   // mm
  constructionMethod: 'A' | 'B',
  thicknesses: {
    side: number,          // mm, references presets
    top: number,           // mm, references presets
    bottom: number,        // mm, references presets
    back: number           // mm, references presets
  },
  edgeBanding: {
    thickness: number,     // mm, or null
    edges: {               // Which edges get banding per part type
      side: ['front'] | ['back'] | ['front', 'back'] | [],
      top: ['left'] | ['right'] | ['left', 'right'] | [],
      bottom: ['left'] | ['right'] | ['left', 'right'] | []
    }
  },
  internalShelves: [
    {
      id: string,
      heightFromBottom: number,  // mm — position within the box
      quantity: number
    }
  ]
}
```

### DrawerConfig

```js
{
  id: string,              // UUID v4
  boxId: string,           // References the parent Box
  quantity: number,        // How many identical drawers (default 1)
  drawerHeight: number,    // mm — internal opening height
  trackType: string,       // References presets/trackTypes.js
  trackClearancePerSide: number,  // mm, derived from trackType
  thicknesses: {
    side: number,          // mm, default 15
    frontBack: number,     // mm
    base: number           // mm
  },
  backSetback: number,     // mm — distance from cabinet back
  baseInsetFromSide: number,  // mm
  baseInsetFromFront: number  // mm
}
```

### Part (Engine Output — not persisted)

```js
{
  id: string,
  type: 'side' | 'top' | 'bottom' | 'back' | 'shelf' | 'drawer_side' | 'drawer_front_back' | 'drawer_base',
  label: string,           // Human-readable, e.g., "Side Panel — Base Cabinet Left"
  cutLength: number,       // mm — what to set on the saw fence
  cutWidth: number,        // mm
  quantity: number,
  materialThickness: number,  // mm
  edgeBandingEdges: string[]  // e.g., ['front']
}
```

### Screen Flow

The application has three screens managed by `uiStore`:

1. **Project Input** — Create/edit project, add boxes, configure drawers
2. **Cut List** — View calculated parts table with quantities and dimensions
3. **Sheet Layout** — View 2D sheet diagrams with part placements

Navigation is linear: Input → Cut List → Sheet Layout. The user can go back at any point.

## Options Considered

- **Flat part list (chosen at engine level):** The engine outputs a flat array of Part objects. The UI groups by box/drawer for display. This keeps the engine simple.
- **Nested part tree:** Parts are nested under their parent Box in the engine output. Adds coupling between engine and UI structure. More complex to flatten for sheet layout.
- **Box-level edge banding (chosen):** Edge banding is configured per box, applied to specific edges of specific part types. Simpler than per-part edge banding.
- **Per-part edge banding:** Each part individually specifies which edges get banding. More flexible but significantly more UI complexity. Deferred to V2.

## Trade-off Analysis

The flat part list from the engine keeps the calculation layer decoupled from the UI layer. The engine doesn't need to know about boxes or drawers — it just needs dimensions and thicknesses. The UI layer assembles the inputs and groups the outputs.

Per-box edge banding configuration is a practical compromise. Most boxes have the same banding pattern on all parts of the same type (e.g., all sides get front edge banding). Per-part banding is deferred to V2.

Unix timestamps instead of ISO strings keep the JSON smaller and avoid timezone confusion. The UI formats timestamps for display.

## Consequences

- `projectStore` holds the full `Project` object
- `uiStore` holds the current screen and navigation state
- Engine functions are called by a presenter/orchestrator layer that reads from the store and passes plain objects
- JSON export serializes the entire `Project` object
- JSON import validates the structure before merging into the store
- UUID v4 for all IDs (generated by a simple utility function, no heavy UUID library needed for V1)
- Unit tests for the data model: (a) round-trip serialization, (b) required field validation, (c) default value application

## Action Items

- [ ] Define JSDoc type annotations for Project, Box, DrawerConfig, Part
- [ ] Create data validation utility in `src/utils/validate.js`
- [ ] Create UUID generation utility in `src/utils/id.js`
- [ ] Implement default factory functions for Project, Box, DrawerConfig
- [ ] Add unit tests for data validation
- [ ] Add unit tests for JSON round-trip