/**
 * Conditionally apply Zustand devtools middleware.
 * No-op in production builds.
 *
 * ADR-022: devtools is only active during Vite development builds
 * (`import.meta.env.DEV === true`). Production builds exclude the
 * middleware entirely, saving ~1 KB gzipped and removing per-action
 * devtools overhead.
 */
import { devtools } from 'zustand/middleware';

export const maybeDevtools = import.meta.env.DEV
  ? devtools
  : (store) => store;