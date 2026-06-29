# ADR-002: State Management

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

State shape is a deeply nested project tree (Project → Boxes → Parts, DrawerConfigs → Materials). Auto-save to localStorage on every state change is required. Multiple disconnected UI components need to read and write the same state (e.g., the cut list and the sheet diagram both read from boxes). We want contributors to be able to add a new slice of state with minimal boilerplate.

## Decision

Select Zustand as the state management library, with the `persist` middleware for localStorage auto-save.

## Options Considered

- **Zustand:** Minimal boilerplate, built-in middleware system, no provider wrapper needed, excellent TypeScript support when the project migrates.
- **Redux Toolkit:** Industry standard but heavy. Requires slices, actions, reducers, and a Provider wrapper. Overkill for a single-page calculator app.
- **Jotai:** Atom-based model is elegant for flat state but becomes complex with deeply nested relationships. Debugging atom derivation chains is harder than debugging a single Zustand store.
- **React Context + useReducer:** Built into React, but suffers from unnecessary re-renders when unrelated components consume the same context. No built-in persistence middleware.

## Trade-off Analysis

Zustand provides the best signal-to-noise ratio for this project. The `persist` middleware handles localStorage serialization with zero custom code. The API surface is small enough that a new contributor can understand the entire store by reading one file.

The trade-off is that Zustand has a smaller community than Redux, but for a project of this scope, that is not a meaningful disadvantage. The simplicity of Zustand outweighs the ecosystem breadth of Redux.

## Consequences

- One Zustand store per domain (projectStore, uiStore)
- All stores use the `persist` middleware for localStorage auto-save
- No Redux DevTools compatibility needed for V1 (can be added via middleware if desired)
- Contributors add state by creating a new store file in `src/store/`

## Action Items

- [x] Create `src/store/projectStore.js` with persist middleware
- [x] Create `src/store/uiStore.js` (no persistence needed)
- [ ] Add Redux DevTools middleware if debugging complexity increases