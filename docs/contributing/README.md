# Contributing to ply-calc

Welcome. This guide covers how the project is organised and how to contribute effectively.

## Where to start

- Browse [open issues](https://github.com/martinongtangco/plywoodsheetcalculator/issues).
- Read the [V1 spec](../spec/V1_FEATURE_SPEC.md) to understand what the app does.
- Read the ADRs in [docs/adr/](../adr/) to understand why it's built this way.
- If you're a woodworker: your domain knowledge is as valuable as code. Open an issue if the calculations feel wrong.

## ADR template

When proposing a new architectural decision, use this format:

```markdown
# ADR-[NNN]: [Title]

**Status:** Proposed
**Date:** YYYY-MM-DD
**Deciders:** [GitHub handles]

## Context
## Decision
## Options Considered
## Trade-off Analysis
## Consequences
## Action Items
```

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `calc:` change to calculation engine logic
- `adr:` new or updated ADR
- `docs:` documentation only
- `test:` tests only
- `chore:` tooling, deps, config