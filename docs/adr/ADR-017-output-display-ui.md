# ADR-017: Output Display UI

**Status:** Accepted
**Date:** 2026-07-03
**Deciders:** Open Source Maintainers

## Context

Once the user has configured boxes, materials, and cut settings, the Output tab must display the results of the engine calculations: a cut list (flat table of all parts) and a sheet layout (2D diagram showing part placements on each sheet).

The engine functions `calculateCarcassParts()` (ADR-010) and `calculateDrawerParts()` (ADR-011) produce Part objects. The layout functions `batchLayout()` (ADR-012), `balancedLayout()` (ADR-013), and `optimisedLayout()` (ADR-009) produce SheetLayout objects with placements and offcuts.

The `SheetLayoutDiagram.jsx` component already exists and renders SVG diagrams. The `CutList.jsx` and `SheetLayoutView.jsx` components need to be created.

## Decision

The Output tab contains two sections controlled by a sub-tab or toggle: **Cut List** view and **Sheet Layout** view. A "Calculate" button at the top triggers the engine.

### Section 1: Cut List (`CutList.jsx`)

Displays all calculated parts as a sortable table.

| Column | Source | Notes |
|--------|--------|-------|
| Label | `Part.label` | e.g., "Side Panel — Box 1" |
| Type | `Part.type` | side, top, bottom, back, shelf, drawer_side, etc. |
| Cut Length | `Part.cutLength` | mm, the dimension to set on the saw fence |
| Cut Width | `Part.cutWidth` | mm |
| Qty | `Part.quantity` | Total quantity including box multiplier |
| Thickness | `Part.materialThickness` | mm |
| Edge Banding | `Part.edgeBandingEdges` | Comma-separated, e.g., "front" or "—" if empty |

Features:
- Click column headers to sort ascending/descending
- Grouped by Box (collapsible sections)
- Summary row at bottom: total parts count, total area
- Export button: download cut list as CSV

### Section 2: Sheet Layout (`SheetLayoutView.jsx`)

Wraps the existing `SheetLayoutDiagram.jsx` with controls and metadata.

```jsx
<SheetLayoutView>
  <LayoutControls />     {/* Mode selector, grain constraint, run button */}
  <SheetSummary />        {/* Number of sheets, overall utilisation */}
  {sheetLayouts.map(layout => (
    <SheetLayoutDiagram key={layout.sheetIndex} layout={layout} />
  ))}
</SheetLayoutView>
```

`LayoutControls` contains:
- Cut mode selector: radio group for batch / balanced / optimised
- Grain constraint toggle: hard / soft
- "Run Layout" button
- Sheet size display (read-only, mirrors Materials tab)

`SheetSummary` displays:
- Total sheets required
- Overall utilisation percentage (weighted average)
- Total offcut area

### Calculate Flow

1. User clicks "Calculate" button on Output tab.
2. `projectStore.calculateAllParts()` is called.
3. For each box in the project, `calculateCarcassParts(box)` is called.
4. For each drawer config, `calculateDrawerParts(drawer)` is called.
5. All Part arrays are merged and stored in `project.calculatedParts`.
6. If `cutMode` is set, `runLayout()` is automatically triggered after calculation.
7. The selected layout function is called with `calculatedParts`, `sheetSize`, `kerf`, and `grainConstraint`.
8. Result stored in `project.sheetLayouts`.
9. Components re-render from store selectors.

### Error Handling

- If validation fails (boxes tab empty, no sheet size, etc.), show an error banner listing missing fields with links to the relevant tab.
- If a part is too large to fit on any sheet, show a warning row in the cut list.
- If layout cannot place all parts (should not happen with unlimited sheets), show a warning with unplaced parts count.

## Options Considered

- **Single scrollable page (rejected):** Cut list and sheet layout on one long page makes it hard to focus. Toggle keeps the view clean.
- **Side-by-side split (rejected):** Table + diagram side by side doesn't work well on mobile and the diagram needs full width.
- **Sub-tab toggle (chosen):** Clean separation, works on all screen sizes, easy to navigate.

## Trade-off Analysis

The automatic layout-after-calculate behaviour saves a click but means the layout runs every time calculate is clicked. This is acceptable because the layout algorithms are fast for V1-scale projects (dozens to hundreds of parts). If performance becomes an issue, the auto-layout can be made conditional.

## Consequences

- `projectStore` must expose `calculatedParts` and `sheetLayouts` as selectors
- `CutList.jsx` needs a CSV export function (reuses `downloadFile` from `src/utils/fileIO.js`)
- `SheetLayoutView.jsx` imports `SheetLayoutDiagram.jsx` (already exists)
- Layout mode and grain constraint read from the active project, set via the Cut Settings tab
- PDF export (ADR-003) will consume the same data, triggered from a separate "Export PDF" button

## Action Items

- [x] Create `CutList.jsx` component with sortable table
- [x] Add CSV export to `CutList.jsx`
- [x] Create `SheetLayoutView.jsx` component with layout controls
- [x] Add `calculateAllParts()` action to `projectStore`
- [x] Add `runLayout()` action to `projectStore`
- [x] Add validation banner in Output tab
- [x] Wire "Calculate" and "Run Layout" buttons
- [x] Add error handling for oversized parts
- [x] Add unit tests for `calculateAllParts` store action
- [x] Add unit tests for `runLayout` store action
