# ADR-015: UI Integration Architecture

**Status:** Accepted
**Date:** 2026-07-03
**Deciders:** Open Source Maintainers

## Context

The engine layer (ADR-009 through ADR-014) is fully implemented with all calculation logic, layout algorithms, and data models. The Zustand stores (`projectStore`, `uiStore`) support the complete data model. However, the React UI components that let users interact with this data are still placeholder "coming soon" messages in `App.jsx`.

The application needs four functional tab views:
1. **Boxes** — add, edit, and configure cabinet boxes
2. **Materials** — select sheet size, kerf, and material settings
3. **Cut Settings** — choose layout mode (batch/balanced/optimised) and grain constraint
4. **Output** — display calculated cut list and rendered sheet layout diagrams

## Decision

Use a component-per-tab architecture where each tab is a standalone React component that reads from and writes to the Zustand stores. The engine is invoked on-demand via a `useCallback` or button click, not on every render.

### Component Structure

```
src/components/
  BoxConfig.jsx          ← Boxes tab
  MaterialConfig.jsx     ← Materials tab
  CutSettings.jsx        ← Cut Settings tab
  CutList.jsx            ← Output tab — parts table
  SheetLayoutView.jsx    ← Output tab — sheet diagram wrapper
  ProjectList.jsx        ← Already exists
  SheetLayoutDiagram.jsx ← Already exists (SVG renderer)
```

### Store Contract

Each component reads from the store using `useProjectStore` and `useUIStore` selectors. Components never import directly from `src/engine/`. Instead, they call store actions that invoke the engine.

```
Component → useProjectStore action → engine function → result stored → component re-renders
```

### Data Flow

1. User configures boxes, materials, and cut settings across the three input tabs.
2. User navigates to the Output tab.
3. A "Calculate" button triggers the store action `calculateAllParts()` which calls `calculateCarcassParts()` and `calculateDrawerParts()` for each box, flattening the results into the project's `parts` array.
4. A "Layout" button triggers `runLayout()` which calls the selected layout algorithm (batch/balanced/optimised).
5. Results are rendered from the store.

### Tab Validation

Each input tab shows a validation indicator (✓ / ✗) based on required fields:
- **Boxes**: at least one box with valid external dimensions
- **Materials**: sheetSize and kerf must be set
- **Cut Settings**: cutMode must be selected

The "Calculate" button on the Output tab is disabled until all three tabs pass validation.

## Options Considered

- **Direct engine imports in components (rejected):** Components would import `calculateCarcassParts` directly from `src/engine/`. This couples UI to engine and makes testing harder. The store-mediated approach keeps concerns separated.
- **Single monolithic editor (rejected):** One component handling all four tabs creates a massive file and makes code splitting impossible.
- **Form library (rejected):** Libraries like React Hook Form add bundle weight. The forms are simple enough for controlled inputs with Zustand.

## Trade-off Analysis

The store-mediated approach adds a thin orchestration layer in `projectStore` (actions like `calculateAllParts`, `runLayout`), but it keeps components dumb and testable. The engine remains pure and side-effect free. Validation is done at the store level so all tabs can share the same rules.

## Consequences

- `projectStore` gains three new actions: `calculateAllParts()`, `runLayout()`, `validateProject()`
- `projectStore` gains two new state fields: `calculatedParts` (Part[]) and `sheetLayouts` (SheetLayout[])
- Components are purely presentational — they read selectors and dispatch actions
- No new dependencies required
- Components follow Tailwind styling (ADR-007)

## Action Items

- [x] Add `calculateAllParts()` action to `projectStore`
- [x] Add `runLayout()` action to `projectStore`
- [x] Add `validateProject()` action to `projectStore`
- [x] Add `calculatedParts` and `sheetLayouts` fields to project state
- [x] Create `BoxConfig.jsx` component
- [x] Create `MaterialConfig.jsx` component
- [x] Create `CutSettings.jsx` component
- [x] Create `CutList.jsx` component
- [x] Create `SheetLayoutView.jsx` component
- [x] Wire all components into `App.jsx` (remove "coming soon" placeholders)
- [x] Add unit tests for store actions
- [x] Add validation indicator per tab
