# ⚾ Mini Baseball Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-FFC300.svg?style=flat-square&labelColor=181B2C)](./LICENSE)
[![CI](https://github.com/nicholas-wagner/mini-baseball-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/nicholas-wagner/mini-baseball-manager/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/Android_PWA-Offline_First-2FB356?style=flat-square&labelColor=181B2C)](./vite.config.ts)

**Mini Baseball Manager** is an open-source, offline-first **baseball management RPG with painted miniature players and 3,000 illustrated manga cards** built for desktop and Android PWA.

Manage lineups, draft global prospects, develop branching player & manager skill trees, unleash cultural myth & animal Special Powers, build a Sim-City ballpark district, fuel multi-season team rivalries, and watch games unfold in **over-the-shoulder 3D**—all stored locally on your device with zero centralized backend.

---

## Your first game

Opening Day puts the player from your actual lineup on the first card. Tap **Bat with** or **Pitch with** to take over the pictured rally. **Customize** lets you pick a mascot, uniform or roster. On a phone, **Use this club** stays within reach while you browse.

| Meet Marcus | Set up for contact | Set up for power |
| --- | --- | --- |
| ![Marcus Baker's Opening Day card and the tying run situation](./docs/screenshots/opening-day.webp) | ![Marcus choking up on the bat with Contact selected](./docs/screenshots/batting-contact.webp) | ![Marcus planting his feet and loading up with Power selected](./docs/screenshots/batting-preview.webp) |

Choose **Contact** or **Power** to set the batter’s stance, then tap **Swing**. Choose **Bunt** to see the batter square around. The field inset names the tying or lead runner and marks their bag. A successful sacrifice follows the runner to the next base, where they tip their helmet.

| Before the bunt | After the sacrifice | Roster cards |
| --- | --- | --- |
| ![Marcus squares to bunt with Lucas marked as the tying run on first](./docs/screenshots/opening-bunt.webp) | ![The destination marker identifies the safe runner after Marcus advances both teammates](./docs/screenshots/opening-sacrifice.webp) | ![Player names and portraits at the top of the mobile binder](./docs/screenshots/phone-binder.webp) |

On defense, pitching defaults to **Simple mode**: your catcher calls the pitch and spot (including elevated **High Heat** fastballs in two-strike counts), with an optional **Shake off** pill to cycle signs while watching the 3D catcher shift behind the plate. Switch anytime to **Normal mode** (**Over Plate**, **Corner**, or **Low Chase** with automatic location-matched pitch selection) or **Advanced mode** (location + every pitch in your pitcher’s arsenal). **Matchup** opens scouting, and **Options** holds pitching mode, timing and signature powers. With **More controls** open on a phone, **Tactics** holds speed, timing, sim, and defensive adjustments. Rotate for the field on the left and the calls on the right. **Dugout** opens the career tabs. **Play Ball** returns to the same game.

| Pitching on a compact phone | Tactics in landscape |
| --- | --- |
| ![Jasper aims at the corner with the field, count and pitch button visible on a 360 by 640 phone](./docs/screenshots/compact-pitch.webp) | ![The complete field, pitch call and Tactics button side by side at 844 by 390](./docs/screenshots/phone-landscape-pitch.webp) |

| The call at first | Jasper on defense | Players between at-bats |
| --- | --- | --- |
| ![The ball beats Marcus to first as the mascot peeks at the umpire](./docs/screenshots/force-call.webp) | ![Jasper Hunter credited with striking out Ariel](./docs/screenshots/defensive-credit.webp) | ![Marcus greets Ethan Torres after the out](./docs/screenshots/rally-handoff.webp) |

Marcus’s groundout leaves two runners aboard for Ethan. **Watch again** replays that throw, **Scoring detail** records the assist, and **Next batter** puts Ethan in the box. The welcome pack arrives between innings. After the game, the recap leads with the first credited play you called in the guided at-bat, even in a loss. Other games feature a highlight from your club when one was recorded. **Keep this moment** saves it to your album, including sacrifice bunts that moved a runner. [Mobile recap after a loss](./docs/screenshots/club-keepsake-recap.webp)

A pitching change names the incoming reliever on the field. The catcher gives them the ball and returns to the plate. In a paused game you can call the next pitch directly from the diamond. Bullpen management supports three persisted modes—**Ask Me** (semi-auto default with Coach Pops 1-tap reliever suggestions for tired arms, jams, and 5/7/9-inning save spots), **Auto** (hands-free pitching changes), and **Manual** (full skipper control with `★ Coach’s Pick` highlights, `Due Up` batter handedness, reliever pitch mixes, and an optional Pro `🔥 HOT (+2 CTL)` warmup bonus)—switchable anytime from the Bullpen drawer, Guided Options, Pro Bullpen Phone, or Settings. Paired with 3-mode **Pitching Controls** (`Simple` / `Normal` / `Advanced`) and 3-mode **Front Office Management** (`Auto` Assistant GM / `Ask Me` Checklist / `Manual`), every manager can dial in their exact comfort level. [See the handoff](./docs/screenshots/bullpen-handoff.webp) · [See the next pitch on a phone](./docs/screenshots/bullpen-ready.webp).

On a sacrifice bunt, watch the batter run through first and the baserunner stop on second. [Watch the play](./docs/screenshots/sacrifice-bunt-replay.webp) · [See the runner on second on a phone](./docs/screenshots/sacrifice-bunt-second.webp).

<details>
<summary>Watch a third strike, a force at first and a runner rounding third</summary>

![Pitcher and catcher in one shot through strike three](./docs/screenshots/called-strike.webp)

![The shortstop throws to first as the batter runs through the bag](./docs/screenshots/force-at-first.webp)

![Three frames from the same gap double show the lead runner rounding third and approaching home as the relay comes in.](./docs/screenshots/gap-relay.webp)

</details>

### The card collection

After a win or a loss, **Keep this moment** saves the illustrated player, opponent, inning, play and score to the club’s Trophy Album. The most recently saved play for that player appears in their next live matchup’s scouting details.

Each of the 3,000 players keeps their illustration when they change clubs. Open either live matchup card to inspect the hitter or pitcher. In the roster binder, choose **Print gallery** to browse a wall of illustrations. Tap a print to enlarge it. Switch back to **Stat cards** and flip one for the player’s role-specific ratings. The MVP gets a foil front and a headline drawn from that game’s box score.

![A page of illustrated cards in the desktop roster binder](./docs/screenshots/roster-prints.webp)

---

## Off the Clock

After your first game, **Off the Clock** appears right inside your post-game recap with your teammate’s portrait and clue ready to tap (or inspect any roster card anytime). Pick anyone on the active roster, including the bench. Each conversation reveals a personal hobby, adds a signed note or Sandlot Postcard to your Trophy & Sticker Album and gives that teammate up to two morale points. You earn another conversation every two games, including games you simulate. The album includes illustrated hobby prints for players across the catalog. Look for Rico’s moonlit mecha, Wade’s star-lined dance jacket, or the tiny marshmallow sailboat in Manny’s cocoa. For the rest of the roster, the signed postcard carries their baseball portrait as a postage stamp. Their initials stand in if the portrait is unavailable offline.

[Phone album](docs/screenshots/hobby-album-phone.webp) · [Desktop album](docs/screenshots/hobby-album-desktop.webp) · [Phone recap](docs/screenshots/off-the-clock-mobile.webp) · [Desktop recap](docs/screenshots/off-the-clock-desktop.webp)

## Calling the game

On a close single with a runner rounding third, the field holds at the bag. Read the outfielder’s arm and choose **Send home** or **Hold at third**. Watch the cutoff throw and the catcher’s tag, then check the result in the scorebook.

| The third-base call on Android | The third-base call on desktop |
| --- | --- |
| ![The runner at third with the send and hold buttons on a phone](./docs/screenshots/third-base-phone.webp) | ![The manager reads the outfielder’s arm with the field and score in view](./docs/screenshots/third-base-desktop.webp) |

Open **Park scouting** before first pitch to see the fence distances and move a hitter up the order. Flip a player’s card for their stance habit. Hitters also carry their last six recorded batted-ball locations between games. During an at-bat, the catcher can suggest the next pitch and location from the sequence just thrown.

In **Tactics**, choose when **Smart Watch** should pause for you, including a particular hitter, the tying run reaching base, or a tiring starter. The **Sandlot Gazette** calls selected career matchups. Between innings, the out-of-town board posts a final from another scheduled game in your tier.

### Behind-the-catcher batting, mobile cockpit & desktop broadcast studio

When your club is batting, the default camera sits right behind the catcher looking out to the mound, and the **Swing** / **Throw Pitch** controls stay locked until each pitch or play finishes. On phones, live play fits in one zero-scroll screen (`360×640`, `390×844`, and `844×390` landscape) with a single **Tactics** bottom sheet, a live TV K-Zone pitch plot, teammate dugout cheers, and a 3-tab post-game recap (**Highlights**, **Clubhouse**, **Box Score**). On desktop (`1280×800`), the 2-column Broadcast Studio pairs the 3D ballpark with keyboard shortcuts (`Space` swing/throw, `1/2/3` approach, `B` bunt, `S` steal, `H` hype, `T` tactics, `Esc` close), dynamic weather lighting, 3D home run fireworks, and illustrated 1994 Foil Pack relics and die-cut celebration stickers.

| Behind-the-catcher on a compact phone | Phone landscape cockpit | Unified Tactics sheet |
| --- | --- | --- |
| ![Behind-the-catcher batting view on a 360 by 640 phone with Contact, Power, Bunt and Swing above the fold](./docs/screenshots/council-mobile-batting.webp) | ![Two-column behind-the-catcher landscape layout at 844 by 390](./docs/screenshots/council-landscape-batting.webp) | ![Unified mobile Tactics bottom sheet with Smart Watch, speed, sim, timing, box score and approach controls](./docs/screenshots/council-tactics-sheet.webp) |

| 3-tab post-game celebration | Desktop Broadcast Studio |
| --- | --- |
| ![Mobile 3-tab Post-Game modal with Highlights, Clubhouse and Box Score tabs above the fold](./docs/screenshots/council-postgame-tabs.webp) | ![1280 by 800 Desktop Broadcast Studio pairing the behind-the-catcher 3D ballpark with live shortcuts, Hype meter and pitcher endurance](./docs/screenshots/council-desktop-studio.webp) |

## Core Pillars

- **GM-First Core Loop, Predetermined Home & Away Schedule, Sports-Page Recaps & Special Skill Trees**: Start a club in seconds and play through a predetermined **7-Series (21-Game) Home & Away Season Schedule** with live **3-Game Series Scoreboards** (*Rubber Matches*, *3-0 Sweep Bonuses*, and Road Trips inside rival 3D ballparks!), **Sports-Page Post-Series Recap Cards** (3 game scores, clickable Series MVP card & standings movement), **Pre-Game Probable Pitcher & Free-Agent Scout Cards** + 1-tap **Auto-Tune Lineup vs LHP/RHP**, clickable **League Leaders & Rival Club Cards**, and **Coach Pops' Manager Clipboard** — track your live **Promotion Chase & Season Owner Goal**, pick **1 focused Team Practice per game/series** (*Batting Cage*, *Bullpen Lab*, *Full-Squad*, or *Rest & Film*) and a **Pre-Series Gameplan** (*Balanced*, *Swing for the Fences*, *Small-Ball Chaos*, or *Bullpen Lockdown*) with real simulation trade-offs, react to **Incoming AI Trade Offers & Clubhouse Dilemmas**, spotlight **Hot-Hand / Breakout Watch** stars, swap tired starters in 1 tap, and let **1-tap Sim Next 3-Game Series** automatically grow core ratings while earning **Skill Points (SP)** for unified **Player & Manager Skill Trees** (with live nav badges for `🩺` injuries, `⚡` ready SP, `🏆` Playoffs, and `⬆` Ballpark upgrades).
- **Zero-Scroll Live 3D Games — Smart Watch, Bunt Physics, Catcher's Pitch Sign, Visible Pitcher Fatigue & Optional Arcade Timing**: Watch full games with **✨ Smart Watch**, flip 3D cameras anytime (**`Auto` / `Pitcher` / `Batter` / `Wide`**), or toggle the optional **🎯 Arcade Sweet-Spot Timing Bar** — featuring a **Sticky Broadcast Scoreboard**, 2-second matchup scouting lines with a live **Pitcher Endurance & Stamina Meter** (visibly tracking velocity, break, and control drop-off as arms tire), **5-word pitching & batting trade-offs**, a full **🏏 Bunt** option (with live odds scaled by bunt skill, runner speed, pitch quality, infield alignment & defender glove/arm, plus sacrifice advances and 2-strike foul strikeouts), a 1-tap **Catcher's Pitch Sign Strip** (`Auto` + every pitch in the pitcher's arsenal right beside `Heat / Over Plate / Corner / Low Chase`) paired with live **Pitch-Thrown Radar Pills**, tappable Opening Day **Signature Powers**, a calm **Between-Game Spotlight**, and **Pro Manager** controls in the phone’s **Tactics** drawer.
- **90s Manga Baseball Cards, Mobile Card Binder, Painted 2.5D Ballpark Players & Uniform Studio**: Collectible 90s manga baseball cards (3D card flip, Holo Foil frames, role-specific Pitcher vs. Batter stats, top-of-card Star Favorite & Nickname/Jersey customization, 1-tap PNG export, promoted top-level **🖼️ Art Gallery** & **🎨 Uniform Studio** access, and illustrated 1994 Foil Pack cards) alongside painted 2.5D ballpark players inside sunlit Three.js 3D ballparks.
- **25 Global Baseball Nations & Cultural Heritage Powers**: Full WBC international roster generation across **25 baseball nations** (*USA, Canada, Japan, South Korea, Mexico, Dominican Republic, Puerto Rico, Venezuela, Cuba, Chinese Taipei, Colombia, Netherlands, Italy, Brazil, Australia, Panama, China, Israel, Czechia, Great Britain, Nicaragua, South Africa, Spain, Argentina, Ireland*) with crisp vector SVG flags and 3-tier unlockable Myth/Animal Heritage Powers that actively modify gameplay.
- **Deep Baseball Strategy, Speed-Driven Base Stealing & Co-Ed Archetypes**: Exact `B/T` platoon chess, `2–3` RP / `4–5` SP pitch arsenals, pitcher endurance velocity/break/control drop-off, full **Base Stealing** (`Steal 2B`, `Steal 3B`, `Double Steal`, `Steal Home`, defensive `Pitchout/Hold`, `SB/CS`, AI steals, live speed-driven odds), Defensive Shifts, Bullpen Warmups, Win Probability & Strike-Zone HUD, `5 / 7 / 9`-inning formats + 1st-extra-inning 2B Ghost Runner, asymmetric co-ed traits, and full sabermetrics (`AVG/OBP/SLG/OPS/ERA/WHIP/K9/Strike%/FPCT`).
- **Full GM Career, Sim-City Ballpark HQ, World Spectacles & Pass-and-Play Duels**: Climb from a neighborhood **Rookie Sandlot (`500–1,500` fans)** to **Pro Major League Cathedrals (`28,000–45,000` fans)** across `10` retro venues with Park Factors, playable **Best-of-3 Postseason Brackets**, Ticket/Concession/Sponsor/District Grid economy, **The Sandlot Gazette**, **52 Narrative Surprise Cards**, **Trade Machine**, **6-Slot Prospect Farm Academy**, hireable **Coaching, Equipment & Medical Staff** (including retired club legends!), **Season Awards & Hall of Fame**, **All-Star Home Run Derby**, **Global Chibi Cup**, **199X Time Capsule Scenarios**, and offline `MBM1:` **Pass-and-Play Friend Boss Duels**.
- **4-Slot Auto-Save, Coach Pops' Guide & 8 Replayable CYOA Backstories**: Automatic local saving & resume across **4 Career Save Slots**, an illustrated **Dugout Handbook**, **8 replayable Manager Backstories** (selectable right at club creation with 24 branching CYOA chapters), and an Accessibility/Settings drawer (SFX volume, haptics, wake lock, reduced motion & colorblind stat symbols).
- **Procedural 90s Web Audio (40 SFX Cues + 12 League-Tier-Gated Stadium Soundtracks)**: Zero-dependency Web Audio synthesizer featuring 40 ballpark cues (*Stomp-Stomp-Clap!*, *7th-Inning Stretch*, airhorns, fireworks, multi-formant pink-noise crowds) plus a **League-Tier-Gated 90s Arcade Stadium Jukebox** offering **2 selectable tracks per league tier** from Rookie Sandlot all the way up to Mini Major League *(the full 40-cue Ballpark Soundboard lives inside the hidden `5× 'd'` Design Lab)*.

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

- **[PLAN.md](./PLAN.md)** — 10X Master Roadmap (`M0`–`M10`, 73 completed roadmap tasks) and Game Day follow-ups through TASK-102.
- **[docs/SIMULATION_MATH.md](./docs/SIMULATION_MATH.md)** — Full pitch-by-pitch seeded dice-roll formulas, all 15 attribute effects, National/Capstone powers, Weather, Shifts, Mind Games & Nemesis math.
- **[docs/TASKS.md](./docs/TASKS.md)** — Atomic, dependency-ordered TDD task queue through **TASK-102**.
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Canonical TypeScript interfaces, `PlayEvent` stream contracts, and 3D ballpark coordinates.
- **[docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)** — Exact 90s color tokens, typography, touch targets, and chibi scale units.
- **[AGENTS.md](./AGENTS.md)** — AI Agent onboarding guide, hard architectural invariants, and Definition of Done.

---

## Tech Stack

- **Frontend**: Vite 6, React 19, TypeScript (strict), Tailwind CSS v4, Zustand
- **3D & Art**: Imperative Three.js (`src/scene/`) + illustrated PNG player cards, SVG flags and shared painted 2.5D rigs (`src/art/`)
- **Audio**: Procedural Web Audio API (`src/audio/`)
- **Testing (Strict TDD)**: Vitest, React Testing Library, jsdom, Playwright (Desktop & Android Pixel 7)
- **Offline & Mobile**: `vite-plugin-pwa` (Workbox Service Worker + Android adaptive/maskable icons) + local-only IndexedDB persistence

---

## Contributing & License

Contributions of all kinds are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and pick any `READY` ticket from [docs/TASKS.md](./docs/TASKS.md).

Released under the [MIT License](./LICENSE).
