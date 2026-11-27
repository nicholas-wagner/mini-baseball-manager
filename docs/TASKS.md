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
- **Status**: `DONE`
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
- **Status**: `DONE`
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
- **Status**: `DONE`
- **Milestone**: M2 (`2E`)
- **Depends On**: `TASK-016`
- **Files to Create**:
  - `src/engine/simulation/rewards.ts` + `src/engine/simulation/rewards.test.ts`
  - `src/ui/components/PostGameSummaryModal.tsx`
- **Specification**:
  - Post-game full batting & pitching box score, automated **Game MVP** calculation displayed as a shining 3D-flippable Holo Foil spotlight card, Player XP bars leveling up, Manager XP gain, and gate/cash payout summary.

---

### `TASK-018` — Local IndexedDB Persistence, Multi-Slot Saves & JSON Backup
- **Status**: `DONE`
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
| `TASK-019` | `DONE` | `TASK-013`, `TASK-014` | **Branching Player Skill Trees** (`src/engine/rpg/skillTrees.ts` + pan/zoom `SkillTreeScreen.tsx`): Pitcher, Batter & Fielder node graphs (30+ nodes), prerequisite checks, SP spend/respec, capstone Special Powers (*Blazing Comet*, *Ghost Knuckle*, *Tornado Slider*, *Moonshot Bomb-Swing*, *Ninja Bunt*, *Rally Spark*, *Sky-High Leap*, *Cannon Arm*, *Ice Veins*) wired into sim & 3D VFX with per-game charge caps, batter/pitch cooldown windows, Hype drain & exertion fatigue; respects per-stat `statCaps`, `totalRatingBudget`, & evolves `specialistArchetype`! |
| `TASK-020` | `DONE` | `TASK-019` | **3-Tier Cultural Heritage Skill Branches** (`src/engine/rpg/heritageTrees.ts`): Unlockable 3-node cultural myth/animal progression per nationality (Tier 1 passive → Tier 2 clutch boost → Tier 3 Signature Myth/Animal Power consuming `65–100` Hype with custom 3D VFX and strict `1/game` [Batter/RP] or `2/game` [SP] charge & cooldown gates!). |
| `TASK-021` | `DONE` | `TASK-014`, `TASK-017` | **Dynamic Hot Streaks & Cold Slumps** (`src/engine/rpg/formTracker.ts`): Rolling form score (`-100..+100`), 🔥 *Blazing/Hot* & 🧊 *Cold/Frozen* rating curves, fiery/icy card frames & moods, slump-busting hooks! |
| `TASK-022` | `DONE` | `TASK-019`, `TASK-021`, `TASK-053`, `TASK-056` | **Animated Practice & Training Complex** (`src/engine/rpg/practiceEngine.ts` + `PracticeScreen.tsx`): Compromise-first drills — Power vs Contact Launch Cage, Pitch-Recognition Timing Lab (improves target pitch, drifts neglected pitch timing), Bullpen Pitch Lab (polishes/swaps `2–3` RP / `4–5` SP pitches with arsenal rust), Velocity vs Pinpoint Conditioning, Fielding Fungos, Sprint Track, Slump-Buster Film Room, **Position Cross-Training Drill**, and Fan Meet & Greet — cute animated 2.5D chibi dioramas with clear `"Gain vs Compromise"` badges respecting `xpGrowthMultiplier`, `statCaps` & `totalRatingBudget`! |
| `TASK-023` | `DONE` | `TASK-016`, `TASK-022` | **Human Manager RPG Tree & Active Power Dock** (`src/engine/manager/managerTree.ts` + `ManagerScreen.tsx`): Skipper Active Powers (*Pep Talk*, *Mound Whisper*, *Clutch Focus*, *Rally Cap Magic* — strictly `1 charge / game` with cooldown badges), Coach Training Passives, Mogul GM Passives + in-game Power Dock with comic splash banners & organ riffs! |
| `TASK-053` | `DONE` | `TASK-013`, `TASK-014`, `TASK-015` | **Player Specialists, Positional Eligibility, Favorite Position Boost & Cross-Training** (`src/engine/rpg/specialistsAndPositions.ts`): Roll `specialistArchetype` (hitter/glove/speed/closer/crafty specialists with variable per-stat `statCaps`), `flexibilityProfile` (`1B`-only, `SS/2B`-only, all-infield utility, all-outfield, etc. respecting `throws === 'L'` rules), `favoritePosition` boost (`+5 FLD/+4 CTL, +3 CLU`), `positionProficiency` (`<50` Out-of-Position error/fielding penalty wired into sim), and `crossTrainPosition` trade-off drill — plus specialist & eligibility pills in `RosterLineupScreen` & `FlipBaseballCard`. |
| `TASK-055` | `DONE` | `TASK-013`, `TASK-014`, `TASK-053` | **Pitcher Pitch Arsenals (`2–3` RP / `4–5` SP), Favorite/Weak Pitches & Batter Pitch-Matchup Profiles** (`src/engine/rpg/pitchArsenals.ts` + `pitchResolver.ts` + Card/GameDay UI): 8-pitch catalog (`four_seam`, `two_seam`, `cutter`, `slider`, `curveball`, `changeup`, `splitter`, `knuckleball`), role-locked arsenals (`RP` strictly `2–3` pitches; `SP` strictly `4–5` pitches), pitcher `favoritePitch` out-pitch bonus (`+6 Stuff/+4 CTL` with consecutive-spam decay) & `weakestPitch` hanger risk, batter `favoritePitch` crush bonus & `weakPitch` chase/whiff vulnerability, `PlayEvent.pitchThrown`, card badges, and live Game Day pitch-type selector! |
| `TASK-056` | `DONE` | `TASK-054`, `TASK-055` | **Compromise-First Training Engine & Limited-Use Special Ability Cooldowns/Charges** (`src/engine/rpg/trainingCompromises.ts` + `src/engine/rpg/abilityCooldowns.ts` + `baseballEngine.ts`): Enforce trade-offs on every training drill (Power vs Contact, Pitch-Recognition vs timing drift, Pitch-Lab mastery/new-pitch vs command/arsenal rust, Velocity vs Control) within `totalRatingBudget` & `statCaps` (keeping rare `all_star`s elite without creating 99-all-stat clones), plus `AbilityCooldownTracker` limiting special swings/pitches/powers (`1/game` batter & RP, `2/game` SP, multi-batter/PA cooldowns, `65–100` Hype drain & `+8` exertion fatigue) with HUD charge pips! |
| `TASK-057` | `DONE` | `TASK-013`, `TASK-014`, `TASK-021` | **Luck Attribute, Clubhouse/Mental Traits, Pressure Risers vs. Wilters & Dynamic Leverage Engine** (`src/engine/rpg/mentalAndLeverage.ts` + `pitchResolver.ts` + Live HUD): Add `ratings.luck` (`1..99`, subtle universal modifier on BABIP bloops, borderline calls, error bounces & events), `mentalTraits` (`clubhouse_glue`, `high_energy`, `ice_veins`, `pressure_riser`, `pressure_wilt`, `steady_hand`, `fiery_competitor`), `pressureProfile` (`ice_veins`/`clutch_riser` surge vs `pressure_wilt` shrink), and live **Leverage Index (`LI` `0.4..3.0+`)** × `GamePressureLevel` (`regular`, `series_rubber`, `rivalry_showdown`, `playoff_game`, `elimination_championship`) driving sim pressure swings & Critical Moment HUD! |
| `TASK-058` | `DONE` | `TASK-013`, `TASK-014`, `TASK-055` | **Specialized Pitching Staff Roles (`Starter`, `Long Reliever`, `Short Reliever`, `LOOGY`, `Setup Man`, `Closer`, `Fireman`)** (`src/engine/rpg/pitcherRoles.ts` + `baseballEngine.ts` + Bullpen UI): Assign authentic `pitcherRole` profiles coordinated with `throws` (`loogy` strictly LHP), stamina, and `2–3` RP / `4–5` SP arsenals; wire role-fit bonuses/penalties (Closer in 9th save spots, Fireman entering mid-inning high-LI jams, Setup Man in 7th–8th, LOOGY L-vs-L break, Long Reliever multi-inning durability) into sim, AI bullpen selection, and Bullpen Phone role badges! |
| `TASK-059` | `DONE` | `TASK-014`, `TASK-055` | **Balls/Strikes Command, Batted-Ball Profiles (`GB%/LD%/FB%/Pop-Up%`), Fielder `Range`/`Arm`/`FPCT` & Full Sabermetrics** (`src/engine/simulation/sabermetrics.ts` + `pitchResolver.ts` + Stats UI): Add `gapPower`, `range`, `BattedBallProfile` (`groundball`/`line_drive`/`flyball`/`balanced` + `pop_out`), explicit zone Strike%/Walk-Rate command, defender range-to-outs & arm-strength runner throws, full batted-ball/pitch/fielding stat tracking, and canonical derived stats (**Batters**: `AVG`, `OBP`, `SLG`, `OPS`, `ISO`, `BABIP`, `BB%`, `K%`, `GB%`, `LD%`, `FB%`, `PopUp%`; **Pitchers**: `ERA`, `WHIP`, `K/9`, `BB/9`, `HR/9`, `Strike%`; **Fielders**: `FPCT`, `RangeFactor`) on cards & box scores! |
| `TASK-060` | `DONE` | `TASK-017`, `TASK-054`, `TASK-057` | **Slow-Earned Career Experience (`Seasons/Games/ABs/IP`) & Veteran Savvy Advantage** (`src/engine/rpg/careerExperience.ts` + `pitchResolver.ts` + `rewards.ts`): Track real cumulative baseball mileage (`seasonsPlayed`, `careerGames`, `careerPAs`/`IP`, `careerPlayoffGames`) into a slow-burn `experienceScore` (`0..100`: `rookie_green` → `developing` → `seasoned` → `cagey_veteran`) taking multiple full seasons to master, calibrate realistic slower RPG level-XP pacing (`level * 200`), and grant seasoned veterans a small earned edge (`+2..+3` Eye/Control, `+2` high-LI composure vs rookie jitters `-1..-2`, reduced rust) over green rookies! |
| `TASK-061` | `DONE` | `TASK-055`, `TASK-058`, `TASK-059` | **Pitcher Endurance & Pitch-Specific Effectiveness Drop-Off** (`src/engine/rpg/pitcherEndurance.ts` + `pitchResolver.ts` + `GameDayScreen.tsx`): Model live pitcher `endurance` (`100` fresh → `0` gassed) driven by `ratings.stamina`, `pitcherRole`, high-LI stress pitches & regulation length; degrade pitch physics per pitch family as endurance drops (Fastball/Cutter radar-gun velocity drop `-1..-7 mph`, Sinker/Splitter drop & `GB%` flattening into belt-high hits, Slider/Curveball break & control hanger risk), add live Mound Endurance Bar + scout alerts + between-game fatigue recovery! |
| `TASK-062` | `DONE` | `TASK-016`, `TASK-057`, `TASK-061` | **Multi-Burst Game Pacing Engine (`5 / 7 / 9`-Inning Formats, Half-Inning Sim & Ghost-Runner Extras)** (`src/engine/simulation/baseballEngine.ts` + `GameDayScreen.tsx`): Keep games snappy and rewarding in 2–5 min short bursts as well as 60-min sessions via selectable **`5` (Blitz) / `7` (Quick) / `9` (Classic)** regulation innings (scaling starter endurance proportionally), 1-tap **`Sim Half-Inning`**, smarter **`Clutch-Moments Auto-Burst`** (pauses on `LI >= 1.55`, tired pitcher warning, or Special Ready), automatic **2B Ghost Runner starting immediately in the 1st extra inning**, and seamless mid-game state pacing! |
| `TASK-063` | `DONE` | `TASK-006`, `TASK-059` | **Role-Specific Baseball Card Stats (Pitchers vs. Batters/Fielders)** (`src/engine/models/playerCardStats.ts` + `src/ui/utils/playerCardAdapter.ts` + `src/ui/components/FlipBaseballCard.tsx`): Split collectible card back stat profiles by role — **Pitchers (`SP`/`RP`)** display `Velocity`, `Movement`, `Control`, `Stamina`, `Clutch` + `ERA / WHIP / K/9 / Strike%`, while **Batters/Fielders** display `Contact`, `Power`, `Speed`, `Fielding`, `Arm` + `AVG / OBP / OPS / FPCT`! |
| `TASK-066` | `DONE` | `TASK-013`, `TASK-014`, `TASK-057` | **Asymmetric Co-Ed Athlete Attributes, Complementary Special Traits, Popularity Fan-Draw & Roster-Mix Synergies** (`src/engine/rpg/coEdArchetypes.ts` + `rosterFactory.ts` + `pitchResolver.ts` + `rewards.ts` + Clubhouse UI): Apply equal-OVR classic male vs. female attribute tilts (Male: `+Power/+Velocity/+Arm`, `-Eye/-Contact/-Control/-Fielding`; Female: `+Contact/+Eye/+Movement/+Control/+Speed/+Fielding` + modest `+6` starting Popularity drawing `+1–6%` extra ballpark fans, `-Power/-Velocity/-Arm`), assign complementary sex-specific special traits (*Thunder Bravado*, *Cleanup Enforcer*, *Iron Shoulder* vs. *Tactical Poise*, *Precision Spark*, *Crafty Spin Wizard*), and evaluate live clubhouse roster-mix synergies (*Total Baseball Harmony*, *Calm in the Storm*, *Thunder Anchor*, *Bash-Bro Chaos* all-male, *Precision Swarm* all-female)! |

---

## Milestone 4 — Living 6-Tier League World & Team Rivalries

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-024` | `DONE` | `TASK-014`, `TASK-018` | **6-Tier Pyramid & 21-Game Season Engine** (`src/engine/league/seasonEngine.ts` + `LeagueScreen.tsx`): 48 unique themed clubs across Rookie → Majors, balanced 7-series (21-game) scheduler, standings, tiebreakers, leaders, 4-team Best-of-3 playoffs, promotion/relegation transitions. |
| `TASK-054` | `DONE` | `TASK-053`, `TASK-018` | **Active Roster Limit (`20` Max) & 6 Player Market Tiers** (`src/engine/gm/marketTiers.ts`): Implement `PlayerMarketTier` curves (`rookie` cheap with `1.35x` XP & wide-variance `statCaps`; `all_star` rare & expensive; `veteran` affordable steady quality with `0.30x` minimal growth; plus `above_average`, `average`, and `below_average` bargain specialists) and enforce `MAX_ACTIVE_ROSTER_SIZE = 20` / `MIN_ACTIVE_ROSTER_SIZE = 15` across signings, draft call-ups & cuts with `"Roster: X / 20"` Clubhouse badges. |
| `TASK-025` | `DONE` | `TASK-024`, `TASK-054` | **Fog-of-War Scouting & 3-Round Amateur Draft** (`src/engine/gm/draftEngine.ts` + `DraftScreen.tsx`): Scouting budget reveals hidden rookie `statCaps` (`C..A` → exact ceiling), `flexibilityProfile`, `specialistArchetype`, pitcher `pitchArsenal` (`2–3` RP / `4–5` SP), & batter `favoritePitch`/`weakPitch`; interactive Draft Room respecting 20-man active roster cap / 6-slot Farm Academy. |
| `TASK-026` | `DONE` | `TASK-024`, `TASK-054` | **Free Agency, Contracts, Payroll & Waivers** (`src/engine/gm/freeAgency.ts` + `MarketScreen.tsx`): Contract negotiation balancing expensive `all_star`s, value `veteran`s, and niche `below_average` specialists up to `MAX_ACTIVE_ROSTER_SIZE = 20`, bidding wars, cut/release morale & dead-cap logic. |
| `TASK-027` | `DONE` | `TASK-024`, `TASK-025`, `TASK-026` | **Personality-Driven AI GMs & Bullpen AI** (`src/engine/ai/aiGm.ts` + 10-season soak test): 5 AI philosophies evaluating `marketTier`, `specialistArchetype`, `favoritePosition`, `statCaps`, `pitchArsenal` vs batter `favoritePitch`/`weakPitch`, `pitcherRole` (`LOOGY`, `Fireman`, `Setup`, `Closer`, `Long/Short`), `pressureProfile` vs Leverage Index, `20`-man roster limits, and high-leverage saving of limited-charge Special Abilities while drafting, signing, training, optimizing platoon lineups, and calling bullpen matchups. |
| `TASK-028` | `DONE` | `TASK-024`, `TASK-026` | **Dynamic Team Rivalries Engine & Showdowns** (`src/engine/league/rivalryEngine.ts`): Persistent Rivalry Heat (`0–100`), Crosstown starter rival, walk-off/playoff/poached-star revenge triggers, pre-game 90s Comic "VS" splash card, +25–50% Hype charge, +25% XP, Traveling Rivalry Cups. |
| `TASK-064` | `DONE` | `TASK-013`, `TASK-015`, `TASK-054` | **Fair Rookie-Ball Starting Roster Presets** (`src/engine/gm/rosterPresets.ts` + `ClubCreatorScreen.tsx`): Let new careers pick `All Rookies`, `Balanced`, `Veterans`, `Good Defense`, `Good Hitting`, or `Good Pitching` — each shaping team identity, age/market-tier mix, and tool trade-offs while staying strictly inside Rookie Sandlot parity (`±1.5` avg team OVR vs AI rivals) on the road to Mini Major League World Champions! |
| `TASK-065` | `DONE` | `TASK-024`, `TASK-054`, `TASK-060` | **Full End-of-Season & Offseason Engine (Retirements, Expiring Contracts, Tier Salary Caps, Amateur Draft & FA Window)** (`src/engine/gm/offseasonEngine.ts` + `OffseasonScreen.tsx`): Enforce tier-scaled payroll **Salary Caps** (`rookie` `$15k` → `majors` `$240k`) alongside `MAX_ACTIVE_ROSTER_SIZE = 20`, process age-based **Player Retirements**, decrement & resolve **Expiring Contracts** (Re-Sign vs let walk to FA), run the annual **3-Round Amateur Draft** & **Free-Agent Signing Window** across all 48 clubs, and crown **Mini Major League World Champions**! |

---

## Milestone 5 — Sim-City Ballpark District & Economy

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-029` | `DONE` | `TASK-024`, `TASK-028` | **Fanbase, Hype & Dynamic Attendance Engine** (`src/engine/economy/attendance.ts`): Attendance elasticity curve (Hype, Win Streak, Star Popularity, Rivalry Surge, Ticket Fairness) driving 3D chibi crowd count, rival fan colors & stadium wave! |
| `TASK-030` | `DONE` | `TASK-029` | **Pricing Sliders, Concessions, Promo Nights & Ledger** (`src/engine/economy/ledger.ts` + `EconomyScreen.tsx`): Ticket/concession sliders with Sim-City mood faces, Promo Night scheduler (*Bobblehead Night*, *Dollar Dog Day*, *Fireworks Friday*), series P&L ledger. |
| `TASK-031` | `DONE` | `TASK-030` | **90s Parody Sponsors & Tier-Gated TV Contracts** (`src/engine/economy/sponsorsTv.ts`): Negotiable parody sponsors with milestone bonuses rendered live onto your 3D outfield wall billboards + tier-gated TV deals. |
| `TASK-032` | `DONE` | `TASK-030` | **Interactive Ballpark District Builder Grid** (`src/engine/economy/districtBuilder.ts` + `BallparkDistrictScreen.tsx`): Sim-City neighborhood tile map (*Nacho Cantina*, *Bobblehead Megastore*, *Arcade Pavilion*, *Batting Academy*, *Pitching Lab*, *Transit Shuttle*, *Broadcast Tower*, *Club Museum*) with adjacency synergies. |
| `TASK-033` | `DONE` | `TASK-031`, `TASK-032`, `TASK-069` | **Visual 3D Stadium Evolution Engine — Sandlot to Pro Major League Progression** (`src/scene/ballpark/stadiumUpgrades.ts` + `ballparkBuilder.ts` + tier capacity scaling): Scale **fan capacity** (`500–1.5k` Rookie Sandlot → `2.2k–3.8k` Low-A → `4.5k–7k` High-A → `8k–12.5k` AA → `14k–20k` AAA → `28k–45k` Pro Mini Major League) and **full 3D stadium architecture/look-and-feel** across every league tier & purchased upgrade — visibly evolving from an intimate neighborhood sandlot (chain-link fence, wooden benches, backyard pines, manual wood scoreboard) through minor-league brick/concrete bowls & floodlight towers up to towering Pro Major League cathedrals & domes (multi-deck wraparound grandstands, club suites, giant Jumbotron, Mascot Cannon, District Skyline silhouettes, 90s Parody Sponsor Billboards, Retired Jersey Wall Plaques, Championship Pennants & dense roaring crowds)! |
| `TASK-069` | `DONE` | `TASK-014`, `TASK-024` | **Multiple Distinct Stadiums, Park Factors & Home Venue Relocation** (`src/engine/ballparks/stadiumCatalog.ts` + `src/scene/ballpark/stadiumPresets.ts` + Stadium Picker UI): `10` distinct retro 90s stadiums (*Sandlot Commons*, *Brickyard Classic*, *Bayfront Cove*, *High-Altitude Mesa*, *Neon Metro Dome*, *Cornfield Twilight*, *Harbor Shipyard*, *Sakura Garden*, *Sunbelt Cactus*, *Grand Cathedral*) assigned across all 48 clubs & unlockable/commissionable for your franchise — plugging real fence dimensions, wall heights, grass/turf surface & L/R HR/XBH/GB **Park Factors** into simulation + rendering distinct 3D venues for home & away games! |

---

## Milestone 6 — 10X RPG Depth: Chemistry, Coaches & Equipment Manager, Medical Staff, Relics, Weather & Shifts

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-034` | `DONE` | `TASK-021` | **Clubhouse Chemistry & Synergy Bonds** (`src/engine/rpg/chemistry.ts`): 7 personality archetypes + `mentalTraits` (`clubhouse_glue`, `high_energy`, `ice_veins`, `fiery_competitor`), clubhouse morale, and active Duo/Trio Synergy Combos (*Bash Brothers*, *Battery Telepathy*, *Double-Play Wizards*) with 3D combo popups. |
| `TASK-035` | `DONE` | `TASK-024`, `TASK-065` | **Hireable & Developable Coaching Staff & Equipment Manager** (`src/engine/gm/coaches.ts` + `StaffScreen.tsx`): Full dugout & clubhouse staff covering **Pitching Coach**, **Hitting Coach**, **Bench Coach**, **Fielding Coach**, **Bullpen Coach** *(helps catchers & pitchers)*, and **Equipment Manager** *(gear/relic tuning, blisters, morale & vintage finds)* with retro 90s portraits, tier-scaled active staff slot limits (`rookie: 2` → `majors: 7`), salary budgets, philosophy trade-offs, Season XP growth (`Lv 1–5`), Offseason Coaching Clinics, and Legend-to-Coach hiring! |
| `TASK-036` | `DONE` | `TASK-019` | **90s Collectible Gear & Relics (RPG Loot)** (`src/engine/rpg/relics.ts`): 24+ quirky equippable baseball relics (*Golden Ash Bat*, *Lucky Neon Stirrups*, *Titanium Rosin Bag*, *Spring-Loaded Cleats*) with stat effects & equip UI. |
| `TASK-037` | `DONE` | `TASK-033` | **Dynamic Weather, Wind & Night Games** (`src/engine/simulation/weather.ts` + 3D sky/lighting/wind flags): Sunny, Sunset, Floodlight Night Games, Outfield Wind affecting HR carry, and Rain-Delay drama. |
| `TASK-038` | `DONE` | `TASK-016`, `TASK-027` | **Defensive Shifts, Bullpen Warmup Phone & Win Probability HUD** (`src/ui/components/BroadcastHud.tsx`): Infield-In / No-Doubles / Bunt Defense calls, bullpen warmup readiness, active pitcher's `2–3` / `4–5` pitch buttons, batter `Crush / Weak` scouting pill, Special Ability charge/cooldown pips, strike-zone tracker & live win probability chart. |
| `TASK-067` | `DONE` | `TASK-015`, `TASK-024`, `TASK-066` | **Toggleable Athletic Injuries & Illnesses Engine (4 Rarity Tiers & Play-Through vs. Mandatory IL)** (`src/engine/health/conditionsCatalog.ts` + `src/engine/health/healthEngine.ts` + Club Creator Toggles + Roster IL UI): Independent New-Game `enableInjuries` / `enableIllnesses` toggles; low fun-first base frequency; large extensible data-driven catalog (`common`, `uncommon`, `rare`, `ultra_rare` — zero fatalities, zero STDs, `applicableTo: 'all' \| 'male' \| 'female'` sex-specific conditions supported); minor playable conditions with targeted stat dips (e.g. leg cramp, mild cold, yeast infection) vs. mandatory IL / multi-game / season-ending / rare aged-veteran career-ending conditions (e.g. broken arm, UCL/ACL tear, pneumonia, early-stage cancer comeback). |
| `TASK-068` | `DONE` | `TASK-067` | **Specialty Team Doctors & Head Athletic Trainers** (`src/engine/health/medicalStaff.ts` + Medical Staff Hiring UI): Hire & upgrade tiered Team Doctors (quality `1–5` with specialties: *Orthopedic Arm*, *Orthopedic Legs*, *Concussion/Neuro*, *Internal Medicine*, *Women's Sports Medicine*, *Oncology/Complex Care*) and Head Athletic Trainers (*Arm Care*, *Soft-Tissue Mobility*, *Strength/Durability*, *Recovery/Nutrition*, *Rehab Conditioning*) using club budget to prevent injuries/illnesses, speed healing, reduce play-through penalties, and slow late-career aging decline! |
| `TASK-070` | `DONE` | `TASK-014`, `TASK-035`, `TASK-038` | **Complete Speed-Driven Base Stealing, Catcher Throw-Outs & AI Baserunning Engine** (`src/engine/simulation/baserunning.ts` + `pitchResolver.ts` + `baseballEngine.ts` + GameDay Steal HUD): Expand base stealing to **Steal 2B**, **Steal 3B**, **Double Steals (1B+2B)**, rare **Steal of Home**, and defensive **Pitchout / Hold Runner** counter-calls; scale steal jump & success probability strongly by runner **`ratings.speed`** (plus `speed_smallball` bonus, form, fatigue/leg-injury dips & cleats relics) vs. catcher **`arm`/`fielding`**, Bullpen Coach `catcherPopTimeBonus`, LHP `pickoffHoldBonus`, pitch speed & target-base difficulty; track **`stolenBases` (`SB`) & `caughtStealing` (`CS` / `SB%`)** in box scores, season stats & leaderboards; add speed-aware **AI steal decisions** during simmed games (especially `speed_demons` clubs); show live **Steal Target & Odds %** buttons right on Game Day! |

---

## Milestone 7 — 10X Front Office: Trades, Farm Academy, Lifecycles & Newspaper

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-039` | `DONE` | `TASK-027` | **Multi-Player Trade Machine & Trade Deadline Drama** (`src/engine/gm/tradeEngine.ts` + `TradeScreen.tsx`): Fair-value AI evaluator weighing `marketTier`, `specialistArchetype`, `favoritePosition`, `statCaps`, age & `20`-man roster fit; multi-player + pick packages & incoming Deadline offers. |
| `TASK-040` | `DONE` | `TASK-025`, `TASK-022` | **Prospect Academy (Farm Squad) & Rookie Call-Ups** (`src/engine/gm/academy.ts`): 6-slot youth academy, passive training, dramatic Rookie Debut call-up game boost. |
| `TASK-041` | `DONE` | `TASK-024`, `TASK-060`, `TASK-065` | **Full Player Career Arcs, Aging Curves, Mentorship & Legend-to-Coach Retirement** (`src/engine/rpg/lifecycle.ts`): Multi-season progression curves where rookies (`18–24`) improve stats toward `statCaps`, peak in Prime (`25–30`), hold steady with veteran savvy (`31–34`), and gradually see physical stats (`Speed`, `Velocity`, `Range`, `Stamina`, `Power`) diminish at `35+` until Retirement — plus veteran mentorship XP aura and retiring legends entering the hireable Coach pool. |
| `TASK-042` | `DONE` | `TASK-021`, `TASK-028`, `TASK-039` | **"The Sandlot Gazette" 90s Newspaper** (`src/engine/events/newspaper.ts` + `GazetteScreen.tsx`): Auto-generated retro tabloid front page after every series with dynamic headlines, hot-streak alerts, rivalry recaps, and clickable cards. |

---

## Milestone 8 — 10X World Spectacles: Derby, Global Chibi Cup, Surprises & HOF

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-043` | `DONE` | `TASK-016`, `TASK-024` | **All-Star Game & 3D Home Run Derby** (`src/engine/league/homeRunDerby.ts` + `DerbyScreen.tsx`): Mid-season All-Star voting + bracketed 3D Home Run Derby with rapid bomb-swing VFX & fireworks! |
| `TASK-044` | `DONE` | `TASK-020`, `TASK-024` | **The Global Chibi Cup (World Tournament)** (`src/engine/league/globalCup.ts`): Every 3 seasons, all 11+ national squads battle in a knockout tournament celebrating Cultural Heritage Myth/Animal Powers, awarding permanent Global Cup Medals! |
| `TASK-045` | `DONE` | `TASK-040` | **Offseason Winter Ball & Barnstorming Tours** (`src/engine/gm/winterBall.ts`): Send up to 3 prospects to DR, Japan, Mexico, or Australia Winter Leagues for extra SP & cross-cultural traits. |
| `TASK-046` | `DONE` | `TASK-028`, `TASK-030`, `TASK-036` | **Narrative Surprise Events Deck (50+ Cards)** (`src/engine/events/surpriseDeck.ts` + `EventModal.tsx`): Context-driven 90s decision cards with meaningful risk/reward outcomes. |
| `TASK-047` | `DONE` | `TASK-024`, `TASK-028`, `TASK-033` | **Awards, Trophy Room, Hall of Fame & 3D Retired Wall Numbers** (`src/engine/league/awards.ts` + `TrophyRoomScreen.tsx`): Season Awards voting, Trophy Case, Traveling Rivalry Cups, Club HOF, and Retired Jersey Plaques rendered visibly on your 3D Outfield Wall! |

---

## Milestone 9 — 10X Polish, Serverless Sharing & Android PWA Mastery

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-048` | `DONE` | `TASK-047` | **Unlockables Gallery & Cosmetic Unlocks** (`src/engine/events/unlockables.ts`): Throwback jerseys, custom bat VFX skins, stadium themes, secret legendary skill nodes. |
| `TASK-049` | `DONE` | `TASK-018`, `TASK-047` | **Exportable PNG Baseball Cards & Serverless Club Codes** (`src/art/export/cardExporter.ts`, `src/store/clubCode.ts`): Download any player's 90s card as crisp PNG + compact Base64 Club Export Code to battle friends' dynasty clubs offline! |
| `TASK-050` | `DONE` | `TASK-016` | **Android Haptics, Wake Lock & In-App PWA Install Banner** (`src/ui/components/PwaInstallBanner.tsx`): Tactile `navigator.vibrate`, optional Wake Lock during live games, custom install flow. |
| `TASK-051` | `DONE` | `TASK-033`, `TASK-038` | **60 FPS Mobile WebGL Profiling & Accessibility Audit**: Sprite-cache memory cap, menu RAF throttling, reduced-motion mode, colorblind-safe badges, keyboard & screen-reader pass. |
| `TASK-052` | `DONE` | All above | **Final Release Gate & Full Career Playwright E2E Suite**: End-to-end Desktop & Android Pixel 7 tests + ≥90% `src/engine/` coverage + Lighthouse PWA check. |

---

## Milestone 10 — Living Story, Playable Backstories, Upbeat Guide & 4-Slot Auto-Save

| Task ID | Status | Depends On | Slice & Key Deliverables |
| :--- | :--- | :--- | :--- |
| `TASK-071` | `DONE` | `TASK-018` | **Seamless Auto-Save, 4 Career Save Slots & Safe Delete/Restart Flow** (`src/store/careerSlots.ts` + `CareerSlotsModal.tsx`): Expand career saves to **`slot-1`..`slot-4`** (`4` independent dynasties), persist `activeSlotId`, club crest, stadium class, epithet & `backstoryId` in slot metadata, auto-save transparently after every game, roster move, draft/FA/trade action, upgrade, or story decision, auto-resume last active career on reload, and add a safe 2-step **Delete Saved Game** confirmation to clear any slot and start over! |
| `TASK-072` | `DONE` | `TASK-005`, `TASK-016` | **Upbeat Illustrated "Skipper's Dugout Handbook" & Interactive Onboarding** (`src/engine/story/dugoutGuide.ts` + `DugoutGuideModal.tsx`): Fun, breezy 6-chapter 90s comic guide hosted by neighborhood legend **Coach Pops** with *"Pops' Pro Tips!"*, a live **Road to the Majors** checklist & 1-tap tab jumps — accessible anytime from the header (**Coach Pops' Guide**)! |
| `TASK-073` | `DONE` | `TASK-015`, `TASK-046`, `TASK-071` | **Playable Manager Backstories & Choose-Your-Own-Adventure Career Story Engine** (`src/engine/story/backstories.ts` + `src/engine/story/storyEngine.ts` + `StoryChapterModal.tsx`): **10X Edition** — `8` replayable 90s Manager Backstories (*Hometown Sandlot Hero*, *Washed-Up 90s Ex-Pro*, *1994 Spreadsheet Prodigy*, *Showbiz Bleacher Promoter*, *Wandering World-Ball Scout*, *Surprise Family Inheritor*, *Strike-Zone Whisperer Ex-Ump*, *90s Kids-Movie Miracle Coach*) with balanced starting AND ongoing perks/trade-offs, **24 multi-stage CYOA chapters**, 4 live Alignment axes driving dynamic Manager Titles, 4 recurring characters with bond meters, persistent `storyFlags`, Dynasty Epilogues & a chronological *Sandlot Gazette* Scrapbook! |

## Game Day follow-up

| Task ID | Status | Scope |
| --- | --- | --- |
| TASK-074 | DONE | Card-led Opening Day, timed field calls, signature motions, a roster print gallery and an illustrated rematch recap. [Screenshots and pitch preview](../README.md#your-first-game) |
| TASK-075 | DONE | Guided first at-bat, legible catches and force plays, signature player reactions and collectible game moments. |
| TASK-076 | DONE | Opening rally handoffs and replays, field gestures, force-play and baserunning close-ups, and the Play Opening Day entrance. |
| TASK-077 | DONE | Featured-player entrance, swing and target teaching, compact guided score, teammate reactions, scored replay detail and the between-innings foil pack. |
| TASK-078 | DONE | Start with the featured player, hold the selected batting stance, give the sandlot and players signature reactions, and show who decided the play. |
| TASK-079 | DONE | Make bullpen changes readable on the field and return to the next pitch after the handoff. |
| TASK-080 | DONE | First-Time Magic 3-Audience Hook: collapsed Change Club customization + Manager Story Origin picker + co-ed 3-card fan + mascot cheer; quiet Guided Mode with 2-second matchup scouting lines, 5-word pitching & batting trade-offs, tappable Signature Power & optional Arcade Sweet-Spot Timing bar; harmonized LiveActionBar, 1-card Between-Game Spotlight, visual SVG Foil Pack cards, top-of-card personalization, Clubhouse nav rename, promoted Art Gallery & Uniform Studio, role-accurate nicknames & moonshot distance pop-ups. |
| TASK-081 | DONE | Manager Baseball Depth & Tiered Audio: full Bunt simulation (`buntResolver.ts` — 2% whiff / 20% foul + 2-strike K / 5% pop-up caught ~95% by Catcher/Pitcher with `bat_bunt` + sky-high pop-up replay / 73% in-play; speed-gated bunt singles heavily reduced by `infield_in`/`bunt_defense`, achievable sacrifice advances, and runner-speed-driven squeeze plays home with cut-down fielder's choices), sacrifice fly & shallow-OF pop-up tag-up engine (`sacFlyResolver.ts` — fly depth, runner speed, outfielder arm, holds, 2B→3B tags, and outfield-assist double plays), complete PC/AI Manager Independence (`aiManager.ts` — isolated human vs. AI batting/pitching/shift controls), visible Pitcher Endurance meters on MatchupPrints & LiveActionBar with stronger stamina scaling and control/stuff fatigue drops, 1-tap Catcher's Pitch Sign strip + live pitch-thrown radar readouts, and 12-track League-Tier-Gated Stadium Music (2 options per tier across Rookie → Mini Major League). |
| TASK-082 | DONE | Animate the recorded runner advances on sacrifice bunts and show the out at first and the destination bag in the same replay. |
| TASK-083 | DONE | Keep the first mobile rally, field and thumb controls together in portrait and landscape. Preserve the game across career tabs, reveal matchup depth on demand, and connect the selected target and player reactions to the actual replay. |
| TASK-084 | DONE | Mobile One-Screen Live Cockpit & 3-Audience Polish: compact single-row mobile R/H/E scoreboard, mobile flex-ordered LiveActionBar placing `Throw Pitch`/`Next Pitch`, 4-col Call Bar, horizontal-scroll Pitch Sign strip, Hype Power button, 1-tap `Shift` drawer, CPU shift badge, and Last-Pitch Readout all above the fold on `390×844` and `360×740` phones (`overflowX: 0`); added `🔥 Heat` & `🏏 Bunt` to Guided Mode and collapsed duplicate expanded heading; tappable Opening Cover mascot buddy + tactile `🎨 Customize` pill; tightened mobile MatchupPrints scout line; renamed Roster header to `Roster`, collapsed `coed-synergy-banner` into `<details>`, 3-col Roster tabs, full-name 2-line mobile batting order rows with direct tap-to-card, and removed doubled emoji icons on Clubhouse HQ tabs. |
| TASK-085 | DONE | Mobile Round 11 Usability Overhaul: anchored LiveActionBar drawers (`Sim ▾`, `Pen`, `Shift ▾`) & `ArcadeTimingMeter` directly inside `live-control-grid` (eliminating off-screen drawer popovers and duplicate `Throw Pitch` button when timing is active, plus 2-col Fast Sim grid); compacted Game Day Lobby `Meet Your 3 Stars` into a 3-col mobile strip, fixed `.opening-print` diagonal seam, and added `scroll-mt-20` auto-scroll on `Show Options`; removed doubled icons on `PlayerCardModal` and placed `Flip Stats` inline on `FlipBaseballCard`; added `← Back`, 5-col single-row mascot picker, and side-by-side actions on `ClubCreatorScreen`; converted `LeagueScreen` tiers to a 1-row scrollable strip, hid disabled Day-1 Playoffs button, and compacted standings columns so all 8 clubs + `Zone` badges fit above the fold; widened `uniformPreview.ts` camera frustum so the live chibi batter's bat is never cropped + 2-col `UniformDesignerPanel` presets; added `ready →` hint, compact player summary, and 3-col heritage tier cards on `SkillTreeScreen`. |
| TASK-086 | DONE | Show the opening runner, bunt stance and player reaction, compact the live controls, lead recaps with a club moment, and bring club and roster actions into the first phone viewport. |
| TASK-087 | DONE | Mobile Round 12 First-Time Hook & On-Screen Ergonomics: promoted Opening Day Signature Power (`guided-unleash-power-btn`) into a crisp header pill in `FirstAtBat` (0px height added, preserving thumb Y lock) and pill-styled Options popover; restored single-row horizontal-scroll Catcher Pitch Signs (`48px` buttons) across portrait & landscape (`360×640`, `390×844`, `844×390`); added 1-tap `Box` score inside `LiveActionBar` Tactics drawer & compacted mobile pitcher fatigue strip; fixed `ArcadeTimingMeter` pitching prompt copy; pulled back `mound_portrait` camera so chibi caps never crop on compact/landscape phones; fixed `ComicCard` mobile header flex wrapping (`min-w-[145px] flex-1`); moved Between-Games `Start Live 3D Game` & `Smart 3D / Clutch / Sim Game` above the fold ahead of a compact 3-col face-off portrait strip, fixed matchup banner overlap, and removed doubled emojis; added `44×44` Close button to `PostGameSummaryModal`; compacted `StoryChapterModal` into 1-row 3-col tabs & fixed `-$200` cash formatting; upgraded touch targets across `ClubCreatorScreen`, `PlayerCardModal` (horizontal teammate strip), `RosterLineupScreen` (readable stacked Bench/Bullpen rows), `LeagueScreen` (non-truncating `YOU` badge + balanced `Zone` margins), `SkillTreeScreen` (Tier 1 nodes visible above fold), and cohesive `Save / Load (JSON Backup)` mobile menu entry. |
| TASK-088 | DONE | Opening Day Instant-Magic Trio: (1) 1-tap **Bat First / Pitch First** role switcher (`opening-side-toggle`) right on the Opening Cover powered by symmetric `preferHumanBattingFirst` / `preferHumanPitchingFirst` engine hooks in `gameDayMoments.ts`; (2) 1-tap **30s HR Derby** teaser pill (`opening-derby-btn`) right on the Opening Cover launching `ArcadeDerbyModal` immediately and carrying any cover Derby wins, Foil Packs & stickers seamlessly into the started dynasty — keeping all controls 100% above the fold on `360×640`, `390×844`, and `844×390`; and (3) **Collectible Celebration Sticker Pop-Ups** (`src/engine/gm/celebrationStickers.ts` + floating zero-shift `CelebrationStickerToast.tsx` + persisted `Club.earnedStickerIds` + 6-stamp Live Diamond Stickers shelf in `TrophyCaseModal`) awarding charming mascot sticker celebrations on first strikeout, home run, base hit, stolen base, signature power, or bunt magic with a 1-tap `Album →` jump. |
| TASK-088 | DONE | Keep the Opening Day Customize button at least 44 pixels tall on compact phones. |
| TASK-090 | DONE | Third-base decisions and plate coverage, venue scouting, catcher sequences, Smart Watch preferences, player habits, Gazette commentary, spray charts and an out-of-town scoreboard. |
| TASK-091 | DONE | 3-Mode Pitching Controls (`Simple` default with visible Catcher's Call + Shake Off and fastball-only High Heat catcher selection, `Normal` with 3-location Over Plate / Corner / Low Chase menu & location-aware auto pitch selection, `Advanced` with 3 locations + pitcher arsenal selector), rebalanced location simulation math (Over Plate = more strikes & hits; Corner = more taken strikes/looking Ks + walk risk; Low Chase = most balls + highest whiffs), persisted `pitchingMode` preference decoupled from Pro dugout controls, and Opening Day Simple pitching default. |
| TASK-092 | DONE | Discover player hobbies through roster conversations, collect illustrated prints and personal notes in the career album, and award a small morale boost. |
| TASK-093 | DONE | 3-Mode Bullpen Manager (`Auto` / `Ask Me` Semi-Auto default / `Manual`), regulation-aware role evaluation (5/7/9 innings), Coach Pops 1-tap Bullpen Call Card with anti-nag snooze, Coach's Pick candidate ranking & tags, and persisted `bullpenMode` across live drawers, Guided Options, Pro Bullpen Phone & Settings. |
| TASK-094 | DONE | 3-Audience First-Time Hook & Quality-of-Life Overhaul: (10yo) discoverable `🎯 Timing` pill in Guided `FirstAtBat` + collapsible Smart Watch rules; (14yo) immediately visible illustrated `Off the Clock` teammate card in post-game recap (with Sandlot Postcard portrait/initials fallback) + live tappable Dugout Mascot Buddy + 1-tap `⭐ Star Favorite` & `🎨 Design Jerseys` between-game spotlights; (18–99 fan) `Due Up: R · L · L` + reliever Pitch Mix in Quick Bullpen Drawer & Pro Bullpen Phone + optional Pro `HOT` warmup `+2 CTL` bonus + 3-Mode Front Office Assistant GM (`Auto` / `Ask Me` / `Manual`) across Settings, Clubhouse HQ, Roster & Pre-Game. |
| TASK-095 | DONE | Present hobbies awaiting artwork as signed player postcards across cards, recaps and the career album. |
| TASK-096 | DONE | Off the Clock postcard batch 1. Illustrate the four remaining featured stories and author and illustrate 21 more player memories. Review the WebP prints in the album. |
| TASK-097 | IN_PROGRESS | Complete the Off the Clock collection for all 3,000 catalog players. 2,975 of 3,000 player postcards reviewed and committed. |
| TASK-098 | DONE | Living 3D Ballpark Atmosphere, Pitch Clarity & Impact Juice: synced `ballpark.update(elapsedSec, crowdExcitement)` and dt-based cloud drift, wired live weather (`parkWeather.ts` — Sunny / Golden Sunset / Night / Drizzle + wind-animated pennants) into `LiveGameCanvas`, replaced catcher target vertical stretch with `setCatchHeight` posture + faint reception ring, added batter swing follow-through, HR/K celebrations, 60ms impact hitstop (`impactTiming.ts`), 3D stadium HR fireworks (`stadiumCelebration.ts`), minimum screen-space contact callout legibility, behind-the-catcher default batting view (`over_shoulder_batter` across preview, idle, pitch delivery, and contact), and deduplicated signature power callouts. |
| TASK-099 | DONE | Unified Zero-Scroll Mobile Cockpit & Desktop Broadcast Studio: unified Guided and Full Live games into a `100dvh` mobile cockpit with bottom thumb dock, contextual action chips, tappable mascot, and one unified `LiveBottomSheet` Tactics drawer (auto-closing on game completion); added a 2-column `1280×800` Desktop Broadcast Studio with accessible keyboard shortcuts (`Space`, `1/2/3`, `B`, `S`, `H`, `T`, `Esc`), `844×390` landscape 2-column layout, and pitch/swing animation lock preventing double-fires until each pitch or play completes. |
| TASK-100 | DONE | First-60s 3-Audience Hook & Collectibles UI: 3-tab above-the-fold `PostGameSummaryModal` (`Highlights`, `Clubhouse`, `Box Score`), pull-first 3D corner-peel shimmer `FoilPackModal` with `relicPrint.ts` WebP artwork lookup, deterministic `375–465 FT` `ArcadeDerbyModal` with Hot Streak multiplier, standalone TV `StrikeZoneOverlay` K-Zone plot, and human-team-aware `DugoutCheerBubble` teammate cheers. |
| TASK-101 | DONE | 14 Collectible WebP Prints & 4-Viewport Visual Audit: generated and visually reviewed 6 die-cut Celebration Stickers (`src/art/stickers/prints/*.webp`) and 8 holographic 1994 Foil Pack Relics (`src/art/relics/prints/*.webp`) wired into `CelebrationStickerToast`, `TrophyCaseModal`, and `FoilPackModal`, plus a 4-viewport Playwright visual audit (`tests/e2e/councilVisualAudit.spec.ts` covering `360×640`, `390×844`, `844×390`, and `1280×800`). |
| TASK-102 | DONE | Off-Diamond Mobile & Desktop Ergonomics: streamlined thumb reach, responsive grids, and zero-overflow polish across `RosterLineupScreen`, `UniformDesignerPanel`, `ClubHubScreen`, `LeagueScreen`, and `ClubCreatorScreen` with regression tests (`OffDiamondErgonomics.test.tsx`, `firstAtBat.layout.test.ts`). |
