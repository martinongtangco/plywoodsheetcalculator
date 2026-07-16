# Security Audit Report — ply-calc v0.0.0

**Date:** 2026-07-16
**Auditor:** AI Security Audit (Cline)
**Scope:** Full source code review of `ply-calc` React/web application
**Commit:** `0302d2d560560f6c2b0d0a3606a29e10128384f1`

---

## 1. Executive Summary

**Overall Risk Posture: LOW** — This is a client-side-only, offline-first plywood calculator with no authentication, no backend, no network communication, and no user-generated content surface beyond local project dimensions. The attack surface is minimal.

**Findings Summary:**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 0 |
| Medium   | 3 |
| Low      | 5 |
| Info     | 4 |

**Key Observations:**
- No authentication, no cookies, no API calls, no third-party data flows
- All data persists exclusively in `localStorage` (Zustand `persist` middleware)
- No `dangerouslySetInnerHTML`, no `eval()`, no `Function()` constructors
- HTML tag stripping is present on user-input fields
- SVG content is constructed programmatically (not from user input) in the PDF engine

---

## 2. Findings Table

### FINDING-001: Incomplete SVG Entity Escaping in rasterize.js

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Area** | Cross-site scripting (XSS) — SVG injection |
| **File:Line** | `src/utils/rasterize.js:251` |
| **Description** | The `layoutToCanvas()` function escapes user-controlled `part.label` into SVG markup using only `.replace(/</g, '<')`. This is incomplete XML entity escaping. If a label contained `&`, `"`, or `'` characters, it could corrupt the SVG structure or inject attributes in specific edge cases. Contrast this with the correct implementation in `src/pdf/generate.js:462-468` (`escapeSvg()`), which escapes `&`, `<`, `>`, `"`, and `'`. |
| **Remediation** | Reuse the `escapeSvg()` function from `pdf/generate.js` in `rasterize.js:251`, or extract it to a shared utility in `src/utils/`. Replace line 251: `.replace(/</g, '<')` with the full escaping chain. |

---

### FINDING-002: HTML Tag Stripping Regex Can Be Bypassed with Nested Constructs

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Area** | Cross-site scripting (XSS) — Input sanitization |
| **File:Line** | `src/utils/validate.js:22`, `src/store/projectStore.js:137`, `src/store/projectStore.js:251`, `src/store/projectStore.js:270` |
| **Description** | The sanitization regex `/<[^>]*>/g` strips HTML tags but does not prevent all injection vectors. For example, text like `on<break>focus=(alert(1))` would become `onfocus=(alert(1))` after stripping — though this is not exploitable in the current app because React renders text content (not attributes) from these values. The risk is theoretical and low because: (1) React escapes text nodes by default, (2) these values are only displayed as text in `<input>` and `<p>` elements, never as attribute values. However, if any future feature renders these values in a dynamic attribute, the weakness would become exploitable. |
| **Remediation** | Replace the regex-based stripping with a proper HTML sanitizer like DOMPurify (used in text-mode) or a more restrictive approach: strip all characters that are not alphanumeric, spaces, and common punctuation. Alternatively, add a comment documenting that React's auto-escaping provides the XSS mitigation, not the regex strip. |

---

### FINDING-003: Google Fonts Loaded Without Subresource Integrity (SRI)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Area** | Third-party integrations — CDN supply chain |
| **File:Line** | `index.html:7-9` |
| **Description** | Google Fonts are loaded via external `<link>` tags without `integrity` or `crossorigin` attributes:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" />
```
If the Google Fonts CDN were compromised (or a MITM attack succeeded), an attacker could inject malicious CSS or JavaScript. The `fonts.gstatic.com` preconnect has `crossorigin` but the actual font stylesheet load does not use SRI. |
| **Remediation** | Self-host the fonts and reference them locally. Alternatively, add `integrity` and `crossorigin="anonymous"` attributes to the stylesheet `<link>` tag. Google provides SRI hashes via their API. |

---

### FINDING-004: No Content-Security-Policy or Security Headers

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Area** | Security headers |
| **File:Line** | `vite.config.js` (no header configuration) |
| **Description** | The Vite configuration does not set any security headers. When this application is served in production (via `vite preview`, a static host, or a CDN), it will lack:
- `Content-Security-Policy` (CSP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options` / `Frame-Options`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`

Without CSP, the app is unable to block inline script injection if a future XSS vulnerability is introduced. Without HSTS, the app is vulnerable to SSL stripping. |
| **Remediation** | Configure security headers at the web server / CDN level (not in Vite). Example headers:
```
Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; script-src 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```
If self-hosting fonts, remove the Google Fonts domains from CSP. |

---

### FINDING-005: Error Message Leakage in PDF Generation

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Area** | Data exposure — Error information leakage |
| **File:Line** | `src/App.jsx:313` |
| **Description** | When PDF generation fails, the raw JavaScript error message is exposed to the user:
```jsx
setError(`PDF generation failed: ${err.message}`);
```
While this is a client-side app with no sensitive server internals, the error message could reveal implementation details (library names, internal function names, stack-like traces) that aid an attacker profiling the application. |
| **Remediation** | Replace with a user-facing generic message: `setError('PDF generation failed. Please try again.');` Log the detailed error internally only in development mode: `if (import.meta.env.DEV) console.error('PDF generation failed:', err);` |

---

### FINDING-006: Error Message Leakage in JSON Import

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Area** | Data exposure — Error information leakage |
| **File:Line** | `src/store/projectStore.js:618` |
| **Description** | When JSON import fails with a parse error, the raw JavaScript exception message is embedded in the error string returned to the user:
```js
return { success: false, errors: [`Invalid JSON: ${e.message}`] };
```
This is minor for a client-side app but could leak parser implementation details. |
| **Remediation** | Use a generic message: `return { success: false, errors: ['Invalid JSON file. Please ensure the file is a valid ply-calc export.'] };` |

---

### FINDING-007: `window.confirm()` Used for Destructive Actions — Phishing-Resistant Confirmation Missing

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **Area** | Authentication & session management — User consent |
| **File:Line** | `src/components/ProjectList.jsx:44-46`, `src/components/BoxConfig.jsx:835`, `src/components/BoxConfig.jsx:847` |
| **Description** | `window.confirm()` is used for project deletion and box deletion. This is the standard browser dialog and cannot be styled, but it does provide a basic confirmation barrier. This is acceptable for V1 but worth noting: a custom confirmation dialog would allow typing-the-name-to-confirm patterns for extra protection against accidental deletion. |
| **Remediation** | No immediate action required. Consider a custom modal with name-confirmation for V2. |

---

### FINDING-008: `console.warn` and `console.error` in Production Builds

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **Area** | Data exposure — Debug information |
| **File:Line** | `src/store/projectStore.js:163`, `src/store/projectStore.js:222`, `src/App.jsx:312` |
| **Description** | Three `console.warn` / `console.error` calls exist in the production code path. While these only expose internal validation warnings and error objects (no PII or secrets), they could aid debugging by an attacker with console access. |
| **Remediation** | Wrap console calls in `import.meta.env.DEV && console.warn(...)` to suppress in production builds. Vite will tree-shake the dead code. |

---

### FINDING-009: Zustand Persist Middleware Stores Data in localStorage Without Encryption

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Area** | Data exposure — Client-side data storage |
| **File:Line** | `src/store/projectStore.js:622-624` |
| **Description** | All project data is persisted to `localStorage` under the key `ply-calc-projects` as plaintext JSON via Zustand's `persist` middleware:
```js
persist(
  (set, get) => ({ ... }),
  {
    name: 'ply-calc-projects',
  }
)
```
While this application does not handle PII, secrets, or credentials, the data is accessible to any script running on the same origin. If a supply chain attack compromises a dependency (e.g., a malicious update to `pdf-lib`), all stored project data would be readable. |
| **Remediation** | For V1 (no PII), this is acceptable. Document in the README that data is stored unencrypted. For future versions handling sensitive data, consider: (1) encrypting the Zustand state before persisting, (2) using the Web Crypto API for client-side encryption. |

---

### FINDING-010: JSON Import Accepts Arbitrary File Content Without Schema Validation Depth

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **Area** | API & backend communication — Input validation |
| **File:Line** | `src/store/projectStore.js:573-620` |
| **Description** | The `importProjectJSON` function parses JSON and runs `validateProject()` which checks top-level fields (id, name, sheetSize, kerf, etc.) but does not deeply validate nested structures. A maliciously crafted JSON file could include unexpected properties that, if rendered by a future feature using `dangerouslySetInnerHTML` or similar, could cause issues. Current rendering is safe because React auto-escapes. The re-ID logic (lines 590-610) is sound and prevents ID collision attacks. |
| **Remediation** | No immediate action. Consider adding a JSON schema validator (e.g., `ajv`) to strictly validate imported files against the expected project shape. |

---

## 3. Areas Checked — No Findings

| Area | What Was Checked | Result |
|------|-----------------|--------|
| **Authentication** | Searched for tokens, sessions, cookies, OAuth, login flows | Not applicable — no auth in this app |
| **CSRF** | Searched for cookies, anti-CSRF tokens | Not applicable — no backend or cookies |
| **Hardcoded Secrets** | Searched for `api_key`, `secret`, `password`, `token`, `bearer`, `PRIVATE_KEY` patterns | None found |
| **Network Calls** | Searched for `fetch(`, `axios`, `XMLHttpRequest` | None found — fully offline |
| **`dangerouslySetInnerHTML`** | Searched entire `src/` directory | None found |
| **`eval()` / `Function()`** | Searched entire `src/` directory | None found |
| **`document.write`** | Searched entire `src/` directory | None found |
| **Open Redirects** | Searched for `window.location`, dynamic `href` assignments | None found. `.href` assignments use `URL.createObjectURL()` with local Blobs only |
| **Routing Authorization** | Reviewed `App.jsx` routing logic | Not applicable — single-page app with no auth tiers |
| **File Upload Validation** | Reviewed `fileIO.js`, `ProjectList.jsx` import flow | File input restricted to `.json` via `accept` attribute. Content parsed and validated |
| **Dependency Versions** | Reviewed `package.json` dependencies | All on recent major versions: React 19, Vite 7, Zustand 5, pdf-lib 1.17 |
| **Source Maps** | Reviewed `vite.config.js` | No explicit `build.sourcemap` config — Vite defaults to no source maps in production |
| **Devtools in Production** | Reviewed `src/store/devtools.js` | Correctly gated behind `import.meta.env.DEV` — excluded from production |
| **UUID Generation** | Reviewed `src/utils/id.js` | Uses `crypto.getRandomValues()` — cryptographically secure |

---

## 4. Dependency Analysis

| Package | Version | Role | Notes |
|---------|---------|------|-------|
| `react` | `^19.1.0` | Framework | Latest major |
| `react-dom` | `^19.1.0` | Framework | Latest major |
| `zustand` | `^5.0.14` | State management | Latest major |
| `pdf-lib` | `^1.17.1` | PDF generation | Actively maintained |
| `vite` | `^7.1.7` | Build tool | Latest major |
| `@vitejs/plugin-react` | `^5.0.0` | React plugin | Latest |
| `tailwindcss` | `^3.4.17` | CSS framework | Stable |
| `jsdom` | `^29.1.1` | Test environment | Dev-only |
| `vitest` | `^4.1.9` | Test runner | Dev-only |

No suspicious, unmaintained, or typosquatted packages detected. The dependency count is minimal (4 production, 5 dev), reducing supply chain risk.

**Recommendation:** Run `npm audit` periodically and pin exact versions in production (`package-lock.json` is present — good).

---

## 5. Top 5 Priority Fixes

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **1** | FINDING-004: Add security headers at deployment layer | Low (server config) | Blocks entire classes of attacks (XSS, clickjacking, MIME sniffing, SSL stripping) |
| **2** | FINDING-001: Fix incomplete SVG escaping in `rasterize.js` | Low (5-minute code change) | Prevents potential SVG injection from crafted project data |
| **3** | FINDING-009: Document localStorage plaintext storage | Low (README update) | Sets correct user expectations about data privacy |
| **4** | FINDING-003: Self-host fonts or add SRI to Google Fonts | Medium (build-time fetch or self-host) | Mitigates CDN supply chain compromise |
| **5** | FINDING-005/006: Generic error messages in production | Low (code change) | Prevents implementation detail leakage |

---

## 6. Conclusion

**ply-calc is a well-architected, low-risk application.** The decision to be fully client-side with `localStorage`-only persistence dramatically reduces the attack surface. The codebase demonstrates good security hygiene:

- React's built-in XSS protection is leveraged throughout
- No `dangerouslySetInnerHTML` anywhere
- HTML tag stripping on user inputs (project names, group names)
- SVG content is properly escaped in the primary path (`pdf/generate.js`)
- Cryptographically secure UUID generation
- Devtools correctly excluded from production builds
- Minimal dependency footprint

The findings are predominantly around deployment-layer concerns (security headers, font loading) and one code-level inconsistency (SVG escaping). None of the findings represent an exploitable vulnerability in the current codebase.