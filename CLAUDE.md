# ply-calc — AI Development Guide

This file is the authoritative guide for AI-assisted development on this project. If you are an AI model working on this codebase, read this file completely before writing any code. If you are a human, this file tells you what the AI has been instructed to do.

## What this project is

- A free, browser-based plywood sheet calculator for woodworkers.
- Metric only. No imperial units. Ever.
- No backend. No accounts. No API keys.
- Open source. Every decision should be explainable to a contributor who has never spoken to the original author.

## Before you write any code

1. Read `docs/spec/V1_FEATURE_SPEC.md` to understand what the feature should do.
2. Check `docs/adr/` to see if the architectural question has already been decided.
3. Check `docs/decisions/DEFERRED.md` to confirm the feature is not explicitly out of scope.
4. If the feature touches the calculation engine, read `docs/contributing/CALCULATION_ENGINE.md`.
5. If the feature adds presets, read `docs/contributing/ADDING_PRESETS.md`.

## Non-negotiable rules

- All dimensions are `number` type in millimetres. Never strings. Never objects with a unit property. Never inches.
- `src/engine/` contains zero UI dependencies. No React imports. No Zustand imports. No DOM access. If you need to test something from the engine, import from `src/engine/index.js` in a test file.
- Every function added to `src/engine/` must have a corresponding test in `tests/engine/`.
- The cut list always shows the cut dimension (what to set on the saw fence), not the finished dimension. See ADR-008.
- Kerf is subtracted from sheet space. It is never added to a part's dimensions. See ADR-008.
- Grain direction is a hard constraint by default. Never place a part against its grain unless `grain_constraint === 'soft'` AND the violation is flagged in the output object.
- Do not add imperial unit support. Do not add a unit toggle. Do not add a `unit` field to any data model. If a user asks for this, explain that imperial is permanently out of scope for this project.
- Do not add a backend. Do not add authentication. Do not add API calls to external services.
- Do not use `any` type in TypeScript (if/when the project migrates to TypeScript).
- Do not write calculation logic inside React components. Calculations belong in `src/engine/`.

## Code style

- Functional components only. No class components.
- Zustand for all cross-component state. No prop drilling beyond 2 levels.
- Presets are data, not logic. They live in `src/presets/` as plain JS arrays of objects.
- Commit messages follow Conventional Commits. Use `calc:` prefix for engine changes.
- If you are unsure whether something belongs in `src/engine/` or `src/components/`, it belongs in `src/engine/`.

## What good output looks like

When implementing a feature, produce:

- A pure function in `src/engine/` with JSDoc comments.
- A unit test in `tests/engine/` that covers the happy path, a zero-dimension edge case, and a grain constraint edge case.
- A React component in `src/components/` that calls the engine function and renders the result.
- An update to `docs/spec/V1_FEATURE_SPEC.md` if the implementation deviates from the spec (with an explanation of why).

## What to do when you are unsure

- Stop. Do not guess at domain knowledge.
- Woodworking calculations have physical consequences. A wrong dimension means wasted material and money.
- Write a comment in the code explaining what you are unsure about and flag it with `// REVIEW:`.
- Do not silently make an assumption about a construction method, material thickness, or kerf value.