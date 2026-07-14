# ADR-022: Conditional Devtools Middleware

**Status:** Proposed
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-002 (State Management)

## Context

Both Zustand stores wrap their state with the `devtools` middleware unconditionally:

**`src/store/projectStore.js` (L36):**
```js
export const useProjectStore = create(
  devtools(
    persist(
      (set, get) => ({ ... }),
      { name: 'ply-calc-projects' }
    ),
    { name: 'ProjectStore' }
  )
);
```

**`src/store/uiStore.js` (L9):**
```js
export const useUIStore = create(
  devtools(
    (set) => ({ ... }),
    { name: 'UIStore' }
  )
);
```

The `devtools` middleware connects to Redux DevTools for browser-based debugging. While invaluable during development, it has production costs:
- **Bundle size** — the devtools middleware code is included in the production build (~1KB gzipped)
- **Performance** — every state action emits a devtools message, adding overhead to every store update
- **Potential state leakage** — devtools bridges can expose internal state to browser extensions in production

ADR-002 established Zustand as the state management solution but did not address the devtools middleware's production behaviour.

## Decision

Conditionally apply the `devtools` middleware only when `import.meta.env.DEV` is `true` (i.e., during Vite development builds). Production builds will use the stores without devtools wrapping.

### Implementation

Create a small helper in `src/store/devtools.js`:

```js
/**
 * Conditionally apply Zustand devtools middleware.
 * No-op in production builds.
 */
import { devtools } from 'zustand/middleware';

export const maybeDevtools = import.meta.env.DEV
  ? devtools
  : (store) => store;
```

Both stores replace `devtools(...)` with `maybeDevtools(...)`:

**`src/store/projectStore.js`:**
```js
import { maybeDevtools } from './devtools.js';

export const useProjectStore = create(
  maybeDevtools(
    persist(
      (set, get) => ({ ... }),
      { name: 'ply-calc-projects' }
    ),
    { name: 'ProjectStore' }
  )
);
```

**`src/store/uiStore.js`:**
```js
import { maybeDevtools } from './devtools.js';

export const useUIStore = create(
  maybeDevtools(
    (set) => ({ ... }),
    { name: 'UIStore' }
  )
);
```

Vite performs tree-shaking and dead-code elimination on `import.meta.env.DEV` at build time, so the devtools code is completely excluded from production bundles.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **`import.meta.env.DEV` guard (chosen)** | Vite-native, zero runtime cost in prod, clean | Requires one new helper file |
| **`process.env.NODE_ENV` guard** | Works with any bundler | Not Vite-idiomatic; requires `define` config |
| **Zustand's built-in check** | No code change | Zustand does not provide this; devtools always active |
| **Remove devtools entirely** | Smallest bundle | Loses debugging capability for developers |

## Trade-off Analysis

The helper file adds ~8 lines of code but cleanly centralises the conditional logic. If a future store is added, it gets the same treatment with a single import. The `import.meta.env.DEV` approach is the recommended Vite pattern and is guaranteed to be optimised away in production builds.

## Consequences

- Production bundles are ~1KB smaller (gzipped)
- No devtools overhead on every state update in production
- Developers retain full Redux DevTools integration during development
- No behavioural change — the stores work identically in both modes

## Action Items

- [ ] Create `src/store/devtools.js` with `maybeDevtools` export
- [ ] Update `src/store/projectStore.js` to use `maybeDevtools`
- [ ] Update `src/store/uiStore.js` to use `maybeDevtools`
- [ ] Verify devtools still work in `npm run dev`
- [ ] Verify production build (`npm run build`) excludes devtools code