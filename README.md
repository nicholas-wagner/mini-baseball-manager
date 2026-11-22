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

- **90s Cartoon & 2.5D Chibi Visuals**: Collectible 90s manga & procedural baseball cards (3D card flip, Holo Foil frames, and **role-specific stats** for Pitchers vs. Batters/Fielders) paired with articulated ~1.8-head volumetric 2.5D chibi SVG players standing inside sunlit Three.js 3D ballparks.
- **Global Nationalities & Cultural Heritage Powers**: Weighted international roster generation with crisp vector SVG flags and 3-tier unlockable Myth/Animal Heritage Skill Branches (*Eagle Soar*, *Kitsune Mirage*, *Huracán Swing*, *Kangaroo Bounce*, *Leprechaun's Luck*, and more).
- **Deep Baseball Strategy, Co-Ed Archetypes & 2–60 Min Pacing**: Exact `B/T` platoon chess, `2–3` RP / `4–5` SP pitch arsenals, pitcher endurance velocity/break drop-off, `5 / 7 / 9`-inning game formats + 1st-extra-inning 2B Ghost Runner, asymmetric co-ed traits & clubhouse synergies, full sabermetrics (`AVG/OBP/SLG/OPS/ERA/WHIP/K9/Strike%/FPCT`), and **10 distinct retro stadiums with simulation Park Factors**.
- **Full GM Career, Career Arcs, Toggleable Health & Dugout Staff**: Start in Rookie Sandlot with 6 fair-parity roster builds, climb the 6-tier 48-club pyramid to Mini Major League World Champions, navigate full offseasons (aging arcs `18–40`, retirements, expiring contracts, tier Salary Caps, 3-round Draft & FA), hire/develop **Pitching, Hitting, Bench, Fielding, Bullpen (catchers + pitchers), Equipment Manager, Team Doctor & Athletic Trainer** staff under tier slot caps, and optionally toggle low-frequency realistic Injuries & Illnesses.
- **Procedural 90s Web Audio (28 Cues)**: Zero-dependency Web Audio synthesizer & soundboard featuring bat cracks, organ riffs, *Stomp-Stomp-Clap!*, bullpen phone rings, ump calls, fireworks, and multi-formant pink-noise stadium crowd roars.

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

- **[PLAN.md](./PLAN.md)** — 10X Master Roadmap (`M0`–`M9`, 69 vertical slices) & live Progress Dashboard (**`57 / 69` done** — Milestones `M0`, `M1`, `M2`, `M3`, `M4` & `M7` 100% complete!).
- **[docs/TASKS.md](./docs/TASKS.md)** — Atomic, dependency-ordered TDD task queue (`TASK-001`..`TASK-069`).
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
