# ADR-020: Simplify `escapeSvg()` in PDF Module

**Status:** Accepted
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers
**Replaces:** N/A
**Related:** ADR-003 (PDF Generation)

## Context

The `escapeSvg()` function in `src/pdf/generate.js` (L463-485) contains two issues:

### Dead Code

An `entities` array is declared at L465-471 with the apparent intent of mapping character codes to HTML entities:

```js
const entities = [
  [38, 38 + String.fromCharCode(65,109,112,59)],   // & -> &
  [60, 60 + String.fromCharCode(65,108,116,59)],   // < -> <
  [62, 62 + String.fromCharCode(65,103,116,59)],   // > -> >
  [34, 34 + String.fromCharCode(65,113,117,111,116,59)], // " -> "
  [39, 39 + String.fromCharCode(65,112,111,115,117,115,59)], // ' -> '
];
```

This array is **never read or iterated**. The actual escaping logic at L477-481 duplicates the same mappings inline with individual `if` statements. The `entities` array has been dead code since this function was written.

### Obfuscation via `String.fromCharCode()`

Every entity string is constructed via `String.fromCharCode()` with explicit char codes rather than using the literal string. For example, `String.fromCharCode(65,109,112,59)` produces `"amp;"` and is concatenated to `"&"` to form `"&"`. This appears to be a workaround to avoid having HTML entity characters directly in the source code, possibly to prevent editor formatting issues. However, this:

- Makes the code significantly harder to read and review
- Adds cognitive load for anyone maintaining the function
- Provides no runtime benefit (the strings are identical)
- Is not documented, leaving future maintainers wondering why the obfuscation exists

## Decision

Replace the entire `escapeSvg()` function with a simple, readable chain of `String.replace()` calls using literal entity strings:

```js
/**
 * Escape text for safe embedding in SVG.
 */
function escapeSvg(text) {
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}
```

This implementation:
- Has no dead code
- Uses the standard, well-known escape ordering (`&` first to avoid double-escaping)
- Is self-documenting — no char code lookup needed
- Reduces the function from 23 lines to 8 lines
- Is functionally equivalent to the current implementation

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Literal replace chain (chosen)** | Readable, standard pattern, minimal lines | Contains `&` characters in source (harmless) |
| **Keep current, remove dead array** | Minimal change | Still obfuscated with fromCharCode |
| **Use a library (e.g., `he`)** | Battle-tested | Unnecessary dependency for 5 char escapes |
| **Document the fromCharCode approach** | Preserves current code | Obfuscation remains; docs rot over time |

## Trade-off Analysis

The literal replace chain is the standard approach used in virtually every JS codebase for HTML/SVG escaping. The only reason the current code uses `fromCharCode` is an undocumented concern about "formatter issues" (see the JSDoc comment). This concern is unfounded — modern formatters (Prettier, Biome) do not modify string literals containing `&`, `<`, or `>`. The readability gain from using literal strings far outweighs any hypothetical formatter risk.

## Consequences

- `src/pdf/generate.js` is ~15 lines shorter
- The function is immediately understandable to any developer
- No behavioural change — output is identical for all inputs
- The JSDoc comment "Uses char codes to avoid formatter issues" can be removed

## Action Items

- [x] Replace `escapeSvg()` with the literal replace chain implementation
- [x] Remove the dead `entities` array and the obfuscating JSDoc comment
- [x] Verify existing PDF tests still pass
- [x] Add a targeted test for `escapeSvg` with all 5 special characters
