# docs/TASKS.md — Autonomous AI Agent Task Queue

> **How Any AI Agent Uses This Queue**:
> 1. Read `AGENTS.md` and `docs/ARCHITECTURE.md`.
> 2. Pick the first task marked **`READY`** whose `Depends On` tasks are all `DONE`.
> 3. Change its status to **`IN_PROGRESS`** before writing code.
> 4. Follow **Strict TDD** (write the listed failing tests first → implement → verify `vitest`, `tsc`, `eslint`, `vite build`, and Playwright/screenshots for visual tasks).
> 5. Mark the task **`DONE`**, flip any newly unblocked tasks to **`READY`**, update `PLAN.md`, **refresh `README.md` and `docs/screenshots/` visual previews** whenever user-facing visuals or milestones advance, and create a clean Git commit referencing the Task ID.

---

## Completed Foundation (`M0` & `M1`)

| Task ID | Status | Title | Key Files |
| :--- | :--- | :--- | :--- |
| `TASK-001` | `DONE` | Vite + React + TS + Tailwind v4 + Three.js + Zustand + offline fonts | `package.json`, `vite.config.ts` |
| `TASK-002` | `DONE` | Vitest + Testing Library + Playwright Desktop & Android harness | `vitest.config.ts`, `playwright.config.ts` |
| `TASK-003` | `DONE` | Android-installable PWA manifest, SW & crisp PNG/maskable icons | `public/icons/*`, `vite.config.ts` |
| `TASK-004` | `DONE` | 90s Baseball Card Design System spec & tokens | `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css` |
| `TASK-005` | `DONE` | 90s UI Kit (`ComicButton`, `ComicCard`, `StatBadge`, `ScoreboardStrip`, `AppShell`) | `src/ui/design-system/*` |
| `TASK-006` | `DONE` | Cel-shaded 90s SVG Portrait Generator & 3D Flip Baseball Card | `src/art/portraits/*`, `FlipBaseballCard.tsx` |
| `TASK-007` | `DONE` | Volumetric 1.8-head 2.5D Chibi SVG Rigs & 14 animation clips | `src/art/playerSvg/*`, `MiniPlayerSvg.tsx` |
| `TASK-008` | `DONE` | Miniature 3D Ballpark, Over-the-Shoulder Camera Rig & Super-Power VFX | `src/scene/**` |
| `TASK-009` | `DONE` | Procedural 90s Web Audio Synth, Ballpark Organ & Multi-Formant Crowd Roar | `src/audio/soundEngine.ts` |
| `TASK-010` | `DONE` | Interactive Design Lab Showcase Screen | `src/ui/screens/DesignLabScreen.tsx` |
| `TASK-011` | `DONE` | 11 Global Nationalities (`50% USA + 5% × 10`), SVG Flags & Cultural Heritage Powers | `src/engine/nationalities/*`, `src/art/flags/*` |
| `TASK-012` | `DONE` | Lefty / Righty / Switch Handedness Engine, Platoon Math & Mirrored Graphics | `src/engine/handedness/*` |

---

## Milestone 2 — Core Playable MVP *(Next Up!)*

### `TASK-013` — Canonical Domain Models & Seeded Club/Roster Factory
- **Status**: `DONE`
- **Milestone**: M2 (`2A`)
- **Depends On**: `TASK-011`, `TASK-012`
- **Files to Create**:
  - `src/engine/models/player.ts`, `src/engine/models/club.ts`, `src/engine/models/playEvent.ts`, `src/engine/models/manager.ts`
  - `src/engine/gm/rosterFactory.ts`
  - `src/engine/gm/rosterFactory.test.ts`
- **Specification**:
  - Implement canonical TypeScript interfaces from `docs/ARCHITECTURE.md` (Section 2).
  - Build `createPlayer(rng, { position, tier, forcedNationalityId? })` using `generatePlayerIdentity`, `rollBatsHand`, `rollThrowsHand`, `createPortraitTraits`, and tier-scaled ratings (`rookie` ~42–68 OVR → `majors` ~72–96 OVR).
  - Build `createClub(rng, { id, city, name, mascot, colors, leagueTier, isHuman })` generating a complete balanced 18-man roster: 9 starting position players (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH/UTIL`), 3 bench hitters, 3 starting pitchers (`SP`), and 3 relievers (`RP`), with valid auto-generated `lineup`, `rotationIds`, and `bullpenIds`.
  - Provide `computePlayerOverall(player)` and `validateLineup(club)` (rejects duplicate players, missing defensive positions, or pitcher in wrong slot).
- **Required TDD Tests (Write First!)**:
  - Same seed produces byte-identical club & roster.
  - Roster contains exact required position counts (`C, 1B, 2B, 3B, SS, LF, CF, RF`, `SP >= 3`, `RP >= 3`).
  - Lineup validator rejects duplicate player IDs and passes valid 9-man lineups.
  - Tier rating curve scales monotonically (`avgOvr(rookie) < avgOvr(aa) < avgOvr(majors)`).

---

### `TASK-014` — Seeded Pitch-by-Pitch Baseball Simulation Engine
- **Status**: `DONE`
- **Milestone**: M2 (`2B`)
- **Depends On**: `TASK-013`
- **Files to Create**:
  - `src/engine/simulation/gameState.ts`
  - `src/engine/simulation/pitchResolver.ts`
  - `src/engine/simulation/baseballEngine.ts`
  - `src/engine/simulation/baseballEngine.test.ts`
- **Specification**:
  - Pure deterministic state machine supporting:
    - `createGameSession(awayClub, homeClub, seed)`
    - `stepPitch(session, tacticalCall?)` -> `{ nextSession, events: PlayEvent[] }`
    - `stepAtBat(session, tacticalCall?)` -> advances until plate appearance resolves
    - `simUntilClutchOrEnd(session)` -> powers **Clutch Moments Auto-Cam** (pauses whenever RISP, tying/go-ahead run at plate in 7th+, or Special Power ready!)
    - `simFullGame(awayClub, homeClub, seed)` -> full 9-inning (plus extra innings!) game with complete box score & stat deltas.
  - Tactical calls: `'normal' | 'contact' | 'power' | 'bunt' | 'steal' | 'intentional_walk'`.
  - Integrates `evaluatePlatoonMatchup(batter.bats, pitcher.throws)` and `getPositionalHandednessBonus()` directly into hit/K/break/steal probabilities!
  - Emits rich `PlayEvent` records with 3D landing coordinates, `ballFlight`, `fieldingHighlight`, `soundCue`, `isClutchMoment`, and `xpAwards`.
- **Required TDD Tests (Write First!)**:
  - Seeded determinism: two `simFullGame` runs with seed `1994` yield identical final score & event streams.
  - Full baseball rules: 4 balls = walk (forces runners only when occupied), 3 strikes = strikeout, 3 outs = half-inning swap, home team skips bottom 9th if leading, extra innings resolve ties cleanly.
  - Platoon math: statistically over 2,000 simulated PAs, opposite-hand batters outperform same-hand batters and Switch Hitters outperform non-switch peers of equal ratings.
  - Steal attempts respect LHP `pickoffHoldBonus`; bunts & grounders respect LHB `firstBaseStepBonus`.
  - `simUntilClutchOrEnd` stops immediately on RISP or late close innings.

---

### `TASK-015` — New Club Creator, Roster & Lineup/Rotation Manager
- **Status**: `IN_PROGRESS`
- **Milestone**: M2 (`2C`)
- **Depends On**: `TASK-013`
- **Files to Create/Modify**:
  - `src/store/gameStore.ts` + `src/store/gameStore.test.ts`
  - `src/ui/screens/ClubCreatorScreen.tsx`
  - `src/ui/screens/RosterLineupScreen.tsx` + `src/ui/screens/RosterLineupScreen.test.tsx`
- **Specification**:
  - **Quick Club Creator**: Pick City, Team Name, 2-letter Monogram, Mascot, and Primary/Secondary/Accent colors + 1-tap **"Randomize Club"** button + live preview of your 2.5D chibi mascot player & home jersey!
  - **Lineup & Rotation Board**: Touch-friendly tap-to-swap 9-man batting order (showing `B/T`, OVR, Position, Flag, Heritage Power), Starting Rotation (`SP1..SP3`), Bullpen (`RP`), Bench, and 1-tap **"Auto-Optimize Lineup"** button.
- **Required TDD Tests**:
  - Store creates new club & persists valid lineup swaps; auto-optimize places best hitters in 1–4 spots; UI renders mobile-friendly swap buttons without overflow.

---

### `TASK-016` — Live 3D Game Day Experience & Full 9-Fielder Playback Controller
- **Status**: `BLOCKED` *(unblocks when `TASK-014` and `TASK-015` are `DONE`)*
- **Milestone**: M2 (`2D`)
- **Depends On**: `TASK-014`, `TASK-015`
- **Files to Create/Modify**:
  - `src/scene/playback/gameSceneController.ts`
  - `src/scene/playback/eventChoreographer.ts` + `src/scene/playback/eventChoreographer.test.ts`
  - `src/ui/screens/GameDayScreen.tsx` + `src/ui/screens/GameDayScreen.test.tsx`
- **Specification**:
  - Upgrade 3D scene for Live Games: render **all 9 animated 2.5D chibi defenders** at their diamond coordinates plus animated **baserunners** running between home → 1B → 2B → 3B → home!
  - `eventChoreographer` maps every `PlayEvent` to timed 3D camera swoops (Pitcher OTS when pitching, Batter OTS when batting, Broadcast Ball-Follow on hits!), chibi animations, VFX trails, comic starbursts, and `soundEngine` cues!
  - Live Game HUD: `ScoreboardStrip`, Strike-Zone mini pitch display, Platoon Matchup badge, Play-by-Play ticker, Speed selector (**1x / 2x / 4x**), **Watch Mode** (**Live 3D / Clutch Moments / Instant Sim**), Tactical Call dock, and Pitching Change modal.
- **Required TDD & Visual Gates**:
  - Choreographer unit tests map every `AtBatOutcome` to valid animation/VFX/audio cues.
  - Playwright E2E plays a full game to completion on both Desktop and Android Mobile (`390×844`).

---

### `TASK-017` — Exhibition / Opening Series & Post-Game MVP Flow
- **Status**: `BLOCKED` *(unblocks when `TASK-016` is `DONE`)*
- **Milestone**: M2 (`2E`)
- **Depends On**: `TASK-016`
- **Files to Create**:
  - `src/engine/simulation/rewards.ts` + `src/engine/simulation/rewards.test.ts`
  - `src/ui/components/PostGameSummaryModal.tsx`
- **Specification**:
  - Post-game full batting & pitching box score, automated **Game MVP** calculation displayed as a shining 3D-flippable Holo Foil spotlight card, Player XP bars leveling up, Manager XP gain, and gate/cash payout summary.

---

### `TASK-018` — Local IndexedDB Persistence, Multi-Slot Saves & JSON Backup
- **Status**: `IN_PROGRESS`
- **Milestone**: M2 (`2F`)
- **Depends On**: `TASK-015`
- **Files to Create**:
  - `src/store/persistence.ts` + `src/store/persistence.test.ts`
  - `src/store/migrations.ts`
  - `src/ui/components/SaveSlotsModal.tsx`
- **Specification**:
  - IndexedDB storage adapter with automatic `localStorage` fallback (great for jsdom & private-mode browsers).
  - Supports 3 save slots (`slot-1`, `slot-2`, `slot-3`), auto-save after every game/roster action, schema version check + migration pipeline (`migrateSave(raw)`), and 1-tap **Export JSON File** / **Import JSON File** with strict validation!
- **Required TDD Tests**:
  - Save/load round-trip preserves full `SaveFileV1`, rejects corrupted JSON cleanly, migrates mock v0 → v1 payloads, and isolates all 3 slots.

---

## Milestone 3 — RPG Core *(Unblocks after M2 MVP)*

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-019` | `BLOCKED` | `TASK-013`, `TASK-014` | **Branching Player Skill Trees** (`src/engine/rpg/skillTrees.ts` + pan/zoom `SkillTreeScreen.tsx`): Pitcher, Batter & Fielder node graphs (30+ nodes), prerequisite checks, SP spend/respec, capstone Special Powers (*Blazing Comet*, *Ghost Knuckle*, *Tornado Slider*, *Moonshot Bomb-Swing*, *Ninja Bunt*, *Rally Spark*, *Sky-High Leap*, *Cannon Arm*, *Ice Veins*) wired into sim & 3D VFX! |
| `TASK-020` | `BLOCKED` | `TASK-019` | **3-Tier Cultural Heritage Skill Branches** (`src/engine/rpg/heritageTrees.ts`): Unlockable 3-node cultural myth/animal progression per nationality (Tier 1 passive → Tier 2 clutch boost → Tier 3 Signature Myth/Animal Power with custom 3D VFX & Hype-gauge trigger!). |
| `TASK-021` | `BLOCKED` | `TASK-014`, `TASK-017` | **Dynamic Hot Streaks & Cold Slumps** (`src/engine/rpg/formTracker.ts`): Rolling form score (`-100..+100`), 🔥 *Blazing/Hot* & 🧊 *Cold/Frozen* rating curves, fiery/icy card frames & moods, slump-busting hooks! |
| `TASK-022` | `BLOCKED` | `TASK-019`, `TASK-021` | **Animated Practice & Training Complex** (`src/engine/rpg/practiceEngine.ts` + `PracticeScreen.tsx`): Batting Cage, Bullpen Lab, Fielding Fungos, Sprint Track, Slump-Buster Film Room, Fan Meet & Greet — cute animated 2.5D chibi dioramas with floating `+XP`, fatigue trade-off & double-SP crits! |
| `TASK-023` | `BLOCKED` | `TASK-016`, `TASK-022` | **Human Manager RPG Tree & Active Power Dock** (`src/engine/manager/managerTree.ts` + `ManagerScreen.tsx`): Skipper Active Powers (*Pep Talk*, *Mound Whisper*, *Clutch Focus*, *Rally Cap Magic*), Coach Training Passives, Mogul GM Passives + in-game Power Dock with comic splash banners & organ riffs! |

---

## Milestone 4 — Living 6-Tier League World & Team Rivalries

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-024` | `BLOCKED` | `TASK-014`, `TASK-018` | **6-Tier Pyramid & 21-Game Season Engine** (`src/engine/league/seasonEngine.ts` + `LeagueScreen.tsx`): 48 unique themed clubs across Rookie → Majors, balanced 7-series (21-game) scheduler, standings, tiebreakers, leaders, 4-team Best-of-3 playoffs, promotion/relegation transitions. |
| `TASK-025` | `BLOCKED` | `TASK-024` | **Fog-of-War Scouting & 3-Round Amateur Draft** (`src/engine/gm/draftEngine.ts` + `DraftScreen.tsx`): Scouting budget reveals potential/ratings, interactive Draft Room with retro cards & international prospects. |
| `TASK-026` | `BLOCKED` | `TASK-024` | **Free Agency, Contracts, Payroll & Waivers** (`src/engine/gm/freeAgency.ts` + `MarketScreen.tsx`): Contract negotiation, bidding wars, cut/release morale & dead-cap logic. |
| `TASK-027` | `BLOCKED` | `TASK-024`, `TASK-025`, `TASK-026` | **Personality-Driven AI GMs & Bullpen AI** (`src/engine/ai/aiGm.ts` + 10-season soak test): 5 AI philosophies drafting, signing, training, optimizing platoon lineups, and calling lefty specialists. |
| `TASK-028` | `BLOCKED` | `TASK-024`, `TASK-026` | **Dynamic Team Rivalries Engine & Showdowns** (`src/engine/league/rivalryEngine.ts`): Persistent Rivalry Heat (`0–100`), Crosstown starter rival, walk-off/playoff/poached-star revenge triggers, pre-game 90s Comic "VS" splash card, +25–50% Hype charge, +25% XP, Traveling Rivalry Cups. |

---

## Milestone 5 — Sim-City Ballpark District & Economy

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-029` | `BLOCKED` | `TASK-024`, `TASK-028` | **Fanbase, Hype & Dynamic Attendance Engine** (`src/engine/economy/attendance.ts`): Attendance elasticity curve (Hype, Win Streak, Star Popularity, Rivalry Surge, Ticket Fairness) driving 3D chibi crowd count, rival fan colors & stadium wave! |
| `TASK-030` | `BLOCKED` | `TASK-029` | **Pricing Sliders, Concessions, Promo Nights & Ledger** (`src/engine/economy/ledger.ts` + `EconomyScreen.tsx`): Ticket/concession sliders with Sim-City mood faces, Promo Night scheduler (*Bobblehead Night*, *Dollar Dog Day*, *Fireworks Friday*), series P&L ledger. |
| `TASK-031` | `BLOCKED` | `TASK-030` | **90s Parody Sponsors & Tier-Gated TV Contracts** (`src/engine/economy/sponsorsTv.ts`): Negotiable parody sponsors with milestone bonuses rendered live onto your 3D outfield wall billboards + tier-gated TV deals. |
| `TASK-032` | `BLOCKED` | `TASK-030` | **Interactive Ballpark District Builder Grid** (`src/engine/economy/districtBuilder.ts` + `BallparkDistrictScreen.tsx`): Sim-City neighborhood tile map (*Nacho Cantina*, *Bobblehead Megastore*, *Arcade Pavilion*, *Batting Academy*, *Pitching Lab*, *Transit Shuttle*, *Broadcast Tower*, *Club Museum*) with adjacency synergies. |
| `TASK-033` | `BLOCKED` | `TASK-031`, `TASK-032` | **Visual 3D Stadium Evolution Engine** (`src/scene/ballpark/stadiumUpgrades.ts`): Dynamically builds Grandstands, Upper Decks, Jumbotron, Night Floodlights, Mascot Cannon, District Skyline, Sponsor Billboards & Pennants in 3D! |

---

## Milestone 6 — 10X RPG Depth: Chemistry, Coaches, Relics, Weather & Shifts

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-034` | `BLOCKED` | `TASK-021` | **Clubhouse Chemistry & Synergy Bonds** (`src/engine/rpg/chemistry.ts`): 7 personality archetypes, clubhouse morale, and active Duo/Trio Synergy Combos (*Bash Brothers*, *Battery Telepathy*, *Double-Play Wizards*) with 3D combo popups. |
| `TASK-035` | `BLOCKED` | `TASK-030` | **Hireable Coaching Staff** (`src/engine/gm/coaches.ts` + `CoachesScreen.tsx`): Hire SVG-portraited Pitching, Hitting, Scouting, and Stadium Coaches with stacking perks & salaries. |
| `TASK-036` | `BLOCKED` | `TASK-019` | **90s Collectible Gear & Relics (RPG Loot)** (`src/engine/rpg/relics.ts`): 24+ quirky equippable baseball relics (*Golden Ash Bat*, *Lucky Neon Stirrups*, *Titanium Rosin Bag*, *Spring-Loaded Cleats*) with stat effects & equip UI. |
| `TASK-037` | `BLOCKED` | `TASK-033` | **Dynamic Weather, Wind & Night Games** (`src/engine/simulation/weather.ts` + 3D sky/lighting/wind flags): Sunny, Sunset, Floodlight Night Games, Outfield Wind affecting HR carry, and Rain-Delay drama. |
| `TASK-038` | `BLOCKED` | `TASK-016`, `TASK-027` | **Defensive Shifts, Bullpen Warmup Phone & Win Probability HUD** (`src/ui/components/BroadcastHud.tsx`): Infield-In / No-Doubles / Bunt Defense calls, bullpen warmup readiness, strike-zone tracker & live win probability chart. |

---

## Milestone 7 — 10X Front Office: Trades, Farm Academy, Lifecycles & Newspaper

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-039` | `BLOCKED` | `TASK-027` | **Multi-Player Trade Machine & Trade Deadline Drama** (`src/engine/gm/tradeEngine.ts` + `TradeScreen.tsx`): Fair-value AI evaluator, player + pick packages, incoming Deadline offers. |
| `TASK-040` | `BLOCKED` | `TASK-025`, `TASK-022` | **Prospect Academy (Farm Squad) & Rookie Call-Ups** (`src/engine/gm/academy.ts`): 6-slot youth academy, passive training, dramatic Rookie Debut call-up game boost. |
| `TASK-041` | `BLOCKED` | `TASK-024`, `TASK-035` | **Player Aging, Mentorship & Legend-to-Coach Retirement** (`src/engine/rpg/lifecycle.ts`): Age curves, veteran mentorship XP aura, retiring stars entering the hireable Coach pool. |
| `TASK-042` | `BLOCKED` | `TASK-021`, `TASK-028`, `TASK-039` | **"The Sandlot Gazette" 90s Newspaper** (`src/engine/events/newspaper.ts` + `GazetteScreen.tsx`): Auto-generated retro tabloid front page after every series with dynamic headlines, hot-streak alerts, rivalry recaps, and clickable cards. |

---

## Milestone 8 — 10X World Spectacles: Derby, Global Chibi Cup, Surprises & HOF

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-043` | `BLOCKED` | `TASK-016`, `TASK-024` | **All-Star Game & 3D Home Run Derby** (`src/engine/league/homeRunDerby.ts` + `DerbyScreen.tsx`): Mid-season All-Star voting + bracketed 3D Home Run Derby with rapid bomb-swing VFX & fireworks! |
| `TASK-044` | `BLOCKED` | `TASK-020`, `TASK-024` | **The Global Chibi Cup (World Tournament)** (`src/engine/league/globalCup.ts`): Every 3 seasons, all 11+ national squads battle in a knockout tournament celebrating Cultural Heritage Myth/Animal Powers, awarding permanent Global Cup Medals! |
| `TASK-045` | `BLOCKED` | `TASK-040` | **Offseason Winter Ball & Barnstorming Tours** (`src/engine/gm/winterBall.ts`): Send up to 3 prospects to DR, Japan, Mexico, or Australia Winter Leagues for extra SP & cross-cultural traits. |
| `TASK-046` | `BLOCKED` | `TASK-028`, `TASK-030`, `TASK-036` | **Narrative Surprise Events Deck (50+ Cards)** (`src/engine/events/surpriseDeck.ts` + `EventModal.tsx`): Context-driven 90s decision cards with meaningful risk/reward outcomes. |
| `TASK-047` | `BLOCKED` | `TASK-024`, `TASK-028`, `TASK-033` | **Awards, Trophy Room, Hall of Fame & 3D Retired Wall Numbers** (`src/engine/league/awards.ts` + `TrophyRoomScreen.tsx`): Season Awards voting, Trophy Case, Traveling Rivalry Cups, Club HOF, and Retired Jersey Plaques rendered visibly on your 3D Outfield Wall! |

---

## Milestone 9 — 10X Polish, Serverless Sharing & Android PWA Mastery

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-048` | `BLOCKED` | `TASK-047` | **Unlockables Gallery & Cosmetic Unlocks** (`src/engine/events/unlockables.ts`): Throwback jerseys, custom bat VFX skins, stadium themes, secret legendary skill nodes. |
| `TASK-049` | `BLOCKED` | `TASK-018`, `TASK-047` | **Exportable PNG Baseball Cards & Serverless Club Codes** (`src/art/export/cardExporter.ts`, `src/store/clubCode.ts`): Download any player's 90s card as crisp PNG + compact Base64 Club Export Code to battle friends' dynasty clubs offline! |
| `TASK-050` | `BLOCKED` | `TASK-016` | **Android Haptics, Wake Lock & In-App PWA Install Banner** (`src/ui/components/PwaInstallBanner.tsx`): Tactile `navigator.vibrate`, optional Wake Lock during live games, custom install flow. |
| `TASK-051` | `BLOCKED` | `TASK-033`, `TASK-038` | **60 FPS Mobile WebGL Profiling & Accessibility Audit**: Sprite-cache memory cap, menu RAF throttling, reduced-motion mode, colorblind-safe badges, keyboard & screen-reader pass. |
| `TASK-052` | `BLOCKED` | All above | **Final Release Gate & Full Career Playwright E2E Suite**: End-to-end Desktop & Android Pixel 7 tests + ≥90% `src/engine/` coverage + Lighthouse PWA check. |
