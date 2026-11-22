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

- **GM-First Core Loop, Automatic Leveling & Special Skill Trees**: Start a club in seconds and manage your franchise from **Coach Pops' Manager Clipboard** — **1-tap Sim Next 3-Game Series** & **Quick Team Practice (+XP)** automatically grow player ratings and unlock **Skill Points (SP)** for branching **Player & Manager Skill Trees** (with live nav-tab badges for `🩺` injuries, `⚡` ready Skill Points, `🏆` Playoffs, and `⬆` Ballpark upgrades, plus **Deep Player Scouting Dossiers** showing all 15 attributes vs. stat caps).
- **Zero-Scroll Live 3D Games — Arcade Mode (Default) & 1-Tap Pro Manager Mode**: Watch or steer games in over-the-shoulder Three.js 3D with a **Sticky Live Scoreboard**, an attached **Live Action Bar** directly below the diamond (with Coach Pops' contextual *"What To Do Now"* prompts), **Auto Play 3D**, and a 1-tap **Pro Manager** mode unlocking **Pitch Target / Guess Pitch Mind Games**, **Live Dugout Chess** (Pinch Hitters, Pinch Runners, Mound Visits & *Kick Dirt!* Umpire Ejections), **Persistent Batter-vs-Pitcher Nemesis Grudges**, **1994 Foil Card Booster Packs**, live Weather & Defensive Shifts, and a toggleable **Pitch Math & d100 Dice-Roll Inspector**.
- **90s Manga Baseball Cards, Painted 2.5D Ballpark Players & Uniform Studio**: Collectible 90s manga baseball cards (3D card flip, Holo Foil frames, role-specific Pitcher vs. Batter stats, unique combinatorial bios, and 1-tap PNG export), painted 2.5D ballpark players inside sunlit Three.js 3D ballparks, and a live **Uniform Studio** (6 jersey patterns, 4 cap styles, 4 stirrup styles, 6 crest emblems, custom colors/monograms & 6 retro 90s team kit presets).
- **25 Global Baseball Nations & Cultural Heritage Powers**: Full WBC international roster generation across **25 baseball nations** (*USA, Canada, Japan, South Korea, Mexico, Dominican Republic, Puerto Rico, Venezuela, Cuba, Chinese Taipei, Colombia, Netherlands, Italy, Brazil, Australia, Panama, China, Israel, Czechia, Great Britain, Nicaragua, South Africa, Spain, Argentina, Ireland*) with crisp vector SVG flags and 3-tier unlockable Myth/Animal Heritage Powers that actively modify gameplay.
- **Deep Baseball Strategy, Speed-Driven Base Stealing & Co-Ed Archetypes**: Exact `B/T` platoon chess, `2–3` RP / `4–5` SP pitch arsenals, pitcher endurance velocity/break drop-off, full **Base Stealing** (`Steal 2B`, `Steal 3B`, `Double Steal`, `Steal Home`, defensive `Pitchout/Hold`, `SB/CS`, AI steals, live speed-driven odds), Defensive Shifts, Bullpen Warmups, Win Probability & Strike-Zone HUD, `5 / 7 / 9`-inning formats + 1st-extra-inning 2B Ghost Runner, asymmetric co-ed traits, and full sabermetrics (`AVG/OBP/SLG/OPS/ERA/WHIP/K9/Strike%/FPCT`).
- **Full GM Career, Sim-City Ballpark HQ, World Spectacles & Pass-and-Play Duels**: Climb from a neighborhood **Rookie Sandlot (`500–1,500` fans)** to **Pro Major League Cathedrals (`28,000–45,000` fans)** across `10` retro venues with Park Factors, playable **Best-of-3 Postseason Brackets**, Ticket/Concession/Sponsor/District Grid economy, **The Sandlot Gazette**, **52 Narrative Surprise Cards**, **Trade Machine**, **6-Slot Prospect Farm Academy**, hireable **Coaching, Equipment & Medical Staff** (including retired club legends!), **Season Awards & Hall of Fame**, **All-Star Home Run Derby**, **Global Chibi Cup**, **199X Time Capsule Scenarios**, and offline `MBM1:` **Pass-and-Play Friend Boss Duels**.
- **4-Slot Auto-Save, Coach Pops' Guide & 8 Replayable CYOA Backstories**: Automatic local saving & resume across **4 Career Save Slots**, an illustrated **Dugout Handbook**, **8 replayable Manager Backstories** (24 branching CYOA chapters), and an Accessibility/Settings drawer (SFX volume, haptics, wake lock, reduced motion & colorblind stat symbols).
- **Procedural 90s Web Audio (40 SFX Cues + 10 Unique Stadium Soundtracks)**: Zero-dependency Web Audio synthesizer featuring 40 ballpark cues (*Stomp-Stomp-Clap!*, *7th-Inning Stretch*, airhorns, fireworks, multi-formant pink-noise crowds) plus a global **90s Arcade Stadium Jukebox** with a unique theme for every ballpark *(the full 40-cue Ballpark Soundboard lives inside the hidden `5× 'd'` Design Lab)*.

---

## Quick Start

```bash
# Install dependencies
npm install

# Launch the app & dev server (press "d" 5 times anywhere outside text inputs to toggle the hidden Design Lab!)
npm run dev

# Run the TDD unit & component test suite
npm test

# Type-check, lint, and build the offline Android PWA
npm run typecheck && npm run lint && npm run build

# Run Desktop + Android Pixel 7 Playwright E2E tests
npm run test:e2e
```

### Android PWA Hosting (GitHub Pages)

Live PWA: **https://nicholas-wagner.github.io/mini-baseball-manager/**

Pushing to `main` automatically runs [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml), building the offline Workbox Service Worker (`~4.6 MB` core precache with `CacheFirst` runtime caching for manga portrait PNGs) and publishing to GitHub Pages. Open the live HTTPS URL in Android Chrome and tap **Install App** to play fullscreen offline!

---

## Project Blueprint & Roadmap

This repository is structured so both **human contributors** and **AI coding agents** can immediately understand the architecture, invariants, and exact next TDD ticket:

- **[PLAN.md](./PLAN.md)** — 10X Master Roadmap (`M0`–`M10`, 73 vertical slices) & live Progress Dashboard (**`73 / 73` — 100% Complete!**).
- **[docs/SIMULATION_MATH.md](./docs/SIMULATION_MATH.md)** — Full pitch-by-pitch seeded dice-roll formulas, all 15 attribute effects, National/Capstone powers, Weather, Shifts, Mind Games & Nemesis math.
- **[docs/TASKS.md](./docs/TASKS.md)** — Atomic, dependency-ordered TDD task queue (`TASK-001`..`TASK-073`).
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
