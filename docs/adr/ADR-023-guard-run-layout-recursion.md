# ADR-023: Guard `runLayout` Against Infinite Recursion

**Status:** Proposed
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-015 (UI Integration Architecture), ADR-017 (Output Display UI)

## Context

The `runLayout` action in `src/store/projectStore.js` (L521-551) contains an auto-calculate pattern that can trigger infinite recursion:

```js
runLayout: (mode) => {
  const project = get().getActiveProject();
  if (!project) return [];

  const parts = get().calculatedParts;
  if (parts.length === 0) {
    // Auto-calculate if no parts yet
    get().calculateAllParts();
    return get().runLayout(mode);  // ← RECURSIVE CALL
  }
  // ... layout logic
},
```

When `parts.length === 0`, the function calls `calculateAllParts()` and then recursively calls itself. If `calculateAllParts()` returns an empty array (which happens when the project has no boxes, or all boxes have invalid dimensions), the recursive `runLayout` call will again find `parts.length === 0`, call `calculateAllParts()` again, and recurse indefinitely.

This results in a `Maximum call stack size exceeded` crash.

### Triggers

The recursion can be triggered by:
1. Calling `runLayout()` on a freshly created project with no boxes
2. Calling `runLayout()` after all boxes have been deleted
3. A future auto-layout hook that calls `runLayout()` on project load before boxes are added

## Decision

Guard the auto-calculate recursion by checking the result of `calculateAllParts()` before recursing. If the calculation produces no parts, return an empty array immediately instead of recursing.

### Implementation

Replace the auto-calculate block in `runLayout`:

**Before:**
```js
const parts = get().calculatedParts;
if (parts.length === 0) {
  get().calculateAllParts();
  return get().runLayout(mode);
}
```

**After:**
```js
const parts = get().calculatedParts;
if (parts.length === 0) {
  const calculated = get().calculateAllParts();
  if (calculated.length === 0) return [];
  // calculatedParts is now populated; fall through to layout logic
}
```

This eliminates the recursive call entirely. After `calculateAllParts()` populates `calculatedParts`, the function continues to the layout logic in the same call frame. The `calculateAllParts()` return value is checked to short-circuit the empty case.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Eliminate recursion, fall through (chosen)** | Zero recursion, simple, single call frame | Requires reading the return value from calculateAllParts |
| **Guard with a depth counter** | Preserves recursion pattern | Adds state; mask underlying design issue |
| **Set a `_autoCalculating` flag** | Prevents re-entry | Adds transient store state; error-prone |
| **Remove auto-calculate entirely** | Cleanest separation | Breaks UX; user must click "Calculate" then "Run Layout" |

## Trade-off Analysis

The fall-through approach (Option 1) is the cleanest fix. It removes the recursive call entirely while preserving the auto-calculate convenience. The `calculateAllParts()` function already returns the parts array, so checking its return value is natural and requires no additional state.

Removing auto-calculate entirely (Option 4) would be a UX regression — the auto-calculate pattern was intentionally designed so the user can click "Run Layout" without first clicking "Calculate."

## Consequences

- Infinite recursion is impossible regardless of project state
- `runLayout()` on an empty project returns `[]` gracefully
- No additional store state required
- No behavioural change for the happy path (project with boxes)

## Action Items

- [ ] Update `runLayout` in `src/store/projectStore.js` to eliminate recursive call
- [ ] Add a test case: `runLayout` on empty project returns `[]` without crashing
- [ ] Add a test case: `runLayout` auto-calculates and lays out when boxes exist but parts are stale