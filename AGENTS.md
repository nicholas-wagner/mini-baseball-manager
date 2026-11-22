# AGENTS.md — AI Agent Onboarding & Contribution Protocol

Welcome to **Mini Baseball Manager** — a retro 90s Saturday-morning cartoon & 2.5D chibi baseball GM/Manager RPG built as an offline-first, Android-installable PWA.

Any AI agent (fresh session, subagent, or parallel worker) should read this file first (~60 seconds), then check `docs/TASKS.md` for the next `READY` ticket.

---

## 1. Read Order for New Agents

1. **`AGENTS.md`** *(this file)* — Rules, architecture invariants, commands, pitfalls already solved, Definition of Done.
2. **`PLAN.md`** — 10X Master Vision, Progress Dashboard (`M0`–`M9`), and Plan Adjustment / Decision Log.
3. **`docs/ARCHITECTURE.md`** — Canonical TypeScript interfaces, `PlayEvent` contracts, and save schema.
4. **`docs/TASKS.md`** — Atomic dependency-ordered task queue (`TASK-001`..`TASK-062`). Pick the highest-priority `READY` task!
5. **`docs/DESIGN_SYSTEM.md`** — Exact 90s colors, borders, shadows, typography, touch targets, and 3D ballpark coordinates.
6. **Project Workflow Skills (`.agents/skills/`)** — Portable engineering skills (auto-discovered by Antigravity and readable by any AI editor):
   - [`.agents/skills/ub-tdd-craft/SKILL.md`](./.agents/skills/ub-tdd-craft/SKILL.md) — Strict TDD, behavior-focused tests, Clean Code refactoring, and CRAP-lite complexity discipline (*inspired by `unclebob/ub-mode`*).
   - [`.agents/skills/pstack-correct/SKILL.md`](./.agents/skills/pstack-correct/SKILL.md) — Architectural sketching, root-cause fixes, and the `/correct` mistake-elimination ladder (*inspired by `cursor/plugins/pstack`*).

---

## 2. Hard Architectural Rules (Mechanically Enforced!)

1. **Hexagonal Layer Purity** *(enforced by `eslint.config.js`)*:
   - `src/engine/**` MUST be **100% pure TypeScript**. **ZERO imports** from `react`, `react-dom`, `three`, `zustand`, `ui`, `scene`, `store`, `art`, `audio`, or browser globals (`window`, `document`, `localStorage`, `indexedDB`, `navigator`, `fetch`).
   - Production `src/engine/**/*.ts` enforces cyclomatic `complexity <= 10` and `max-depth <= 3`.
   - `src/scene/**` (Three.js 3D engine) is imperative and decoupled from React reconciliation; pure math modules (`cameraRig.ts`, `animationState.ts`, `ballTrajectory.ts`) must remain runnable in Node/jsdom without WebGL.
   - `src/ui/**` reads projections and dispatches actions via `src/store/**` and renders the 3D scene through thin host wrappers (e.g., `BallparkCanvas.tsx`).
2. **Seeded Determinism (`SeededRng`)** *(enforced by `eslint.config.js`)*:
   - NEVER use `Math.random()` inside `src/engine/**` or `src/art/**`. Always thread `SeededRng` from `src/engine/rng/seededRng.ts` so every game, draft class, portrait, nationality roll, and surprise event is 100% reproducible in tests.
3. **Strict TDD (Red → Green → Refactor)** *(enforced by `vitest.config.ts`)*:
   - Write failing Vitest tests BEFORE writing implementation code for every engine rule, RPG modifier, economy formula, AI decision, persistence migration, and interactive UI component.
   - Maintain **≥90% statements, branches, functions, and lines coverage** across `src/engine/**/*.ts` (checked automatically on `vitest run --coverage`).
4. **Local-Only Persistence**:
   - Zero centralized backend DB. All state lives on-device (IndexedDB primary + localStorage metadata + schema version migrations + portable JSON/Base64 export/import).
5. **Visual & Mobile Craft**:
   - Android-installable PWA, **portrait-first** on mobile (`390×844`, `>=44px` tap targets, respects `safe-area-inset-*`), automatic wide landscape layout during 3D games, WebGL DPR capped at `<= 2`.

---

## 3. Exact Domain Invariants Already Locked In

| System | Invariant | Source of Truth |
| :--- | :--- | :--- |
| **Nationalities** | Exact weights summing to `100`: `50% USA` + `5%` each (`CAN`, `JPN`, `KOR`, `MEX`, `DOM`, `PRI`, `BRA`, `ARG`, `AUS`, `IRL`), each with authentic names/hometowns, vector SVG flag, and a Myth/Animal Cultural Heritage Ability | `src/engine/nationalities/nationalitiesCatalog.ts` |
| **Batting Handedness** | Exact distribution: `50% R`, `40% L`, `10% Switch (S)` | `src/engine/handedness/handedness.ts` |
| **Throwing Handedness** | `SP`: `35% L`; `RP`: `50% L`; `LF/CF/RF`: `50% L`; `1B`: `80% L`; `C`: `20% L`; `2B/3B/SS`: `0% L (100% R)` | `src/engine/handedness/handedness.ts` |
| **Player Art** | Cards use cel-shaded 90s SVG portraits (`generatePortrait.ts`); field & rig characters use ~1.8-head volumetric 2.5D chibi SVG rigs (`renderMiniPlayerSvg.ts`) rendered both in DOM (`MiniPlayerSvg.tsx`) and as camera-aware 2.5D standees in Three.js (`chibiBuilder.ts`) | `src/art/portraits/`, `src/art/playerSvg/` |
| **League Pyramid** | 6 tiers × 8 teams (48 clubs): Rookie → Low-A → High-A → AA → AAA → Mini Major League; 21-game regular season (3× round-robin) + 4-team Best-of-3 playoffs | `PLAN.md` |
| **Audio** | 100% procedural Web Audio API (`soundEngine.ts`); zero external audio downloads; global mute toggle | `src/audio/soundEngine.ts` |
| **Specialists & Positions** | `PlayerSpecialistArchetype` + `PositionalFlexibilityProfile` (`1B`-only, `SS/2B`, all-infield, etc.) + `favoritePosition` boost (`+5 FLD/+4 CTL, +3 CLU`) + Cross-Training opportunity cost & `-4..-8` positional rust | `docs/ARCHITECTURE.md` |
| **Roster Cap & Market Tiers** | `MAX_ACTIVE_ROSTER_SIZE = 20`; 6 `PlayerMarketTier` profiles (`rookie` cheap/high-variable-ceiling, `all_star` rare/expensive, `veteran` affordable/steady/minimal-growth, `above_average`, `average`, `below_average` bargain specialist) | `docs/ARCHITECTURE.md` |
| **Pitch Arsenals & Matchups** | `RP` strictly `2–3` pitches, `SP` strictly `4–5` pitches from 8-pitch `PitchType` catalog; both pitchers & batters have a `favoritePitch` bonus and `weakestPitch`/`weakPitch` vulnerability, trainable via Pitch Lab / Recognition drills | `docs/ARCHITECTURE.md` |
| **Compromise Training & Ability Cooldowns** | Every training drill carries a concrete trade-off/rust cost inside `statCaps` & `totalRatingBudget` (only rare `all_star`s carry elite multi-tool budgets); super-power swings/pitches/abilities consume Hype + Fatigue and obey strict per-game charge & multi-PA/batter cooldown caps | `docs/ARCHITECTURE.md` |
| **Luck, Mental Traits & Leverage (`LI`)** | Universal subtle `luck` (`1..99`), clubhouse/mental traits (`clubhouse_glue`, `high_energy`, `ice_veins`, `pressure_riser`, `pressure_wilt`), and dynamic Leverage Index (`LI`) × Game Stakes driving clutch surges vs pressure wilting | `docs/ARCHITECTURE.md` |
| **Pitcher Roles & Sabermetrics** | 7 `PitcherRole` profiles (`starter`, `long_reliever`, `short_reliever`, `loogy`, `setup_man`, `closer`, `fireman`), explicit ball/strike command, `GB%/LD%/FB%/PopUp%` batted-ball profiles, defender `range`/`arm`/`fielding`, and derived `AVG/OBP/SLG/OPS/WHIP/ERA/K9/BB9/Strike%/FPCT` | `docs/ARCHITECTURE.md` |
| **Slow-Earned Career Experience** | `CareerServiceProfile` (`seasonsPlayed`, `careerGames`, `PAs/IP`, `playoffGames` -> `rookie_green`..`cagey_veteran`) takes multiple seasons to earn and grants veterans a subtle `+2..+3` Eye/Control & high-LI composure edge over green rookies | `docs/ARCHITECTURE.md` |
| **Pitcher Endurance & Game Pacing** | Live mound `endurance` (`100 -> 0`) degrades fastball velo (`-1..-7 mph`), sinker/splitter drop & `GB%`, and breaking-ball break; games support `5 / 7 / 9`-inning formats, `Sim Half-Inning`, `Clutch Burst`, and 1st-extra-inning 2B Ghost Runner for 2–5 min short bursts & long sessions | `docs/ARCHITECTURE.md` |
| **Role-Specific Card Stats** | Baseball card backs show distinct stats by role: **Pitchers (`SP`/`RP`)** display `Velocity`, `Movement`, `Control`, `Stamina`, `Clutch` + `ERA/WHIP/K9/Strike%`; **Batters/Fielders** display `Contact`, `Power`, `Speed`, `Fielding`, `Arm` + `AVG/OBP/OPS/FPCT` (never Contact/Power on pitchers or Pitching on hitters) | `src/engine/models/playerCardStats.ts` |
| **Fair Starting Roster Presets** | New clubs start in Rookie Sandlot choosing 1 of 6 parity-balanced presets (`all_rookies`, `balanced`, `veterans`, `good_defense`, `good_hitting`, `good_pitching`) within the same Rookie OVR power band (`±1.5` OVR vs rivals) on the road to Mini Major League World Champions | `docs/ARCHITECTURE.md` |
| **Offseason & Tier Salary Caps** | End-of-season & offseason flow runs Retirements, Expiring Contracts (`yearsRemaining -> 0`) + Re-Sign decisions, Tier-Scaled Payroll **Salary Caps** (`rookie` → `majors`), 3-Round Amateur Draft, and Free-Agent Signing Window alongside `MAX_ACTIVE_ROSTER_SIZE = 20` | `docs/ARCHITECTURE.md` |
| **Co-Ed Attribute Tilts & Synergies** | Equal-OVR male vs. female baseball archetypes & complementary special traits (Male: raw Power/Velocity/Arm + Bravado/Enforcer/Workhorse traits vs. chase/discipline risk; Female: Contact/Eye/Movement/Control/Speed/Fielding + Tactical Poise/Table-Setter/Spin Wizard traits vs. raw HR/velo) creating distinct mixed-roster, mostly-one-sex splash, and all-male/all-female strategies | `docs/ARCHITECTURE.md` |

---

## 4. Local Commands & Verification Toolchain

Run binaries directly via `./node_modules/.bin/*` (works cleanly inside restricted sandboxes where `npm` shims may not be on `PATH`):

```bash
# Unit & Component TDD Suite
./node_modules/.bin/vitest run

# Watch mode during TDD iteration
./node_modules/.bin/vitest

# Coverage check
./node_modules/.bin/vitest run --coverage

# Strict TypeScript check
./node_modules/.bin/tsc -b --noEmit

# ESLint check
./node_modules/.bin/eslint .

# Production & Android PWA Service Worker build
./node_modules/.bin/vite build

# Playwright Browser E2E (Desktop 1280x800 + Android Pixel 7 390x844)
mkdir -p /tmp/pw-chrome-cfg /tmp/pw-chrome-cache && ./node_modules/.bin/playwright test
```

*(Note: `npm run dev` launches the Vite dev server for live interactive review.)*

---

## 5. Pitfalls Already Solved (Do Not Regress!)

1. **Inline SVG `<defs>` ID Collisions**: Multiple `<MiniPlayerSvg />` or portrait SVGs render on the same DOM page. ALWAYS namespace `<radialGradient>` / `<linearGradient>` / `<pattern>` IDs with a unique suffix (`seed + role + facing + throws + batSide`) so gradients never bleed across characters.
2. **Front ↔ Back Handedness Consistency**:
   - Mitt side: `const mittOnViewerLeft = (facing === 'back') === (throwsHand === 'R')`.
   - Bat side: `const batOnViewerLeft = (facing === 'front') === (batSide === 'R')`.
   - Back-view pitcher baseball MUST render **underneath** the back-of-hand circle (peeking from palm side), NEVER glued on top of the knuckles.
   - Helmet ear-flap sits on the batter's front ear facing the pitcher (opposite the bat shoulder).
3. **2.5D Standee Rim in Three.js**: Keep `rimBackingMesh` tight (`z = -0.025`, `scale = 1`) and pass `includeGroundShadow: false` into Three.js sprites so shadows aren't doubled over the real 3D ground disc.
4. **Crowd Audio Realism**: NEVER synthesize crowd cheers from plain white noise (sounds like TV static). Keep `playCrowdLayer()` using Paul Kellet pink noise + sweeping vocal-tract formants + staggered hand claps + subtle distant cheer glide.
5. **Playwright & `tsc -b`**: Do not import Node-only built-ins like `node:fs` inside `playwright.config.ts` (keeps `tsconfig.node.json` clean without extra `@types/node` friction). Keep `XDG_CONFIG_HOME` / `XDG_CACHE_HOME` pointed to `/tmp/pw-chrome-*` so Chromium crashpad works inside sandboxes.
6. **Three.js + jsdom**: `tests/setup.ts` stubs `HTMLCanvasElement.prototype.getContext` to return `null` so `<BallparkCanvas />` activates its graceful non-WebGL fallback cleanly in unit tests.

---

## 6. Definition of Done (Every Task / PR / Commit)

Before marking a task `DONE` in `docs/TASKS.md`:

1. Set task status to `IN_PROGRESS` before coding.
2. Write failing Vitest tests first (**RED**), implement clean TypeScript (**GREEN**), refactor cleanly (**REFACTOR**).
3. Run the full verification pipeline and confirm **zero errors**:
   - `./node_modules/.bin/vitest run --coverage` *(enforces `>= 90%` coverage on `src/engine/**/*.ts`)*
   - `./node_modules/.bin/tsc -b --noEmit`
   - `./node_modules/.bin/eslint .` *(enforces hexagonal purity, `SeededRng`, and engine complexity caps)*
   - `./node_modules/.bin/vite build`
4. If touching UI, SVG art, or 3D scenes: run Playwright E2E and visually inspect real screenshots across Desktop (`1280×800`) and Android Mobile (`390×844`) viewports.
5. **Keep `README.md` & Visual Previews Up to Date**: Whenever shipping a new milestone, major feature, or noticeable UI/3D/art improvement, update `README.md` (status/progress count, feature highlights, commands) and refresh or add up-to-date screenshots in `docs/screenshots/`.
6. Update `docs/TASKS.md` (`DONE` + any unlocked downstream `READY` tickets) AND update `PLAN.md` (Progress Dashboard counts, checkboxes, and Decision Log if any scope/design changed).
7. Make a clean, focused Git commit referencing the Task ID (e.g., `Implement seeded pitch-by-pitch simulation engine (TASK-014)`).
