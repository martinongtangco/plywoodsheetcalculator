# Store

Zustand state stores. One store per domain. All stores auto-save to localStorage on change.

| Store | Responsibility |
|-------|----------------|
| `projectStore.js` | Projects list, active project, boxes, materials, cut settings |
| `uiStore.js` | Active tab, selected box, diagram display options, loading states |

See ADR-002 for the decision to use Zustand.