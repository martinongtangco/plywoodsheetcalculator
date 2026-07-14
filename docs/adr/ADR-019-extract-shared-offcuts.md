# ADR-019: Extract Shared Offcuts Computation

**Status:** Accepted
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-005 (Bin-Packing Algorithm), ADR-012 (Batch Strip-Cut Layout), ADR-013 (Balanced Layout Strategy)

## Context

The `computeOffcuts()` function — a sweep-line algorithm that derives rectangular offcut regions from the placement grid — is currently copy-pasted verbatim across three layout algorithm files:

| File | Lines | Token Count |
|---|---|---|
| `src/engine/batch.js` | L215-278 | ~65 lines |
| `src/engine/balanced.js` | L293-355 | ~65 lines |
| `src/engine/optimised.js` | L372-437 | ~65 lines |

The function signature and implementation are identical in all three locations. This violates the DRY principle and creates maintenance risk: any bug fix or improvement to the offcut computation must be applied in three places, and a change in one file without the others would produce subtle, hard-to-diagnose inconsistencies between layout modes.

The function is a pure algorithmic utility that takes a sheet dimension and a placements array, and returns an array of offcut rectangles. It has no dependency on the surrounding layout algorithm and could serve any future layout strategy as well.

## Decision

Extract `computeOffcuts()` into a shared module `src/engine/offcuts.js` and import it from all three layout files.

### New Module: `src/engine/offcuts.js`

```js
/**
 * computeOffcuts — derive rectangular offcut regions from a placement set.
 *
 * Uses a horizontal sweep-line approach: sorts placements by Y, then by X,
 * and walks across each row to find gaps between placements.
 *
 * @param {object} sheet - { width, length } in mm
 * @param {Placement[]} placements - array of { x, y, part, rotated }
 * @returns {object[]} array of { x, y, width, height }
 */
export function computeOffcuts(sheet, placements) { /* ... */ }
```

### Changes to Existing Files

Each of `batch.js`, `balanced.js`, and `optimised.js` will:
1. Import `computeOffcuts` from `../engine/offcuts.js`
2. Remove the local `computeOffcuts` function definition (~65 lines each)
3. Call the imported function with the same arguments

### Tests

Add `tests/engine/offcuts.test.js` covering:
- Empty placements returns single offcut equal to sheet
- Single placement returns correct remaining offcuts
- Adjacent placements merge gaps correctly
- Kerf gaps between placements are preserved as offcuts

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Extract to `src/engine/offcuts.js` (chosen)** | Single source of truth, dedicated test file, clear ownership | One new file |
| **Extract to `src/engine/shared.js`** | No new conceptual module | Catches all "utility" functions, becomes a dumping ground |
| **Keep duplicated** | Zero change | Maintenance burden, inconsistency risk |
| **Extract to `src/utils/`** | Centralised utilities | Violates engine/utils boundary; offcuts is domain-specific, not generic |

## Trade-off Analysis

The extraction is a straightforward refactor with no behavioural change. The only trade-off is the addition of one new file, which is outweighed by the elimination of ~195 lines of duplicated code and the ability to test the offcut algorithm independently of any layout strategy.

## Consequences

- `src/engine/offcuts.js` becomes the single source of truth for offcut computation
- Three layout files become ~65 lines shorter each
- A new test file `tests/engine/offcuts.test.js` provides dedicated coverage
- Future layout algorithms (e.g., a V2 "guaranteed-optimal" mode) can reuse the offcut computation without copying

## Action Items

- [x] Create `src/engine/offcuts.js` with `computeOffcuts()` exported
- [x] Update `src/engine/batch.js` — import and remove local function
- [x] Update `src/engine/balanced.js` — import and remove local function
- [x] Update `src/engine/optimised.js` — import and remove local function
- [x] Create `tests/engine/offcuts.test.js`
- [x] Verify existing layout tests still pass
