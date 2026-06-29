# Architecture Decision Records

This directory contains all ADRs for the ply-calc project.

An ADR documents a significant architectural decision: what was decided, why, and what alternatives were rejected. If you are about to change something fundamental to how the app works, write an ADR first.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-ui-framework.md) | UI Framework Selection | Accepted |
| [ADR-002](ADR-002-state-management.md) | State Management | Accepted |
| [ADR-003](ADR-003-pdf-generation.md) | PDF Generation Strategy | Accepted |
| [ADR-004](ADR-004-sheet-layout-rendering.md) | 2D Sheet Layout Rendering | Accepted |
| [ADR-005](ADR-005-bin-packing-algorithm.md) | Bin-Packing Algorithm | Accepted |
| [ADR-006](ADR-006-data-persistence.md) | Data Persistence and Portability | Accepted |
| [ADR-007](ADR-007-styling.md) | Styling Approach | Accepted |
| [ADR-008](ADR-008-kerf-edge-banding-model.md) | Kerf and Edge Banding Calculation Model | Accepted |

## How to propose a new ADR

1. Copy the template from `docs/contributing/README.md`.
2. Number it sequentially (ADR-009, ADR-010, etc.).
3. Set status to `Proposed`.
4. Open a pull request and tag it `adr`.