# ADR-016: Box Configuration UI

**Status:** Proposed
**Date:** 2026-07-03
**Deciders:** Open Source Maintainers

## Context

The Boxes tab is the primary input screen where users define the cabinet boxes that make up a project. Each box has external dimensions, a construction method (A or B), material thicknesses per part type, edge banding configuration, internal shelves, and optional drawer configurations.

The data model for Box is defined in ADR-014. The carcass and drawer calculation logic is implemented per ADR-010 and ADR-011. The UI must collect all required fields and present them in a form that is intuitive for cabinet makers.

## Decision

Use an accordion-style list where each box is a collapsible card. Adding a box creates a new entry with default values. Each box card shows a summary header and expands to reveal configuration sections.

### Component: `BoxConfig.jsx`

```jsx
// Top-level structure
<BoxConfig>
  <BoxListSummary />    {/* Shows count, total parts estimate */}
  <AddBoxButton />
  <BoxCard key={box.id} box={box} />
  <BoxCard key={box.id} box={box} />
  ...
</BoxConfig>
```

### BoxCard Sections

Each expanded `BoxCard` contains these sections in order:

1. **Basic Info** — name, quantity
2. **External Dimensions** — width, height, depth (mm)
3. **Construction Method** — radio group: Method A (sides full height) or Method B (top/bottom full width)
4. **Material Thicknesses** — side, top, bottom, back (dropdown from `src/presets/thicknesses.js`)
5. **Edge Banding** — thickness selector, then checkboxes per part type for which edges
6. **Internal Shelves** — list of { heightFromBottom, quantity } with add/remove
7. **Drawers** — list of DrawerConfig with add/remove, each drawer has a DrawerConfigInline sub-form

### DrawerConfigInline

An inline drawer configuration form within the box card:
- Height (mm)
- Track type (dropdown from `src/presets/trackTypes.js`)
- Side thickness, front/back thickness, base thickness (dropdown from thickness presets)
- Back setback (mm)
- Base insets (mm)

### Default Values

When a new box is created, use these defaults:
```js
{
  name: `Box ${n}`,
  quantity: 1,
  externalWidth: 600,
  externalHeight: 720,
  externalDepth: 570,
  constructionMethod: 'A',
  thicknesses: { side: 18, top: 18, bottom: 18, back: 12 },
  edgeBanding: {
    thickness: 2,
    edges: { side: ['front'], top: ['left', 'right'], bottom: ['left', 'right'] }
  },
  internalShelves: [],
}
```

Defaults for new drawer:
```js
{
  drawerHeight: 150,
  trackType: '15mm_side',
  thicknesses: { side: 15, frontBack: 18, base: 5 },
  backSetback: 0,
  baseInsetFromSide: 1,
  baseInsetFromFront: 1,
}
```

### Input Pattern

All numeric inputs use `type="number"` with `step="1"` (1mm precision). Labels show the unit "(mm)" inline. Thickness selectors use `<select>` populated from `src/presets/thicknesses.js`.

Construction method uses radio buttons with a small diagram:
- Method A: sides run full height
- Method B: top/bottom run full width

## Options Considered

- **Modal-based editing (rejected):** A modal for each box would be harder to manage with multiple boxes open and would require a separate state management pattern.
- **Separate edit screen (rejected):** Navigating away from the box list to edit one box breaks the overview. Accordion cards keep everything visible.
- **Inline accordion (chosen):** Keeps all boxes in a single scrollable list. Collapsed boxes show a summary. Expanded boxes show full configuration.

## Trade-off Analysis

The accordion approach can become long with many boxes, but this is mitigated by collapsible cards showing summary info. The inline drawer config keeps the drawer configuration contextually tied to its parent box rather than on a separate screen.

All data is written directly to the Zustand store on every input change (controlled components). This means the project is always in a valid state — no "save" button needed per box.

## Consequences

- `projectStore` needs actions: `addBox()`, `updateBox(id, data)`, `removeBox(id)`, `addDrawer(boxId, drawer)`, `updateDrawer(boxId, drawerId, data)`, `removeDrawer(boxId, drawerId)`
- `projectStore` needs actions: `addShelf(boxId, shelf)`, `updateShelf(boxId, shelfId, data)`, `removeShelf(boxId, shelfId)`
- Thickness presets imported from `src/presets/thicknesses.js`
- Track type presets imported from `src/presets/trackTypes.js`
- All inputs are metric-only (ADR-001)
- Edge banding UI follows ADR-008 model (per-part-type, per-edge)

## Action Items

- [ ] Add box CRUD actions to `projectStore` (`addBox`, `updateBox`, `removeBox`)
- [ ] Add drawer CRUD actions to `projectStore` (`addDrawer`, `updateDrawer`, `removeDrawer`)
- [ ] Add shelf CRUD actions to `projectStore` (`addShelf`, `updateShelf`, `removeShelf`)
- [ ] Create `BoxConfig.jsx` with accordion layout
- [ ] Create `BoxCard.jsx` with collapsible sections
- [ ] Create `DrawerConfigInline.jsx` sub-component
- [ ] Create `ShelfRow.jsx` sub-component
- [ ] Wire thickness presets from `src/presets/thicknesses.js`
- [ ] Wire track type presets from `src/presets/trackTypes.js`
- [ ] Add unit tests for box CRUD store actions