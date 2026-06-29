# ADR-007: Styling Approach

**Status:** Accepted
**Date:** 2026-06-29
**Deciders:** Open Source Maintainers

## Context

This is an open source project where contributors range from beginners to seniors. No design system is being built — the utility classes themselves are the design system. The app has a functional, data-dense UI (tables, form panels, diagram labels). It is not a marketing site. Dark mode is desirable for V2 but not required in V1.

## Decision

Use Tailwind CSS for all styling.

## Options Considered

- **Tailwind CSS:** Utility-first CSS framework. No context switching between HTML and CSS files. Consistent spacing, color, and typography scales built in. Dark mode supported via `dark:` variant.
- **CSS Modules:** Scoped CSS files co-located with components. Prevents style leaks but requires maintaining separate `.module.css` files. No built-in design tokens.
- **styled-components / Emotion:** CSS-in-JS with dynamic styling. Adds runtime overhead. Requires understanding of JavaScript CSS interpolation. Overkill for a static UI.
- **Plain CSS with BEM:** No dependencies, universal understanding. But no built-in design tokens, no responsive utilities, no dark mode support without manual media queries. Style collisions become likely as the component count grows.

## Trade-off Analysis

Tailwind CSS wins on developer velocity and consistency. Every component is styled in one file (the component file). The built-in spacing scale (`p-4`, `m-2`), color palette, and responsive prefixes (`md:`, `lg:`) eliminate the need to define custom breakpoints or spacing variables.

The trade-off is that Tailwind class lists look verbose (`class="flex flex-col gap-4 p-6 bg-white rounded-lg shadow"`). Developers unfamiliar with Tailwind find this unfamiliar. However, Tailwind is one of the most popular CSS frameworks in 2024, and the learning curve is shallow.

For V2 dark mode, Tailwind's `dark:` variant enables a drop-in dark theme with zero refactoring.

## Consequences

- All styling uses Tailwind utility classes
- No custom CSS files except for reset/base styles and print overrides
- `tailwind.config.js` defines any project-specific extensions (custom colors, fonts)
- Dark mode in V2 uses Tailwind's `dark:` variant with class strategy
- Contributors should use the built-in Tailwind palette before adding custom colors

## Action Items

- [x] Install and configure Tailwind CSS with Vite
- [x] Create `tailwind.config.js` with project defaults
- [x] Document Tailwind usage conventions in `CLAUDE.md`
- [ ] Plan dark mode implementation for V2 (deferred — use `dark:` variant with class strategy when ready)