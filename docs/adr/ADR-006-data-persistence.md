# ADR-006: Data Persistence and Portability

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

V1 has no user accounts and no backend. A woodworker may use the app on a tablet in the shop and a laptop at home — they need to be able to move their project between devices. Data integrity matters: losing a project's cut list before a purchase order is a real-world failure. The app should work fully offline after first load.

## Decision

Use browser localStorage for automatic persistence, with JSON export/import for portability between devices.

## Options Considered

- **localStorage + JSON export/import:** Simple, universal browser support, zero setup. JSON export provides explicit portability. Size limit (~5-10MB) is sufficient for V1 project sizes.
- **IndexedDB:** Larger storage capacity, async API, supports structured data. Overkill for JSON payloads under 1MB. More complex to implement and test.
- **File System Access API (Chrome only):** Native file save/open dialogs. Chrome-only — does not work in Safari, Firefox, or mobile browsers. Breaks the "works everywhere" requirement.
- **Lightweight cloud backend (Supabase, Firebase):** Enables cross-device sync and collaboration. Introduces API keys, network dependencies, accounts, and a backend — all explicitly out of scope for V1.
- **OPFS (Origin Private File System):** Large storage, file-like API. Limited browser support (Chrome 111+, experimental in other browsers). Not available in Safari.

## Trade-off Analysis

localStorage + JSON export is the pragmatic choice. Every browser supports localStorage. The size limit is not a constraint for V1 — even a large project with 20 boxes and full cut lists serializes to well under 1MB. JSON export/import solves the portability requirement without a backend.

The trade-off is no automatic cross-device sync. A woodworker must manually export on one device and import on another. This is acceptable for V1 and matches the workflow of many offline-first tools (e.g., spreading a CSV via email).

## Consequences

- All stores use Zustand's `persist` middleware writing to localStorage
- Export produces a `.json` file containing the full project state
- Import reads a `.json` file and replaces the current project state
- localStorage key is `ply-calc-projects` for the persisted Zustand store
- No migration strategy needed for V1 — becomes relevant when schema changes in V2
- Warning: clearing browser data deletes all projects. The export/import feature is the backup mechanism.

## Action Items

- [x] Configure Zustand `persist` middleware in all stores
- [ ] Implement JSON export (download file) in the output screen
- [ ] Implement JSON import (file input) in the project list
- [ ] Add a warning before clearing project data
- [ ] Document the localStorage key in the contributing guide