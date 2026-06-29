# ADR-001: UI Framework Selection

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

This is an open source project where contributor pool size matters more than personal preference. The app has complex, deeply nested reactive state (project → boxes → parts → materials). No server-side rendering is needed — the entire app runs in the browser. It must be easy for a contributor unfamiliar with the project to pick up and start making changes.

## Decision

Select React + Vite as the UI framework and build tool.

## Options Considered

- **React + Vite:** Largest ecosystem and contributor pool. Vite provides fast HMR and a simple config.
- **Vue 3 + Vite:** Smaller learning curve for some, but smaller contributor pool for a specialized domain tool.
- **Svelte + SvelteKit (client-only mode):** Excellent developer experience, but SvelteKit is primarily designed around a server-first model. Forcing client-only mode fights the framework.
- **Vanilla JS:** Zero dependencies, but no reactive state management, no component composition. Would require building all of that from scratch for an app with this level of UI complexity.

## Trade-off Analysis

React wins on contributor accessibility. The most common question from new open source contributors is "where do I start?" — React has the largest pool of developers who can answer that question with minimal onboarding. Vite is the modern standard for React build tooling and replaces Create React App without controversy.

The trade-off is bundle size and boilerplate compared to Svelte, but for a data-dense, form-heavy application like this, React's component model is a net positive.

## Consequences

- All UI components are React functional components
- Vite is the build tool and dev server
- `npm run dev` starts the dev server, `npm run build` produces a production bundle
- Contributors familiar with React can jump in without learning a new framework

## Action Items

- [x] Configure Vite with React plugin
- [x] Set up `src/components/` directory structure
- [ ] Migrate to TypeScript when the codebase is stable (not a V1 goal)