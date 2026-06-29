# Adding or Editing Presets

Presets live in `src/presets/`. They are plain JS objects — no logic, no calculations.

## Sheet sizes (`sheetSizes.js`)

```js
export const SHEET_SIZES = [
  { id: 'ph-standard', label: 'Standard (PH / Asia)', width: 1220, length: 2440 },
  // add new entries here
];
```

Rules:
- `width` is always the shorter dimension.
- `length` is always the longer dimension.
- `id` must be unique, lowercase, hyphenated.

## Thicknesses, kerfs, track types, edge banding

Same pattern — array of `{ id, label, value }` objects. See the existing files for examples.

## When to add a preset vs. when not to

**Add a preset** if it is a widely available standard in a major market (PH, EU, AU, US).
**Do not add a preset** for a single supplier's non-standard size. Use the `Custom` option for that.

If you're not sure, open an issue and ask.