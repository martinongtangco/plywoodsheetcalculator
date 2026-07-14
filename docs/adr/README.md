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
| [ADR-009](ADR-009-testing-strategy.md) | Testing Strategy | Accepted |
| [ADR-010](ADR-010-carcass-part-calculation.md) | Carcass Part Calculation Model | Accepted |
| [ADR-011](ADR-011-drawer-part-calculation.md) | Drawer Part Calculation Model | Accepted |
| [ADR-012](ADR-012-batch-strip-cut-layout.md) | Batch/Strip Cut Layout Strategy | Accepted |
| [ADR-013](ADR-013-balanced-layout-strategy.md) | Balanced Layout Strategy | Accepted |
| [ADR-014](ADR-014-project-data-model.md) | Project Data Model | Accepted |
| [ADR-015](ADR-015-ui-integration-architecture.md) | UI Integration Architecture | Accepted |
| [ADR-016](ADR-016-box-configuration-ui.md) | Box Configuration UI | Accepted |
| [ADR-017](ADR-017-output-display-ui.md) | Output Display UI | Accepted |
| [ADR-018](ADR-018-design-direction.md) | Design Direction — "Drafting Room" Theme | Accepted |

## How to propose a new ADR

1. Copy the template from `docs/contributing/README.md`.
2. Number it sequentially (ADR-009, ADR-010, etc.).
3. Set status to `Proposed`.
4. Open a pull request and tag it `adr`.