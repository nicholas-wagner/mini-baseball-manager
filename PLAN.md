# Mini Baseball Manager — 10X Master Plan & Progress Tracker

> **Living Master Blueprint**: This file defines our **10X ambitious vision** for Mini Baseball Manager and tracks milestone-level progress.
> **AI Agents**: Read [AGENTS.md](./AGENTS.md) first, check canonical schemas in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and pull the next `READY` atomic ticket from [docs/TASKS.md](./docs/TASKS.md).

## Status Legend

- `[ ]` **Planned** — Not started
- `[/]` **In Progress / Review** — Actively being built or awaiting visual checkpoint
- `[x]` **Done** — Implemented, TDD tests passing, build green, and visually verified
- `[~]` **Adjusted / Deferred** — Rescoped or moved (see Decision Log)

---

## 10X Progress Dashboard

| Milestone | Focus | Slices | Status | Gate / Deliverable |
| :--- | :--- | :---: | :--- | :--- |
| **M0** | Project Foundation, TDD Harness & Android PWA Shell | 4 / 4 | `[x]` Done | Vitest + Playwright + TS + PWA manifest green |
| **M1** | **Design-First Visual Identity & Interactive Design Lab** | 8 / 8 | `[x]` Done | 90s Cards, 2.5D Chibi Rigs, 11 Nations, Handedness, 3D Park, Web Audio |
| **M2** | **Core Playable MVP** (Sim Engine + Club Creator + Live 3D + Local Save) | 6 / 6 | `[x]` Done | **MVP Gate**: Complete playable game installable on Android |
| **M3** | **RPG Core**: Skill Trees, Specialists, Pitch Arsenals, Compromise Training, Cooldowns, Mental/Leverage, Roles, Sabermetrics, Endurance, Pacing & Role Cards | 10 / 15 | `[/]` In Progress | Deep 2–60 min player, tactical & RPG simulation core |
| **M4** | **Living League World**: 6-Tier Pyramid, Market Tiers & Roster Cap, 48 AI Clubs, Draft, FA & Rivalries | 1 / 6 | `[/]` In Progress | Multi-season promotion/relegation dynasty career |
| **M5** | **Sim-City Ballpark District**: Dynamic Fans, Pricing, Sponsors, TV, District Grid & 3D Upgrades | 0 / 5 | `[ ]` Planned | Interactive stadium & neighborhood builder visible in 3D |
| **M6** | **10X RPG Depth**: Clubhouse Chemistry, Coaches, 90s Gear Relics, Weather & Night Games | 0 / 5 | `[ ]` Planned | Synergy combos, coaching staff, loot relics & live weather |
| **M7** | **10X Front Office**: Trade Machine, Deadline Drama, Prospect Academy & "The Sandlot Gazette" | 0 / 4 | `[ ]` Planned | Full GM trade negotiation, farm call-ups & 90s newspaper |
| **M8** | **10X World Events**: All-Star Week & HR Derby, Global Chibi Cup, Winter Ball, Trophies & HOF | 0 / 5 | `[ ]` Planned | International Cup, Derby, Hall of Fame & Retired Jerseys on 3D wall |
| **M9** | **10X Polish & Sharing**: Shareable PNG Cards, Serverless Club Codes, Haptics, Perf & PWA Audit | 0 / 5 | `[ ]` Planned | 60 FPS Android perfection, shareable legends & release readiness |

**Overall 10X Progress**: `29 / 63` feature slices completed

> **Living Showcase Rule**: At every milestone completion—and whenever significant UI, 2.5D chibi, 3D ballpark, or gameplay visuals change—update **`README.md`** (milestone progress, feature highlights, quickstart) and refresh/add real preview screenshots in **`docs/screenshots/`** so the public GitHub homepage always showcases the live state of the game.

---

## The 10X Vision — What Makes This a Cult Classic

**Mini Baseball Manager** is an offline-first, cross-platform web & Android PWA where you are **General Manager, Field Manager, and Ballpark Architect** of a charming baseball dynasty — blending:

1. **Iconic Retro-90s Cartoon & Volumetric 2.5D Chibi Art (Design-First)**:
   - Collectible **90s Baseball Cards** (3D-flippable *1994 Rookie*, *All-Star Chrome*, and *MVP Holo Foil*) with procedural cel-shaded SVG portraits, crisp vector country flags, `B/T` handedness pills, and Cultural Heritage Myth/Animal badges.
   - **True ~1.8-Head Volumetric 2.5D Chibi Mini Players** with animated articulated SVG limbs, mirrored southpaw/righty gloves, palm-gripped baseballs, two-handed bat swings, and 2.5D standee depth + 3D hop physics inside a sunlit **Over-the-Shoulder 3D Ballpark** featuring all 9 live defenders, baserunners, instanced cheering fans, sponsor billboards, retired-number wall plaques, and dynamic weather/night lights.
   - **Procedural 90s Web Audio Synth & Ballpark Organ**: Multi-formant stadium crowd roars + hand-claps, bat cracks, super-pitch whooshes, spring boings, cash chimes, RPG level-ups, and classic ballpark organ riffs — 100% offline.

2. **10X RPG Progression, Specialists, Positional Craft & Clubhouse Chemistry**:
   - **Real Branching Skill Trees & Developmental Specialists** (Pitcher, Batter, Fielder, plus a **3-Tier Cultural Heritage Myth/Animal Branch** celebrating 11+ global baseball nations: *Eagle Soar*, *Moose Charge*, *Kitsune Mirage*, *White Tiger Pounce*, *Quetzalcoatl Serpent Wind*, *Huracán Swing*, *Coquí Leap*, *Jaguar Dash*, *Condor Glide*, *Kangaroo Bounce*, *Leprechaun's Luck*). Players arrive or evolve into authentic **Specialists** (*Contact Technician*, *Power Slugger*, *Defensive Wizard*, *Speed/Smallball*, *Super-Utility*, *Flame Closer*, *Crafty Tactician*, *Southpaw Specialist*) bounded by variable per-stat ceilings (`statCaps`).
   - **Positional Eligibility, Favorite Position Boost & Cross-Training Trade-Offs**: Some players lock cleanly to one role (`1B`-only or `C`-only), middle infielders pair `SS/2B`, while rare super-utilities cover all infield spots. Playing a player at their **Favorite Position** triggers a live fielding/control/clutch boost, while **Cross-Training** a brand-new position trades away current drill focus and adds slight positional rust to older positions.
   - **Compromise-First Training & Anti-Overpower Balance**: Every drill (batting approach, pitch recognition, bullpen pitch lab, conditioning, positional cross-training) improves target skills at a realistic trade-off elsewhere inside `statCaps` & `totalRatingBudget`—preventing homogenous 99-overall super-clones while letting rare, expensive **All-Stars** shine as genuine franchise unicorns.
   - **Scarce, High-Impact Special Abilities**: Super-power swings, signature pitches, Cultural Heritage finishers, and Manager Skipper calls run on strict per-game charges, multi-batter/PA cooldowns, Hype-gauge consumption, and fatigue exertion—turning them into dramatic clutch trump cards instead of every-at-bat spam.
   - **Luck, Mental Traits & High-Leverage Pressure Drama**: Subtle universal **Luck** nudges bloops, borderline calls, and lucky breaks; authentic clubhouse identities (**Good Clubhouse Guy**, **High-Energy Sparkplug**, **Ice in Their Veins**, **Big-Game Riser**, and **Pressure Wilter**) collide with dynamic **Leverage Index (`LI`)** and critical postseason/rivalry stakes!
   - **Slow-Earned Career Experience & Veteran Savvy**: Real baseball mileage (**seasons played, career games, at-bats/innings, playoff games**) takes multiple full seasons to earn, granting **Cagey Veterans** a subtle, authentic discipline/command/composure edge over green **Rookies** (while rookies grow skills faster over time).
   - **Human Manager RPG Tree**: Active in-game powers (*Pep Talk*, *Mound Whisper*, *Clutch Focus*, *Rally Cap Magic*, *Bullpen Freeze*) + permanent Coach & Mogul passives.
   - **Hot Streaks & Cold Slumps**: Dynamic momentum curves reflected on cards, portraits, and headlines — busted actively via animated Practice Drills or Manager Pep Talks.
   - **Clubhouse Chemistry & Synergy Bonds**: Personality archetypes (*Prankster*, *Clutch Captain*, *Quiet Assassin*, *Showboat*, *Gym Rat*, *Rival Hunter*) form live combos (*Bash Brothers*, *Battery Telepathy*, *Turn-Two Wizards*).
   - **90s Gear & Relics + Coaching Staff**: Equip quirky loot (*Lucky Neon Stirrups*, *Golden Ash Bat*, *90s Wrap Shades*, *Titanium Rosin Bag*) and hire SVG-portraited Pitching/Hitting/Scouting Coaches.

3. **10X Authentic Baseball Strategy, Roster Economics & Living Global Career**:
   - **Exact Handedness & Platoon Chess**: Batting (`50% R / 40% L / 10% Switch`), Position-specific Throwing (`SP` 35% L, `RP` 50% L, `OF` 50% L, `1B` 80% L, `C` 20% L, `2B/3B/SS` 100% R), same-hand vs opposite-hand platoon modifiers, LHP runner-hold edge, LHB first-base step edge, Lefty `1B` scoop edge, bullpen warmups, and defensive shifts.
   - **Pitcher Arsenals (`2–3` RP / `4–5` SP), Specialized Bullpen Roles, Endurance Drop-Off & Sabermetric Depth**: Starters command `4–5` pitches while relievers attack with `2–3` pitches across distinct roles (**Starter**, **Long Reliever**, **Short Reliever**, **LOOGY**, **Setup Man**, **Closer**, **Fireman**), with live **Pitcher Endurance (`100% → 0%`)** visibly dropping fastball velocity (`-1..-7 mph`), flattening sinker drop/`GB%`, and hanging tired breaking balls, alongside pitcher **Favorite/Weak Pitches**, batter **Favorite/Weak Pitches**, ball/strike counts, **GB% / LD% / FB% / Pop-Up%**, defender **Range / Arm / FPCT**, and full derived sabermetrics (**AVG / OBP / SLG / OPS / WHIP / ERA / K/9 / BB/9 / Strike% / FPCT**).
   - **20-Man Active Roster Cap & 6 Strategic Market Tiers**: Build up to a hard **20-player** active limit (plus 6 Farm slots) by balancing **Rookies** (cheap, `1.35x` XP growth, wide boom-or-bust `statCaps`), **All-Stars** (rare, expensive superstars), **Veterans** (affordable steady production with minimal `0.30x` growth left), **Above Average**, **Average**, and **Below Average** (bargain minimum depth often boasting one standout specialist tool).
   - **6-Tier Promotion / Relegation Pyramid (48 Clubs)**: Rookie Sandlot → Low-A Backyard → High-A Bus → AA Diamond → AAA Stardom → Mini Major League. 21-game regular seasons (7 three-game series) + 4-team Best-of-3 playoffs.
   - **Dynamic Team Rivalries**: Organic Rivalry Heat (`0–100`) fueled by walk-offs, playoff rematches, mascot pranks, and Free-Agent Poaching (*Ex-Star Revenge Matchups*), with 90s Comic "VS" splash cards, amped Special Power charge, Sellout Attendance Surges, and **Traveling Rivalry Cups**.
   - **Full Front Office**: 3-Round Amateur Draft, Fog-of-War Scouting, Free Agency & Bidding Wars, Multi-Player **Trade Machine & Trade Deadline Drama**, **Prospect Academy / Farm Squad**, Winter Leagues, and aging **Player Lifecycles** (Phenom → Prime → Mentor → Hall of Fame Retired Number → Hireable Coach!).
   - **World Spectacles**: Mid-Season **All-Star Game & 3D Home Run Derby**, plus the **Global Chibi Cup** every 3 seasons pitting national teams against each other!
   - **"The Sandlot Gazette"**: Auto-generated 90s tabloid front page after every series capturing walk-offs, hot streaks, rivalry drama, and trade rumors.

4. **10X Sim-City Ballpark District & Session Pacing (5 min → 60+ min)**:
   - Interactive **Ballpark District Map** around your stadium (*Nacho Cantina*, *Bobblehead Megastore*, *Arcade Pavilion*, *Batting Academy*, *Pitching Lab*, *Broadcast Tower*, *Club Museum*), Promo Nights (*Dollar Dog Day*, *Fireworks Friday*, *Bobblehead Night*), Ticket/Concession sliders, Tier-gated TV Contracts, and 90s Parody Sponsors shown on your 3D outfield wall!
   - **Built for Short Bursts (2–5 min) & Long Sessions (60+ min)**: Games never drag — choose **5-Inning Blitz**, **7-Inning Quick**, or **9-Inning Classic** (with starter endurance scaled proportionally), paired with **1x / 2x / 4x Live 3D**, **Sim At-Bat**, **Sim Half-Inning**, **Clutch-Moments Auto-Burst**, **Instant Sim**, and immediate **Extra-Inning Ghost Runner on 2B** so every session feels snappy and thrilling.
   - **100% Local-First + Serverless Sharing**: IndexedDB multi-slot saves, versioned migrations, JSON backup, **Exportable PNG Baseball Cards**, and **Shareable Club Export Codes** so friends can import your dynasty team as an AI opponent!

---

## Detailed 10X Milestone & Slice Roadmap

*(Atomic implementation tickets with exact interfaces and TDD specs live in [docs/TASKS.md](./docs/TASKS.md).)*

### Milestone 0 — Project Foundation, TDD Harness & Android PWA Shell (`4 / 4`)
- [x] **0A. Repo, Tooling & Stack Setup** (`TASK-001`): Vite 6, React 19, TypeScript strict, Tailwind v4, Three.js, Zustand, offline `@fontsource` fonts, ESLint.
- [x] **0B. Strict TDD & E2E Test Harness** (`TASK-002`): Vitest + Testing Library + jsdom + Playwright (Desktop `1280×800` & Android Pixel 7 `390×844`).
- [x] **0C. Android-Installable PWA Shell** (`TASK-003`): `vite-plugin-pwa`, `manifest.webmanifest`, offline Workbox caching, `192px`/`512px`/`maskable` PNG icons, safe-area CSS.
- [x] **0D. Design System Spec** (`TASK-004`): `docs/DESIGN_SYSTEM.md` tokens, breakpoints, and 3D world scale.

---

### Milestone 1 — Visual Identity & Interactive Design Lab (`8 / 8`, Visual Checkpoint)
- [x] **1A. 90s Baseball Card UI Kit** (`TASK-005`): Chunky comic buttons, cardstock panels, LED scoreboard strip, stat badges, responsive mobile bottom-nav / desktop sidebar shell.
- [x] **1B. Cel-Shaded 90s SVG Portraits & 3D Flip Baseball Card** (`TASK-006`): Procedural multi-tone SVG portraits, rarity frames (*Rookie / Chrome / Holo Foil*), 3D card flip.
- [x] **1C. Volumetric 1.8-Head 2.5D Chibi SVG Rigs & Animations** (`TASK-007`): Articulated Front/Back chibi SVGs, spherical/cylindrical gradients, 14 animation clips, anatomically aligned gloves/bats/balls.
- [x] **1D. Miniature 3D Ballpark, Over-the-Shoulder Camera & Super-Power VFX** (`TASK-008`): Sunlit 3D ballpark, instanced cheering fans, 90s sponsor billboards, throwing-shoulder OTS cameras, super-power trails & comic popups.
- [x] **1E. Procedural 90s Web Audio Synth, Ballpark Organ & Realistic Crowd** (`TASK-009`): Multi-formant pink-noise crowd roar + claps, bat cracks, super-pitch whooshes, organ riffs, mute toggle.
- [x] **1F. Interactive Design Lab Showcase** (`TASK-010`): Live 3D sandbox, animated SVG Rig Inspector, soundboard, uniform & mood sync.
- [x] **1G. 11 Global Nationalities & Cultural Heritage Myth/Animal Abilities** (`TASK-011`): Exact `50% USA + 5% × 10` weighted engine, crisp SVG flags, 11 signature Heritage Powers.
- [x] **1H. Lefty / Righty / Switch Handedness Engine & Mirrored Graphics** (`TASK-012`): Exact position-specific `B/T` distributions, platoon math, mirrored gloves/bats/helmets, 1st/3rd-base boxes & OTS shoulders.
  - [ ] *Visual Gate*: Final user sign-off on Milestone 1 before starting Milestone 2 (`TASK-013`).

---

### Milestone 2 — Core Playable MVP (`6 / 6`)
- [x] **2A. Canonical Domain Models & Seeded Roster Generator** (`TASK-013`): Core `Player`, `Club`, `ManagerProfile`, `Lineup`, `Rotation`, and balanced Rookie Sandlot roster factory combining nationality, handedness, traits, and starting skills.
- [x] **2B. Seeded Pitch-by-Pitch Baseball Simulation Engine** (`TASK-014`): Full baseball rules (counts, walks, Ks, 1B/2B/3B/HR, sac flies, errors, double plays, baserunning, stamina, extra innings, **Platoon & Handedness modifiers**) emitting deterministic `PlayEvent` streams with 3D trajectories.
- [x] **2C. New Club Creator & Lineup / Rotation Manager** (`TASK-015`): Quick Club Creator (city, name, monogram, mascot, 2 colors + 1-tap Randomize) + touch-friendly 9-man lineup, defensive assignment, pitching rotation, bullpen, platoon split preview, and auto-optimize helper.
- [x] **2D. Live 3D Game Day Engine & Full 9-Fielder Diamond Choreography** (`TASK-016`): Wire `PlayEvent` stream to Three.js ballpark with all 9 animated 2.5D chibi fielders + live baserunners, dynamic ball-follow cam, strike-zone pitch display, **1x/2x/4x speed**, **Clutch Moments Auto-Cam**, Instant Sim, tactical calls, and bullpen changes.
- [x] **2E. Exhibition & Opening Series Loop + Post-Game Rewards** (`TASK-017`): Box score, Play-by-Play ticker, Post-Game MVP Holo Spotlight, Player XP, Manager XP, and Club Cash payouts.
- [x] **2F. Local IndexedDB Persistence, Multi-Slot Saves & JSON Backup** (`TASK-018`): Versioned `SaveFileV1` store, auto-save, 3 career slots, schema migration runner, and JSON Export/Import backup.
  - [x] *MVP Gate*: Playable end-to-end game installable as an Android PWA with local persistence.

---

### Milestone 3 — RPG Core: Skill Trees, Specialists, Pitch Arsenals, Mental/Leverage, Roles, Sabermetrics, Endurance, Pacing & Role Cards (`10 / 15`)
- [ ] **3A. Player Branching Skill Trees & Capstone Special Powers** (`TASK-019`): Pure graph engine + pan/zoom interactive Skill Tree UI for Pitcher, Batter, and Fielder paths respecting `statCaps` & `totalRatingBudget`, with charge/cooldown/fatigue-gated capstone Special Powers & evolving `specialistArchetype`.
- [ ] **3B. 3-Tier Cultural Heritage Myth/Animal Skill Branches** (`TASK-020`): Expand each nationality's Heritage Ability into a 3-node unlockable progression with bespoke 3D VFX, `65–100` Hype-gauge consumption, strict charge/cooldown caps, and sim effects.
- [x] **3C. Dynamic Hot Streaks & Cold Slumps Engine** (`TASK-021`): Rolling multi-game form tracker driving 🔥 *On Fire!* & 🧊 *Cold Spell* stat curves, reactive 90s card frames/moods, and slump-busting triggers.
- [ ] **3D. Animated Practice & Training Complex** (`TASK-022`): Compromise-first Power/Contact Cage, Pitch-Recognition Timing Lab, Bullpen Pitch Lab, Velocity/Control Conditioning, Fielding Fungos, Sprint Track, Slump-Buster Film Session, **Position Cross-Training Drill**, and Fan Meet & Greet — cute 2.5D chibi dioramas respecting `xpGrowthMultiplier`, `statCaps`, and `totalRatingBudget`.
- [ ] **3E. Human Manager RPG Progression & In-Game Power Dock** (`TASK-023`): Manager XP/leveling across *Skipper* (Active In-Game Powers with `1/game` charge/cooldown badges, banners, and organ riffs), *Coach* (Training Passives), and *Mogul* (GM/Economy Passives).
- [x] **3F. Player Specialists, Positional Eligibility & Favorite Position Boost** (`TASK-053`): Asymmetric specialist archetypes, flexible vs single-position profiles (`1B`-only, `SS/2B`, all-infield), `★ FAV` position boosts, Out-of-Position penalties, and `crossTrainPosition` rust/training trade-offs.
- [x] **3G. Pitcher Pitch Arsenals (`2–3` RP / `4–5` SP), Favorite/Weak Pitches & Batter Pitch-Matchup Profiles** (`TASK-055`): 8-pitch catalog, role-locked repertoire sizes, pitcher Favorite Out-Pitch bonus & Weak-Pitch hanger risk, batter Favorite Pitch to Crush & Pitch Weakness, trainable recognition/mastery, card tags, and live pitch selection.
- [x] **3H. Compromise-First Training Engine & Special Ability Charge/Cooldown Gates** (`TASK-056`): Zero-free-lunch training trade-offs bounded by `totalRatingBudget` & `statCaps` (preserving rare `all_star` star power without overpowered clones), plus strict per-game charge caps, multi-batter/PA cooldowns, Hype drain & exertion fatigue on all Special Swings, Special Pitches & Heritage Powers.
- [x] **3I. Luck Attribute, Clubhouse/Mental Traits, Pressure Risers vs. Wilters & Dynamic Leverage Engine** (`TASK-057`): Subtle universal `luck` modifier, `clubhouse_glue` / `high_energy` / `ice_veins` / `pressure_riser` / `pressure_wilt` traits, and real-time Leverage Index (`LI`) × Game Stakes (`regular` → `elimination_championship`) pressure swings.
- [x] **3J. Specialized Pitching Staff Roles (`Starter`, `Long/Short Reliever`, `LOOGY`, `Setup`, `Closer`, `Fireman`)** (`TASK-058`): Role-fit sim bonuses/penalties, authentic LHP LOOGY & high-LI Fireman deployment, AI bullpen hierarchy, and Bullpen Phone role badges.
- [x] **3K. Balls/Strikes Command, Batted-Ball Profiles (`GB%/LD%/FB%/Pop-Up%`), Fielder Range/Arm/FPCT & Full Sabermetrics** (`TASK-059`): `gapPower`, `range`, `BattedBallProfile` (`pop_out`), zone Strike%/Walk-Rate command, defender range/arm/FPCT, and full derived stats (`AVG`, `OBP`, `SLG`, `OPS`, `WHIP`, `ERA`, `K/9`, `BB/9`, `Strike%`, `GB%`, `LD%`, `FB%`, `PopUp%`, `FPCT`).
- [x] **3L. Slow-Earned Career Experience (`Seasons/Games/ABs/IP`) & Veteran Savvy Advantage** (`TASK-060`): Cumulative multi-season baseball experience (`rookie_green` → `developing` → `seasoned` → `cagey_veteran`), slower earned RPG level XP pacing, and a subtle veteran composure/discipline/command edge over green rookies.
- [x] **3M. Pitcher Endurance & Pitch-Specific Effectiveness Degradation** (`TASK-061`): Live mound endurance gauge (`100% → 0%`) degrading fastball velocity (`-1..-7 mph`), flattening sinker/splitter drop & `GB%`, and hanging tired breaking balls + bullpen warnings & series recovery.
- [x] **3N. Multi-Burst Game Pacing (`5 / 7 / 9`-Inning Formats, Half-Inning Sim & Ghost-Runner Extras)** (`TASK-062`): Short-burst and long-session pacing via selectable 5/7/9-inning formats, 1-tap `Sim Half-Inning`, smarter `Clutch Burst`, and 1st-extra-inning 2B Ghost Runner.
- [/] **3O. Role-Specific Baseball Card Stats (Pitchers vs. Batters/Fielders)** (`TASK-063`): Pitcher cards show Velocity/Movement/Control/Stamina/Clutch + `ERA/WHIP/K9/Strike%`, while Batter/Fielder cards show Contact/Power/Speed/Fielding/Arm + `AVG/OBP/OPS/FPCT`.

---

### Milestone 4 — Living League World: 6-Tier Pyramid, Market Tiers, 48 AI Clubs, Draft & Rivalries (`1 / 6`)
- [ ] **4A. 6-Tier Promotion/Relegation Pyramid & 48 Unique Clubs** (`TASK-024`): Rookie → Low-A → High-A → AA → AAA → Mini Major League world generator, 21-game round-robin scheduler (7 three-game series), standings, tiebreakers, league leaders, 4-team Best-of-3 playoffs, and promotion/relegation ceremonies.
- [ ] **4B. Fog-of-War Scouting & 3-Round Amateur Draft** (`TASK-025`): Scouting budget reveals rookie `statCaps` ceilings, `flexibilityProfile`, and `specialistArchetype`; interactive Draft Room honoring the 20-man roster limit.
- [ ] **4C. Free Agency, Contracts, Payroll & Waivers** (`TASK-026`): Contract offers balancing expensive `all_star`s, value `veteran`s, and niche `below_average` specialists up to `MAX_ACTIVE_ROSTER_SIZE = 20`, bidding wars, and cut/release morale impacts.
- [ ] **4D. Personality-Driven AI GMs & In-Game Bullpen AI** (`TASK-027`): 5 AI philosophies weighing `marketTier`, `specialistArchetype`, `favoritePosition`, `statCaps`, and roster limits across drafting, signings, platoon lineups, and lefty-specialist bullpen calls; verified via a **10-season headless soak test**.
- [ ] **4E. Dynamic Team Rivalries Engine & Game Day Showdowns** (`TASK-028`): Cross-tier persistent Rivalry Heat (`0–100`), starter Crosstown Rival, walk-off/playoff/poached-star *Revenge Matchups*, 90s Comic "VS" splash card, +25–50% Hype charge, +25% XP, and Traveling Rivalry Cups.
- [x] **4F. Active Roster Limit (`20` Max) & 6 Player Market Tiers** (`TASK-054`): `rookie` (cheap / `1.35x` XP / variable `statCaps`), `all_star` (rare & expensive), `veteran` (affordable steady quality / `0.30x` minimal growth), `above_average`, `average`, and `below_average` bargain specialists + `20`-man roster limit enforcement.

---

### Milestone 5 — Sim-City Ballpark District, Fanbase & Club Economy (`0 / 5`)
- [ ] **5A. Fanbase, Hype & Dynamic Attendance Simulation** (`TASK-029`): Attendance engine combining Stadium Capacity, Team Hype, Win Streak, Star Popularity, Rivalry Sellout Surge, Promo Nights, and Ticket Fairness — driving real 3D chibi crowd density, rival fan pockets, and stadium waves.
- [ ] **5B. Ticket & Concession Pricing, Promo Nights & Cash Ledger** (`TASK-030`): Interactive pricing sliders with live Sim-City fan-mood meters, Hot Dog / Nacho / Foam Finger / Ice Cream Helmet quality controls, Promo Night calendar (*Bobblehead Night*, *Dollar Dog Day*, *Fireworks Friday*), and financial statements.
- [ ] **5C. 90s Parody Sponsors & Tier-Gated TV Contracts** (`TASK-031`): Negotiable endorsements (*Turbo Fizz*, *Pixel Pizza*, *Rad Shades*, *Crunch-O's*) with series milestone bonuses visibly rendered on your 3D outfield wall, plus Public Access → Local Cable → Regional Sports → National Primetime TV deals.
- [ ] **5D. Interactive Ballpark District Builder Grid** (`TASK-032`): Visual Sim-City neighborhood grid around your ballpark (*Nacho Cantina*, *Bobblehead Megastore*, *Arcade Pavilion*, *Batting Academy*, *Pitching Lab*, *Transit Shuttle*, *Broadcast Tower*, *Club Museum*) with adjacency synergies, upkeep, and upgrade tiers.
- [ ] **5E. Visual 3D Stadium Evolution Engine** (`TASK-033`): Purchased stadium tiers (Bleachers → Grandstand → Double-Deck → Mega Dome, Jumbotron, Floodlights, Mascot Cannon, District Skyline, Championship Pennants) visibly transform your 3D ballpark in real time.

---

### Milestone 6 — 10X RPG Depth: Chemistry, Coaches, Gear Relics & Dynamic Weather (`0 / 5`)
- [ ] **6A. Clubhouse Chemistry, Personalities & Synergy Bonds** (`TASK-034`): 7 player personality archetypes, clubhouse morale meter, and active in-game Duo/Trio Synergy Combos (*Bash Brothers*, *Battery Telepathy*, *Double-Play Wizards*, *Speed Demons*) with 3D combo popups.
- [ ] **6B. Hireable Coaching Staff & Front Office** (`TASK-035`): Hireable Pitching Coach, Hitting Coach, Head Scout, and Stadium Director with retro 90s portraits, contracts, and stacking RPG/economy perks.
- [ ] **6C. 90s Collectible Gear & Relics (RPG Loot System)** (`TASK-036`): Equippable relics (*Golden Ash Bat*, *Lucky Neon Stirrups*, *Titanium Rosin Bag*, *Spring-Loaded Cleats*, *Grandpa's Mitt*, *Iridescent 90s Shades*) earned from achievements, promos, and surprises — with live stat bonuses & visual flair.
- [ ] **6D. Dynamic Ballpark Weather, Wind & Night Games** (`TASK-037`): Sunny, Golden Hour Sunset, Stadium Floodlight Night Games (unlocked via Lights upgrade), Swirling Wind (affecting HR/fly-ball trajectories & 3D flags!), and Light Drizzle / Rain-Delay events.
- [ ] **6E. Defensive Shifts, Bullpen Warmup Phone & Win Probability HUD** (`TASK-038`): Live tactical shift calls (*Infield In*, *No Doubles*, *Bunt Defense*), interactive Bullpen Warmup status, pitch-location strike-zone mini-map, and live Win Probability sparkline.

---

### Milestone 7 — 10X Front Office: Trade Machine, Prospect Academy & "The Sandlot Gazette" (`0 / 4`)
- [ ] **7A. Multi-Player Trade Machine & Trade Deadline Drama** (`TASK-039`): Fair-value AI Trade Evaluator weighing `marketTier`, `specialistArchetype`, `favoritePosition`, `statCaps`, age & `20`-man roster fit; multi-player & draft-pick swaps; incoming AI Deadline Trade Offers.
- [ ] **7B. Prospect Academy (Farm / Taxi Squad) & Rookie Call-Ups** (`TASK-040`): 6-slot youth academy to stash & train drafted prospects without clogging active roster, plus celebratory **Rookie Debut** games with hype/XP bonuses.
- [ ] **7C. Aging Player Lifecycles, Mentorship & Coach Transitions** (`TASK-041`): Age curves (Phenom → Prime → Veteran Mentor → Retirement), veteran-to-rookie XP mentorship aura, and retiring club legends optionally joining your hireable Coach pool!
- [ ] **7D. "The Sandlot Gazette" Auto-Generated 90s Newspaper** (`TASK-042`): Rich retro tabloid front page after every series featuring procedurally written headlines for walk-offs, hot streaks, rivalries, trades, league leaders, and clickable player cards.

---

### Milestone 8 — 10X World Spectacles: All-Star Derby, Global Chibi Cup, Surprises & HOF (`0 / 5`)
- [ ] **8A. Mid-Season All-Star Game & 3D Home Run Derby** (`TASK-043`): Fan-voted All-Star selections + playable/watchable bracketed 3D Home Run Derby with rapid bomb-swing VFX, crowd fireworks, and prize money/relics.
- [ ] **8B. The Global Chibi Cup (International Tournament)** (`TASK-044`): Every 3 seasons, all 11+ national squads clash in a knockout World Cup celebrating Cultural Heritage Myth/Animal Powers — your stars compete for national glory and earn permanent **Global Cup Medals**.
- [ ] **8C. Offseason Winter Ball & Barnstorming Tours** (`TASK-045`): Send up to 3 young players to DR, Japan, Mexico, or Australia Winter Leagues during the offseason for bonus SP and rare cross-cultural traits.
- [ ] **8D. Narrative Surprise Events Deck (50+ Cards)** (`TASK-046`): Context-aware 90s choice events (*Traveling Knuckleball Guru*, *Raining Tacos Night*, *Cereal Box Cover Deal*, *Rival Mascot Heist*, *Sandlot Walk-On Phenom*, *Viral Trick-Play*) with branching consequences.
- [ ] **8E. End-of-Season Awards, Trophy Room, Hall of Fame & Retired Wall Numbers** (`TASK-047`): Automated MVP, Golden Arm, Iron Glove, Rookie of the Year, and Manager of the Year voting, interactive Trophy Room + Traveling Rivalry Cups, Club Hall of Fame, and **Retired Jersey Plaques mounted visibly on your 3D Outfield Wall**.

---

### Milestone 9 — 10X Polish, Serverless Sharing & Android PWA Mastery (`0 / 5`)
- [ ] **9A. Unlockables Gallery & Custom Cosmetic Unlocks** (`TASK-048`): Unlockable throwback uniforms, custom bat VFX skins (*Lightning*, *Pixel*, *Gold*, *Sakura*), stadium themes (*Sandlot Sunset*, *Neon Night*, *Classic Brick*, *Space Dome*), and secret legendary skill nodes.
- [ ] **9B. Shareable PNG Baseball Cards & Serverless Club Export Codes** (`TASK-049`): 1-tap export of any player's 90s Holo Foil card as a crisp downloadable PNG + compact Base64/JSON **Club Export Code** letting friends import your dynasty club as an exhibition AI boss!
- [ ] **9C. Android Haptics, Wake Lock & In-App Install Flow** (`TASK-050`): Subtle `navigator.vibrate` haptics on HRs/Ks, optional Screen Wake Lock during live 3D games, custom Android "Install App" prompt banner, and offline status indicator.
- [ ] **9D. 60 FPS Mobile WebGL Profiling & Accessibility Audit** (`TASK-051`): Texture atlas memory budget, menu frame throttling, reduced-motion mode, colorblind-safe stat grade patterns, full keyboard & screen-reader pass.
- [ ] **9E. Final Release Gate & Full Career E2E Suite** (`TASK-052`): Full Playwright Desktop + Android E2E career test, ≥90% `src/engine/` coverage verified, Lighthouse PWA audit clean.

---

## Plan Adjustment & Decision Log

| Date | Area | Change / Decision | Rationale |
| :--- | :--- | :--- | :--- |
| 2026-11-21 | Visuals & Stack | Locked Vite + React + TS + Tailwind v4 + imperative Three.js + Zustand + Vitest + Playwright + PWA + Web Audio synth | Balances 60 FPS Android performance, 90s charm, and clean TDD separation |
| 2026-11-21 | League Pacing | Locked 6 tiers × 8 teams, 21-game regular season + 4-team playoffs | Makes 3-game series ideal for 5–15 min runs while keeping seasons meaty |
| 2026-11-21 | Gameplay / League | Added **Dynamic Team Rivalries** (heat meter, organic triggers, poached-player revenge games, comic VS cards, boosted hype/attendance, traveling Rivalry Cup) | Deepens multi-season drama and ties together visuals, RPG, economy, and trophies |
| 2026-11-21 | Player Visuals (M1) | Upgraded players to **True 1.8-Head Volumetric 2.5D Chibi SVG Rigs** + cel-shaded 90s card portraits + 2.5D standee rim & 3D hop physics in the ballpark | Delivers authentic chibi proportions and tactile 2.5D depth while keeping approved 90s cards crisp |
| 2026-11-21 | Global Roster & RPG | Added **11 Nationalities** (`50% USA` + `5%` each CAN/JPN/KOR/MEX/DOM/PRI/BRA/ARG/AUS/IRL, extensible) with crisp SVG flags & **Cultural Heritage Myth/Animal Abilities** | Celebrates international baseball culture and adds memorable identity & RPG flavor |
| 2026-11-21 | RPG & Simulation (M3) | Added **Hot Streaks & Cold Slumps** (dynamic player form & slump-busting via practice/manager powers) | Makes day-to-day lineup decisions, pep talks, and practice feel alive |
| 2026-11-21 | Gameplay & Visuals | Added **Lefty / Righty / Switch Handedness & Platoon Matchups** (exact position-specific throw & bat distributions, platoon edges, mirrored 2.5D/3D graphics) | Deepens bullpen/lineup chess and adds unmistakable visual variety on mound & plate |
| 2026-11-21 | 10X Expansion & Agentic Workflow | Expanded roadmap to **10 Milestones / 52 Slices** (All-Star HR Derby, Global Chibi Cup, Chemistry, Coaches, 90s Relics, Weather, District Grid, Trade Machine, Farm Academy, Sandlot Gazette, HOF/Retired Wall Numbers, Shareable PNG Cards & Club Codes) and added `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/TASKS.md` | Makes the game a genuine 10X cult-classic baseball RPG AND enables any AI agent to drop in and contribute autonomously with zero ambiguity |
| 2026-11-21 | Open Source & Docs Hygiene | Published under MIT License on GitHub and added mandatory **`README.md` + `docs/screenshots/` visual preview refresh** to the milestone/PR Definition of Done | Ensures the public GitHub showcase always reflects the latest visuals, features, and progress |
| 2026-11-21 | Engineering Craft & Quality Gates | Added portable `.agents/skills/` (`ub-tdd-craft` & `pstack-correct` inspired by `ub-mode` and `pstack`) plus mechanical ESLint (hexagonal purity, `SeededRng`, `complexity <= 10`, `max-depth <= 3`) and Vitest (`>= 90%` engine coverage thresholds) gates | Enforces clean TDD, root-cause discipline, and architectural purity mechanically across every AI editor and human contributor |
| 2026-11-21 | Specialists, Positions & Market Tiers (`TASK-053`, `TASK-054`) | Added player Specialists, `PositionalFlexibilityProfile` (`1B`-only vs `SS/2B` vs all-infield utility), `favoritePosition` boost, Cross-Training focus/rust trade-off, `MAX_ACTIVE_ROSTER_SIZE = 20`, and 6 `PlayerMarketTier` curves (`rookie`, `all_star`, `veteran`, `above_average`, `average`, `below_average`) | Creates meaningful draft, free-agency budget, and roster-construction choices instead of interchangeable clones |
| 2026-11-21 | Pitch Arsenals, Matchups, Compromise Training & Ability Cooldowns (`TASK-055`, `TASK-056`) | Added `2–3` RP / `4–5` SP pitch arsenals, pitcher `favoritePitch`/`weakestPitch`, batter `favoritePitch`/`weakPitch` matchup curves, compromise-first training trade-offs inside `totalRatingBudget` (keeping rare `all_star`s elite without overpowered 99-all-stat clones), and strict charge/cooldown/Hype/fatigue gates on Special Swings, Pitches & Heritage Powers | Deepens mound-vs-plate tactical chess, prevents runaway stat inflation, and keeps special abilities exciting clutch finishers instead of constant spam |
| 2026-11-21 | Luck, Mental Traits, Leverage, Pitcher Roles & Full Sabermetrics (`TASK-057`, `TASK-058`, `TASK-059`) | Added subtle universal `luck`, clubhouse/mental traits (`clubhouse_glue`, `high_energy`, `ice_veins`, `pressure_riser`, `pressure_wilt`), dynamic Leverage Index (`LI`) × Game Stakes pressure engine, 7 specialized `PitcherRole` profiles (`starter`, `long_reliever`, `short_reliever`, `loogy`, `setup_man`, `closer`, `fireman`), `gapPower` / `range` / `arm` / `fielding`, batted-ball profiles (`GB%`, `LD%`, `FB%`, `PopUp%`, `pop_out`), zone Strike%/Walk-Rate, and derived sabermetrics (`AVG`, `OBP`, `SLG`, `OPS`, `WHIP`, `ERA`, `K/9`, `BB/9`, `Strike%`, `FPCT`) | Elevates in-game bullpen & clutch decision-making and gives baseball fans rich, authentic stat profiles behind the charming 90s chibi presentation |
| 2026-11-21 | Slow-Earned Career Experience & Veteran Savvy (`TASK-060`) | Added `CareerServiceProfile` (`seasonsPlayed`, `careerGames`, `careerPAs`/`IP`, `careerPlayoffGames` → `experienceScore 0..100` across `rookie_green` → `cagey_veteran`) and realistic slower RPG XP level pacing | Makes career experience genuinely take multiple seasons to build and rewards signing/keeping seasoned veterans with a subtle composure, discipline & command edge over green rookies |
| 2026-11-21 | Pitcher Endurance Drop-Off & Multi-Burst Game Pacing (`TASK-061`, `TASK-062`) | Added pitch-specific endurance degradation (fastball/cutter velocity drop `-1..-7 mph`, sinker/splitter drop & `GB%` flattening, hanging tired breaking balls, mound endurance gauge & recovery) plus selectable `5 / 7 / 9`-inning game formats, `Sim Half-Inning`, smarter `Clutch Burst`, and 1st-extra-inning 2B Ghost Runner | Makes bullpen timing tactically readable on every pitch AND ensures games stay punchy and fun in both 2–5 min mobile bursts and hour-long dynasty sessions |
| 2026-11-21 | Role-Specific Baseball Card Stats (`TASK-063`) | Split baseball card back stat profiles so Pitchers (`SP`/`RP`) display Velocity, Movement, Control, Stamina & Clutch (+ `ERA/WHIP/K9/Strike%`) while Batters/Fielders display Contact, Power, Speed, Fielding & Arm (+ `AVG/OBP/OPS/FPCT`) | Keeps collectible cards authentic to real baseball cards instead of showing irrelevant batting stats on pitchers or pitching bars on position players |

---

## Ideas & Backlog Parking Lot

*(Future 100X inspirations — promote into a Milestone when ready!)*

- [ ] Additional nationalities batch (Venezuela, Cuba, Taiwan, Colombia, Netherlands, Italy) with myths & animals
- [ ] Custom uniform / jersey stripe & logo editor
- [ ] Optional Bluetooth/WebRTC local pass-and-play Exhibition Duel between two friends' exported clubs
- [ ] Historical "199X Time Capsule" challenge scenarios (e.g., *"Take over a 1–10 Rookie club in June and escape relegation!"*)
