# Calculation Engine

The calculation engine lives in `src/engine/`. It is the most important part of the project.

## Rules — non-negotiable

1. **Zero UI dependencies.** No React, no Zustand, no DOM access. Pure functions only.
2. **Every function must be unit-tested.** If you add a function to `src/engine/`, add a test in `tests/engine/`.
3. **All dimensions are numbers in millimetres.** No strings, no unit objects, no conversion logic inside the engine.
4. **Grain direction is a hard constraint by default.** The engine must never place a part against grain unless the project's `grain_constraint` is set to `soft` AND it is flagged in the output.
5. **Kerf is subtracted from sheet space, not added to parts.** See ADR-008.
6. **Edge banding is subtracted from cut dimensions.** The cut list always shows what to set on the saw fence. See ADR-008.

## Function signatures

All engine functions take plain JS objects and return plain JS objects. No classes.

```js
// parts.js
calculatePartDimensions(box, constructionMethod, materialThicknesses) → Part[]

// batch.js
batchLayout(parts, sheet, kerf) → SheetLayout[]

// optimised.js
optimisedLayout(parts, sheet, kerf, grainConstraint) → SheetLayout[]

// balanced.js
balancedLayout(parts, sheet, kerf, grainConstraint) → SheetLayout[]
```

## SheetLayout shape

```js
{
  sheetIndex: number,
  material: Material,
  placements: [
    {
      part: Part,
      x: number,       // mm from left edge
      y: number,       // mm from top edge
      rotated: boolean,
      grainViolated: boolean
    }
  ],
  utilisationPercent: number,
  offcuts: [{ x, y, width, height }]
}