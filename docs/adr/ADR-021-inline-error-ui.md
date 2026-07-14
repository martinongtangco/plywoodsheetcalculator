# ADR-021: Replace `alert()` with Inline Error UI

**Status:** Proposed
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-003 (PDF Generation), ADR-017 (Output Display UI)

## Context

The `OutputActions` component in `src/App.jsx` (L274, L290, L311) uses browser `alert()` dialogs for error states:

```js
// L274: No project
alert('No active project');

// L290: Validation failures
alert('Please fix the errors before calculating');

// L311: PDF export errors
alert('Failed to export PDF');
```

Browser `alert()` dialogs are problematic because they:
- **Block the main thread** — the entire UI freezes until dismissed
- **Are not accessible** — screen readers handle them inconsistently, and they do not integrate with the page's ARIA live regions
- **Provide poor UX** — they look like browser errors, not application feedback
- **Cannot be styled** — they break the visual language of the application
- **Are difficult to test** — automated tests require stubbing `window.alert` rather than asserting on DOM state

The application already has an established pattern for inline error banners (the validation alert at L355-388 in `App.jsx` uses the `alert-danger` Tailwind classes). This pattern is consistent, accessible, and testable.

## Decision

Replace all `alert()` calls in the application with inline error banners rendered in the component's JSX. The error banner will use the existing `alert-danger` styling pattern already present in the codebase.

### Implementation

Each location that currently calls `alert()` will instead set a local `error` state:

```jsx
const [error, setError] = useState(null);

// On calculate:
if (!project) {
  setError('No active project. Please create or open a project first.');
  return;
}

// On validation failure:
if (validation.errors.length > 0) {
  setError(validation.errors.join('. '));
  return;
}

// On PDF export failure:
catch (e) {
  setError(`Failed to export PDF: ${e.message}`);
}
```

The error banner renders conditionally and includes a dismiss button:

```jsx
{error && (
  <div className="alert-danger mb-4">
    <span>{error}</span>
    <button onClick={() => setError(null)}>Dismiss</button>
  </div>
)}
```

### Scope

This ADR covers the three `alert()` calls in `src/App.jsx`. A project-wide search should be performed to ensure no other `alert()` calls exist in components. If any are found, they fall under this same ADR.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Inline error banner (chosen)** | Non-blocking, accessible, styled consistently, testable via DOM | Requires local state in each component |
| **Toast/notification system** | Global, auto-dismissing, reusable across components | Over-engineered for 3 error points in V1; requires a new shared component |
| **Store-level error state** | Centralised, shared across tabs | Couples error display to global state; overkill for transient UI errors |
| **Keep `alert()`** | Zero implementation effort | All cons listed in Context section |

## Trade-off Analysis

A toast/notification system (Option 2) would be the "ideal" solution for a large application, but Ply-Calc V1 has exactly 3 error points, all in the same component. Introducing a global notification system would add a new component, a new store slice, and a new abstraction layer for 3 error messages. The inline banner is the right level of investment for V1 and can be migrated to a toast system in V2 if the error surface grows.

## Consequences

- Zero `alert()` calls remaining in the codebase
- Error messages are part of the DOM, enabling automated testing via queries
- Error state is dismissible, giving the user control
- Each error point requires a `useState` for `error` (minor local state addition)
- The existing `alert-danger` Tailwind pattern is reused, ensuring visual consistency

## Action Items

- [ ] Add `error` state to `OutputActions` component in `src/App.jsx`
- [ ] Replace `alert('No active project')` with `setError(...)`
- [ ] Replace validation failure `alert()` with `setError(...)`
- [ ] Replace PDF export error `alert()` with `setError(...)`
- [ ] Render inline error banner with dismiss button
- [ ] Grep entire `src/` for remaining `alert(` calls and apply same pattern
- [ ] Add a test verifying error banner appears on validation failure