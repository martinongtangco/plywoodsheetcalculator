# V1 Feature Specification

This document is the source of truth for what ply-calc V1 does. If code disagrees with this spec, the spec wins unless an ADR supersedes it.

## 1. Product Overview

Ply-calc is a client-side-only web application that calculates cut lists for plywood cabinet boxes and generates 2D sheet layouts. It takes cabinet dimensions and configuration as input, computes the parts required, and outputs a cut list with a visual laying plan on standard sheet sizes.

**V1 scope:** Frameless (European) cabinet style, metric-only, single sheet size per material, localStorage persistence, fully offline after first load.

**V1 does NOT include:** The items in `docs/decisions/DEFERRED.md` are explicitly out of scope for V1.

---

## 2. Data Model

### 2.1 Project

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID v4) | Unique identifier |
| `name` | `string` | User-provided project name |
| `createdAt` | `number` | Unix timestamp (ms) |
| `updatedAt` | `number` | Unix timestamp (ms) |
| `sheetSize` | `{ width: number, length: number, id: string }` | Sheet dimensions in mm; `id` references a preset from `src/presets/sheets.js` |
| `kerf` | `number` | Blade kerf width in mm (default 3.2) |
| `grainConstraint` | `'hard' \| 'soft'` | Grain direction constraint for layout |
| `boxes` | `Box[]` | Array of box definitions |

### 2.2 Box

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID v4) | Unique identifier |
| `name` | `string` | e.g., "Base Cabinet Left" |
| `quantity` | `number` | Number of identical boxes (default 1, min 1) |
| `externalWidth` | `number` | External width in mm |
| `externalHeight` | `number` | External height in mm |
| `externalDepth` | `number` | External depth in mm |
| `constructionMethod` | `'A' \| 'B'` | Method A: sides run full external height. Method B: top and bottom run full external width |
| `thicknesses` | `ThicknessSet` | Material thickness per part type |

#### ThicknessSet

| Field | Type | Description |
|-------|------|-------------|
| `side` | `number` | Side panel thickness in mm |
| `top` | `number` | Top panel thickness in mm |
| `bottom` | `number` | Bottom panel thickness in mm |
| `back` | `number` | Back panel thickness in mm |

Values are selected from presets in `src/presets/thicknesses.js`. Default presets include 15mm, 18mm, 25mm, and 3mm (for back panels).

#### Edge Banding

| Field | Type | Description |
|-------|------|-------------|
| `thickness` | `number` | Edge banding thickness in mm (default 2) |
| `edges` | `EdgeBandMap` | Which edges receive edge banding |

#### EdgeBandMap

A map keyed by part type (`side`, `top`, `bottom`, `back`) to an object with boolean flags for each edge:

```js
{
  side: { top: false, bottom: false, front: false },
  top: { left: false, right: false, front: true },
  bottom: { left: false, right: false, front: false },
  back: {}
}
```

**Rule:** Edge banding is added *after* cutting. The cut dimension = finished dimension − edge banding thickness on that edge.

### 2.3 Internal Shelves

| Field | Type | Description |
|-------|------|-------------|
| `heightFromBottom` | `number` | Position measured from the inside bottom in mm |
| `quantity` | `number` | Number of identical shelves at this position |

A shelf has the same thickness as `thicknesses.top` (shares material with top/bottom).

Shelf cut dimensions:
- **Length** = `externalWidth − 2 × thicknesses.side` (spans between sides)
- **Width** = `externalDepth` (full depth)

### 2.4 Drawer Configurations within a Box

| Field | Type | Description |
|-------|------|-------------|
| `height` | `number` | Drawer box height in mm |
| `trackType` | `string` | Track type preset (determines side thickness, default 15mm) |
| `thicknesses.side` | `number` | Drawer side thickness in mm |
| `thicknesses.frontBack` | `number` | Drawer front/back thickness in mm |
| `thicknesses.base` | `number` | Drawer base (floor) thickness in mm |
| `backSetback` | `number` | Distance from front of drawer to back panel in mm |
| `baseInsets` | `{ front: number, back: number, left: number, right: number }` | Base panel insets per edge in mm |
| `faceWidth` | `number` | Drawer face width in mm (manual input in V1) |
| `faceHeight` | `number` | Drawer face height in mm (manual input in V1) |

A box can contain multiple drawer configurations. Each drawer config includes a `quantity` field.

### 2.5 Presets

#### Sheet Sizes (`src/presets/sheets.js`)

Common regional sheet sizes. Width is the shorter edge, length is the longer edge.

| id | name | width (mm) | length (mm) |
|----|------|-----------|-------------|
| `mfc_4x8` | MFC 4×8 | 1220 | 2440 |
| `mfc_4x6` | MFC 4×6 | 1220 | 1830 |
| `mfc_3x6` | MFC 3×6 | 760 | 1830 |

#### Thicknesses (`src/presets/thicknesses.js`)

| id | value (mm) | label |
|----|-----------|-------|
| `t15` | 15 | 15mm |
| `t18` | 18 | 18mm |
| `t25` | 25 | 25mm |
| `t3` | 3 | 3mm (back panel) |

---

## 3. Part Calculations

### 3.1 Carcass Parts (ADR-010)

#### Method A — Full-height sides

Sides run full external height. Top and bottom sit between sides.

| Part | Cut Length | Cut Width |
|------|-----------|-----------|
| Side (×2) | `externalHeight` | `externalDepth` |
| Top | `externalWidth − 2 × thicknesses.side` | `externalDepth` |
| Bottom | `externalWidth − 2 × thicknesses.side` | `externalDepth` |
| Back | `externalWidth − 2 × thicknesses.side` | `externalHeight − 2 × thicknesses.top` |

**Note:** Back panel is recessed (sits inside the carcass). Back height clears top and bottom.

#### Method B — Full-width top and bottom

Top and bottom run full external width. Sides sit between them.

| Part | Cut Length | Cut Width |
|------|-----------|-----------|
| Top | `externalWidth` | `externalDepth` |
| Bottom | `externalWidth` | `externalDepth` |
| Side (×2) | `externalHeight − 2 × thicknesses.top` | `externalDepth` |
| Back | `externalWidth − 2 × thicknesses.side` | `externalHeight − 2 × thicknesses.top` |

### 3.2 Edge Banding Adjustment

When edge banding is applied to an edge, subtract the edge banding thickness from the cut dimension on that edge.

Example: A top panel with front edge banding of 2mm:
- Cut width = `externalDepth − 2` (front edge will be covered by 2mm band)

### 3.3 Internal Shelf Parts

| Part | Cut Length | Cut Width |
|------|-----------|-----------|
| Shelf | `externalWidth − 2 × thicknesses.side` | `externalDepth` |

### 3.4 Drawer Parts (ADR-011)

| Part | Cut Length | Cut Width |
|------|-----------|-----------|
| Side (×2) | `backSetback − thicknesses.frontBack` | `height − thicknesses.base − baseInsets.front` |
| Front | `backSetback` | `height − 2 × thicknesses.base − baseInsets.front − baseInsets.back` |
| Back | `backSetback` | `height − 2 × thicknesses.base − baseInsets.front − baseInsets.back` |
| Base | `height − 2 × thicknesses.side − baseInsets.left − baseInsets.right` | `backSetback − 2 × thicknesses.frontBack − baseInsets.front − baseInsets.back` |
| Face | `faceWidth` | `faceHeight` |

---

## 4. Cut List

### 4.1 Structure

The cut list is an array of `CutItem` objects, grouped by material thickness:

```js
{
  id: string,           // UUID
  partName: string,     // "Side", "Top", "Shelf", etc.
  boxName: string,      // Parent box name
  length: number,       // Cut length in mm
  width: number,        // Cut width in mm
  thickness: number,    // Material thickness in mm
  quantity: number,     // How many identical pieces
  edgeBanding: string[], // Edges with banding, e.g. ["front"]
  grainDirection: 'lengthwise' | 'crosswise' | null
}
```

### 4.2 Grain Direction

- **lengthwise** = fibres run along the long dimension of the sheet. A part placed "with grain" has its longest dimension aligned with the sheet's length.
- **crosswise** = fibres run along the short dimension.
- **null** = grain direction is not constrained (soft mode).

Default assignment: the longest dimension of the part aligns with the sheet's length (lengthwise grain).

---

## 5. Sheet Layout

### 5.1 Batch/Strip Cut Strategy (ADR-012)

The layout uses a batch/strip cut approach:

1. Parts are grouped by identical width into strips.
2. Each strip is cut from the sheet, producing multiple parts from a single strip.
3. Kerf is accounted for between adjacent parts in a strip and between strips.
4. The kerf is subtracted from available space on the sheet, not from part dimensions.

### 5.2 Balanced Layout Strategy (ADR-013)

When multiple materials are used, the layout attempts to balance usage across sheets. The goal is to minimize the total number of sheets purchased, not to optimize each material independently.

### 5.3 Grain Constraint Modes

- **Hard mode:** All parts must respect their grain direction. A part marked "lengthwise" cannot be rotated 90°.
- **Soft mode:** Parts may be rotated 90° if it improves packing efficiency.

### 5.4 Sheet Size Alignment

All sheet sizes use the convention: width is the shorter edge, length is the longer edge. This ensures consistent placement logic regardless of actual dimensions.

---

## 6. UI Screens

### 6.1 Project List

- Displays all saved projects from localStorage
- Actions: Create new project, Open project, Delete project, Import JSON
- Shows project name, last modified date

### 6.2 Box Configuration (ADR-016)

Accordion-style list of boxes. Each box is a collapsible card with sections:

1. **Basic Info** — name, quantity
2. **External Dimensions** — width, height, depth (mm)
3. **Construction Method** — radio buttons (Method A / Method B) with diagrams
4. **Material Thicknesses** — dropdowns for side, top, bottom, back from presets
5. **Edge Banding** — thickness selector + checkboxes per part per edge
6. **Internal Shelves** — list of { heightFromBottom, quantity } with add/remove
7. **Drawers** — list with add/remove, each with inline drawer config

All numeric inputs use `type="number"` with `step="1"` (1mm precision). Labels show "(mm)" inline.

### 6.3 Output Display (ADR-017)

Displays:

1. **Cut List Table** — sortable, grouped by material thickness
   - Columns: Part Name, Box Name, Length, Width, Thickness, Quantity, Edge Banding, Grain
2. **Sheet Layout Visualization** — 2D SVG rendering of parts placed on sheets
3. **Summary** — total parts count, sheet usage percentage, offcut inventory
4. **Export Actions** — Download PDF, Export JSON

---

## 7. Data Persistence (ADR-006)

- All data persisted via browser `localStorage` using Zustand's `persist` middleware
- localStorage key: `ply-calc-projects`
- No backend, no accounts, fully offline after first load
- **JSON export:** Produces a `.json` file containing the full project state
- **JSON import:** Reads a `.json` file and replaces the current project state
- Size limit ~5–10 MB per browser

---

## 8. PDF Output (ADR-003)

- Generated client-side with `pdf-lib`
- Contains: cut list table, sheet layout diagrams
- Generated on-demand (no background jobs)
- Fully offline

---

## 9. Testing (ADR-009)

- Vitest as the unit testing framework
- Tests in `tests/engine/` mirroring `src/engine/` structure
- All engine functions require at least one happy-path test and one edge-case test
- `npm test` runs the full suite

---

## 10. Constraints

### 10.1 Metric Only

No imperial units. If the user provides dimensions in imperial, convert to mm silently and state the conversion. Never store or display imperial values.

### 10.2 Construction Method

- **Method A:** Sides run full external height. Top and bottom sit between them.
- **Method B:** Top and bottom run full external width. Sides sit between them.

### 10.3 Back Panel

Back panels are recessed (sit inside the carcass). Face-mounted back panels are not supported in V1.

### 10.4 Drawer Sides

Default drawer side thickness is 15mm. Never assume 18mm without checking the drawer config.

### 10.5 Material Thickness

Use presets from `src/presets/thicknesses.js`. If no preset matches, use `null` and require user input.

### 10.6 Engine Architecture

- All calculation logic lives in `src/engine/` as pure functions
- No React, Zustand, or DOM imports in `src/engine/`
- Components import engine functions; they do not contain calculation logic
- All engine functions require tests

### 10.7 Deferred Features

Features in `docs/decisions/DEFERRED.md` are V2+ only and must not be implemented in V1.

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| Carcass | The box structure of a cabinet (sides, top, bottom, back) |
| Kerf | The material removed by a saw blade during cutting |
| Edge banding | Thin material applied to exposed edges of sheet goods |
| Recessed back | Back panel sits inside the carcass frame |
| Grain direction | The orientation of wood fibres relative to a part |
| Sheet width | The shorter edge of a sheet |
| Sheet length | The longer edge of a sheet |
| Frameless (European) | Cabinet style without a face frame |