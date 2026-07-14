# ADR-018: Design Direction — "Drafting Room" Theme

**Status:** Accepted
**Date:** 2026-07-14
**Deciders:** Open Source Maintainers

## Context

A redesign of ply-calc was proposed with three distinct visual directions:

| Option | Name | Description |
|--------|------|-------------|
| 1a | **Drafting Room** | Blueprint & paper, technical-drawing feel. Warm paper backgrounds, sharp 2px corners, serif display headings, mono labels, blueprint blue accents. |
| 1b | **Night Shop** | Dark pro tool, amber glow. Dark backgrounds, rounded 16px corners, Space Grotesk body font, amber/orange accents, glow effects. |
| 1c | **Warm Studio** | Light, friendly, refined. White backgrounds, rounded 22px corners, Instrument Serif headings, Karla body font, terracotta accents, soft shadows. |

The app is a functional, data-dense tool (tables, form panels, diagram labels). It is not a marketing site. The design must serve clarity and precision above atmosphere.

## Decision

Select **Option 1a — Drafting Room** as the design direction for V1.

## Rationale

1. **Domain fit:** A plywood sheet calculator is a technical planning tool. The blueprint/paper aesthetic reinforces the precision and craftsmanship of the domain. The visual language (sharp corners, technical mono labels, serif headings) mirrors architectural and carpentry drawings.

2. **Data density:** The sharp 2px radii, hairline borders, and minimal shadow allow more information per screen. Options 1b and 1c use 16-22px border radius and padding that would reduce the density of the cut list table and sheet layout diagrams.

3. **V2 dark mode path:** The Drafting Room's diagram palette already includes a dark navy canvas (`#1B2A38`) for the sheet layout views, providing a natural stepping stone to a full dark mode. The `dark:` Tailwind variant can be applied to the existing tokens without restructuring.

4. **Contributor friendliness:** The warm paper palette (`#F7F2E7`, `#FBF8EF`) is easy on the eyes during long configuration sessions. The colour contrast ratios meet WCAG AA for all text sizes.

## Design Token Standards

### Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `paper-50` | `#FBF8EF` | Card backgrounds |
| `paper-100` | `#F7F2E7` | App shell background |
| `paper-200` | `#F1EBDA` | Tab bar, stat blocks, table headers |
| `border-DEFAULT` | `#CFC4AA` | Outer shell border |
| `border-100` | `#DCD2B8` | Dividers, card borders |
| `border-200` | `#E5DBC2` | Nested dividers |
| `border-300` | `#C9BFA8` | Input borders |
| `ink-900` | `#22303D` | Primary headings/body |
| `ink-700` | `#3E4C57` | Secondary body |
| `ink-500` | `#6B7A87` | Muted labels |
| `ink-400` | `#8A9199` | Tertiary labels |
| `accent` | `#2C5C82` | Blueprint blue — primary interactive |
| `accent-light` | `#DCE9F1` | Light blue backgrounds |
| `rust` | `#B5502B` | Distinct CTA (Export PDF) |
| `rust-light` | `#FBF3EA` | Text on rust bg |
| `diagram-canvas` | `#1B2A38` | Sheet diagram bg |
| `diagram-outline` | `#3D5468` | Sheet outline stroke |
| `diagram-fill` | `rgba(111,168,199,0.12)` | Part fill |
| `diagram-stroke` | `#6FA8C7` | Part stroke |

### Typography

| Scale | Token | Size | Font |
|-------|-------|------|------|
| Display headings | `font-display` | 22px / 19px / 16px | Source Serif 4 |
| Body | `font-body` | 13px / 12px | Work Sans |
| Mono labels | `font-mono` | 11px / 10.5px | IBM Plex Mono |

### Shape

- **Border radius:** 2px everywhere. No exceptions. All `rounded-*` Tailwind classes are overridden to 2px.
- **Shadows:** Minimal. `elev-1` through `elev-3` use warm tones (`rgba(30,25,15,...)`). Cards are border-only by default.
- **Borders:** Hairline (1px) for dividers, 1.5px for interactive elements.

## Options Considered

- **Night Shop (1b):** Rejected. Dark mode is desirable but belongs in V2. Shipping a dark-first design now would make the light mode feel like an afterthought.
- **Warm Studio (1c):** Rejected. The generous padding and large border radius reduce data density. The soft, friendly aesthetic does not match the precision-oriented nature of the tool.

## Consequences

- All styling uses the Drafting Room palette defined in `tailwind.config.js`
- Legacy colour tokens (`primary-*`, `surface-*`) are kept as backward-compatible aliases pointing to Drafting Room values
- Part type swatch colours (`bg-blue-200`, etc.) are legacy artifacts from the pre-redesign era and should be replaced with palette-aligned variants
- Any future visual changes must reference this ADR
- To change the design direction, propose a new ADR with a migration plan

## Action Items

- [x] Create ADR-018 documenting the decision
- [ ] Replace legacy Tailwind colour classes (`bg-blue-200`, `bg-green-200`, etc.) with Drafting Room palette tokens
- [ ] Replace legacy `text-primary-600` and `text-surface-*` classes with `text-accent` and `text-ink-*` tokens
- [ ] Ensure all components use design token classes rather than inline hex colours
- [ ] Add part type colour palette aligned to Drafting Room blueprint aesthetic