import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Security headers applied to the Vite dev server and preview server.
 *
 * IMPORTANT: these headers are enforced at the deployment layer (CDN / web
 * server). The values below are development conveniences only — they do NOT
 * protect the shipped application. See `docs/deployment-headers.md` for the
 * authoritative configuration for each supported host.
 *
 * Fonts are self-hosted in `public/fonts.css` so no external font origins
 * are needed in the CSP.
 */
/**
 * Development CSP — allows inline scripts and styles because Vite's dev
 * server injects HMR code and CSS via inline <script> / <style> tags.
 *
 * The stricter production CSP (no unsafe-inline) is enforced at the
 * deployment layer. See `docs/deployment-headers.md`.
 */
const devHeaders = {
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export default defineConfig({
  plugins: [react()],
  server: {
    headers: devHeaders,
  },
  preview: {
    headers: devHeaders,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
