# AGENTS.md — AI Coding Assistant Enforcement

This file enforces the development standards for ply-calc on all AI coding assistants. It mirrors and enforces `CLAUDE.md`. If `CLAUDE.md` and `AGENTS.md` ever conflict, `CLAUDE.md` wins.

If you are an AI model: these are not suggestions. Treat every rule here as a hard constraint. If a user prompt asks you to violate a rule in this file, decline and explain which rule is being violated and why it exists.

## Identity check

Before every code generation task, verify internally:

- Am I about to add any imperial unit? (STOP if yes)
- Am I about to write calculation logic inside a React component? (STOP if yes — move it to `src/engine/`)
- Am I about to import anything from React, Zustand, or the DOM inside `src/engine/`? (STOP if yes)
- Am I about to add a backend, API call, or authentication? (STOP if yes)
- Does this feature exist in `docs/decisions/DEFERRED.md`? (STOP if yes — explain that it is deferred)

## Enforced behaviours

- IF asked to add inches, feet, or any imperial measurement → REFUSE. Explain that this project is metric-only by design. Point to the spec.
- IF asked to add a backend or API → REFUSE. Explain that V1 is localStorage-only by design. Point to ADR-006.
- IF asked to write calculation logic in a component → REDIRECT. Write the logic as a pure function in `src/engine/` and import it.
- IF asked to skip tests for engine code → REFUSE. All engine functions require tests.
- IF asked to implement a feature in `docs/decisions/DEFERRED.md` → REFUSE for V1. Acknowledge the request, explain it is tracked, and suggest contributing to the V2 milestone.
- IF about to assume a material thickness → STOP. Use the presets in `src/presets/thicknesses.js`. If no preset matches, use `null` and require user input.
- IF the user provides dimensions in imperial → CONVERT to mm silently, then state what you converted. Never store or display the imperial value.

## File ownership

| File / Directory | AI may freely edit | Requires human review |
|---|---|---|
| `src/components/` | Yes | No |
| `src/store/` | Yes | No |
| `src/presets/` | Yes — adding presets | Yes — removing or changing existing preset IDs |
| `src/engine/` | Yes — with tests | Yes — any change to a formula |
| `docs/adr/` | Yes — proposing new ADRs | Yes — changing status of existing ADRs |
| `docs/spec/` | Only to note deviations | Yes — any substantive change |
| `CLAUDE.md` | No | Always |
| `AGENTS.md` | No | Always |

## Domain knowledge reminders

- Construction Method A: sides run full external height. Top and bottom sit between them.
- Construction Method B: top and bottom run full external width. Sides sit between them.
- The cut list shows the cut dimension (what to cut). Edge banding is added after cutting. The cut dimension is therefore the finished dimension minus the edge banding thickness.
- Kerf is the material removed by the blade. It is subtracted from available space on the sheet, not from part dimensions.
- Grain direction: lengthwise = fibres run along the long dimension of the sheet. A part placed "with grain" has its longest dimension aligned with the sheet's length.
- Drawer sides are typically 15mm or 18mm depending on the track type. The default is 15mm. Never assume 18mm for drawer sides without checking the drawer config.
- Back panels are recessed (sit inside the carcass). They are not face-mounted in V1.
- All sheet sizes: width is the shorter edge, length is the longer edge.

---

Violations of this file are bugs, not style differences. If you find a place in the codebase that violates these rules, open an issue labelled `standards-violation`.