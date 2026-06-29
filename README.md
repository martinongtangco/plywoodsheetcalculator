# ply-calc — Plywood Sheet Calculator

A free, browser-based tool that calculates cut lists and sheet requirements for cabinet carcasses from plywood sheets.

## What it does

You tell ply-calc what you are building — a kitchen cabinet, a bookcase, a vanity — by entering box dimensions and drawer configurations. It calculates every part, lays them out on standard sheet sizes, and tells you exactly how many sheets to buy and what to cut. No wasted material, no mental math at the saw.

## Features (V1)

- Calculate cut dimensions for cabinet carcass panels (side, top, bottom, back)
- Calculate drawer box parts (sides, front/back, base)
- Choose construction method: full-height sides or full-width top/bottom
- Three cut modes: batch (strip cutting), balanced, and fully optimised
- Visual 2D sheet layout diagrams showing every cut
- Kerf-aware calculations so your cuts actually fit
- Edge banding support with cut dimension adjustments
- Sheet utilisation percentages and offcut inventory
- Export projects as PDF (cut list + sheet diagrams)
- Export/import projects as JSON for backup or sharing between devices
- Works entirely offline after first load — no internet required

## Demo

[Live demo →](https://ply-calc.app)

(Coming soon — contributions welcome)

## Getting started (for contributors)

```bash
git clone https://github.com/martinongtangco/plywoodsheetcalculator.git
cd plywoodsheetcalculator
pnpm install
pnpm dev
```

The app runs entirely in the browser — no backend, no `.env` file needed.

## Project structure

```
src/
├── components/     # React UI components
├── store/          # Zustand state stores
├── engine/         # Calculation engine — pure functions, zero UI dependencies
├── pdf/            # PDF generation
├── presets/        # Sheet sizes, thicknesses, kerf values, track types
└── utils/          # Shared helpers
```

## How to contribute

Browse open issues to find something to work on. Read the V1 spec in `docs/spec/` to understand what the app should do, and the ADRs in `docs/adr/` to understand why it is built this way. The calculation engine in `src/engine/` is pure functions with zero UI dependencies — easy to test and reason about. Woodworker domain knowledge is as valuable as code: if a calculation feels wrong, open an issue and explain what you expect.

## Architectural decisions

See [docs/adr/](docs/adr/) for all Architecture Decision Records.

## Spec

The full V1 feature specification lives in [docs/spec/V1_FEATURE_SPEC.md](docs/spec/V1_FEATURE_SPEC.md).

## License

MIT