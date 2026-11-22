# ⚾ Mini Baseball Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-FFC300.svg?style=flat-square&labelColor=181B2C)](./LICENSE)
[![CI](https://github.com/nicholas-wagner/mini-baseball-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/nicholas-wagner/mini-baseball-manager/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/Android_PWA-Offline_First-2FB356?style=flat-square&labelColor=181B2C)](./vite.config.ts)

**Mini Baseball Manager** is an open-source, offline-first **retro 90s cartoon & volumetric 2.5D chibi baseball GM / Manager RPG** built for desktop and Android PWA.

Manage lineups, draft global prospects, develop branching player & manager skill trees, unleash cultural myth & animal Special Powers, build a Sim-City ballpark district, fuel multi-season team rivalries, and watch games unfold in **over-the-shoulder 3D**—all stored locally on your device with zero centralized backend.

---

## Visual Preview (Milestone 1 — Design-First Lab)

| Over-the-Shoulder 3D (RHP vs RHB) | Southpaw Matchup (LHP vs LHB) |
| :---: | :---: |
| ![Pitcher Over-the-Shoulder 3D](./docs/screenshots/lab_pitcher_ots.png) | ![Lefty-on-Lefty 3D Matchup](./docs/screenshots/lab_lefty_matchup.png) |

| 2.5D Volumetric Chibi SVG Rig Inspector | Retro 90s Baseball Cards & Cultural Powers |
| :---: | :---: |
| ![2.5D Chibi SVG Rig Inspector](./docs/screenshots/lab_svg_inspector.png) | ![Retro 90s Baseball Cards](./docs/screenshots/lab_baseball_cards.png) |

---

## Core Pillars

- **90s Cartoon & 2.5D Chibi Visuals**: Cel-shaded procedural 90s SVG baseball-card portraits (with 3D card flip & Holo Foil frames) paired with articulated ~1.8-head volumetric 2.5D chibi SVG players standing on a sunlit Three.js 3D ballpark.
- **11 Global Nationalities & Cultural Heritage Powers**: Exact weighted roster generation (`50% USA` + `5%` each Canada, Japan, South Korea, Mexico, Dominican Republic, Puerto Rico, Brazil, Argentina, Australia, Ireland) with crisp vector SVG flags and Myth/Animal Heritage Powers (*Eagle Soar*, *Kitsune Mirage*, *Huracán Swing*, *Kangaroo Bounce*, *Leprechaun's Luck*, and more).
- **Authentic Lefty / Righty / Switch Platoon Chess**: Position-specific handedness distributions (`50% R / 40% L / 10% Switch` batting; `SP` 35% L, `RP` 50% L, `OF` 50% L, `1B` 80% L, `C` 20% L, `2B/3B/SS` 100% R), mirrored 2.5D chibi gloves/bats/ear-flaps, 1st/3rd-base batter's boxes, and throwing-shoulder OTS cameras.
- **Procedural 90s Web Audio**: Zero-dependency Web Audio synthesizer for bat cracks, super-pitch whooshes, ballpark organ riffs (*Charge!*, *Home Run!*), and a multi-formant pink-noise stadium crowd roar.
- **10X Roadmap**: 6-tier promotion/relegation pyramid (48 clubs), branching Player & Manager Skill Trees, Hot Streaks & Cold Slumps, Dynamic Rivalries, Sim-City Ballpark District Builder, Trade Machine, *The Sandlot Gazette* newspaper, Home Run Derby, and the Global Chibi Cup.

---

## Quick Start

```bash
# Install dependencies
npm install

# Launch the interactive Design Lab & dev server
npm run dev

# Run the TDD unit & component test suite
npm test

# Type-check, lint, and build the offline Android PWA
npm run typecheck && npm run lint && npm run build

# Run Desktop + Android Pixel 7 Playwright E2E tests
npm run test:e2e
```

---

## Project Blueprint & Roadmap

This repository is structured so both **human contributors** and **AI coding agents** can immediately understand the architecture, invariants, and exact next TDD ticket:

- **[PLAN.md](./PLAN.md)** — 10X Master Roadmap (`M0`–`M9`, 52 vertical slices) & live Progress Dashboard (`12 / 52` done).
- **[docs/TASKS.md](./docs/TASKS.md)** — Atomic, dependency-ordered TDD task queue (`TASK-001`..`TASK-052`).
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Canonical TypeScript interfaces, `PlayEvent` stream contracts, and 3D ballpark coordinates.
- **[docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)** — Exact 90s color tokens, typography, touch targets, and chibi scale units.
- **[AGENTS.md](./AGENTS.md)** — AI Agent onboarding guide, hard architectural invariants, and Definition of Done.

---

## Tech Stack

- **Frontend**: Vite 6, React 19, TypeScript (strict), Tailwind CSS v4, Zustand
- **3D & Art**: Imperative Three.js (`src/scene/`) + Procedural Vector SVG Portraits, Flags & 2.5D Chibi Rigs (`src/art/`)
- **Audio**: Procedural Web Audio API (`src/audio/`)
- **Testing (Strict TDD)**: Vitest, React Testing Library, jsdom, Playwright (Desktop & Android Pixel 7)
- **Offline & Mobile**: `vite-plugin-pwa` (Workbox Service Worker + Android adaptive/maskable icons) + local-only IndexedDB persistence

---

## Contributing & License

Contributions of all kinds are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and pick any `READY` ticket from [docs/TASKS.md](./docs/TASKS.md).

Released under the [MIT License](./LICENSE).
