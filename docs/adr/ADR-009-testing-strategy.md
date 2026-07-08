# ADR-009: Testing Strategy

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

The calculation engine is the core value proposition of the app. An incorrect formula for carcass part dimensions or drawer calculations will produce wrong cut lists, which will lead to wasted material and lost trust. The engine must be correct before the UI is built around it. All engine functions are pure functions with no side effects, making them ideal for unit testing. We need a test framework that integrates with the Vite build tool, runs fast, and requires minimal configuration.

## Decision

Use Vitest as the unit testing framework, with tests co-located in `tests/engine/` mirroring the `src/engine/` structure.

## Options Considered

- **Vitest:** Native Vite integration, shared config, fast HMR-based test runs, Jest-compatible API. Zero additional build configuration needed.
- **Jest:** Industry standard but requires its own bundler (or ts-jest). Duplicate configuration with Vite. Slower startup. No native Vite integration.
- **Mocha + Chai + Esbuild Loader:** Maximum flexibility but maximum configuration. Requires manual setup of loaders, assertions, and matchers.
- **Ava:** Fast parallel execution but uses CommonJS by default. Additional configuration needed for ESM modules. Smaller ecosystem.

## Trade-off Analysis

Vitest is the natural choice for a Vite project. It shares the same config, the same module resolution, and the same plugin ecosystem. Tests run as fast as the dev server HMR. The Jest-compatible API means contributors familiar with Jest (the largest testing user base) can contribute without learning a new assertion syntax.

The trade-off is that Vitest has a smaller community than Jest, but for a project of this scope, that is not a meaningful disadvantage. The Vite integration alone justifies the choice.

## Consequences

- All engine functions in `src/engine/` require unit tests in `tests/engine/`
- Test files mirror source file names: `parts.js` → `parts.test.js`
- `pnpm test` runs the full suite, `pnpm test -- --watch` runs in watch mode
- CI runs the test suite on every pull request
- Minimum requirement: every public function in the engine has at least one happy-path test and one edge-case test
- UI components may have tests but are not required to for V1 (engine correctness is the priority)

## Action Items

- [x] Add Vitest to devDependencies
- [x] Configure Vitest in `vite.config.js` (or `vitest.config.js`)
- [x] Create `tests/engine/` directory structure
- [x] Add `test` script to `package.json`
- [x] Add CI step to run tests on pull requests
- [x] Write initial smoke tests for each engine function stub
