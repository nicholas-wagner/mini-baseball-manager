# Mini Baseball Manager — Design System Spec

> **Aesthetic Direction**: 90s Saturday-Morning Cartoon + Classic Baseball Cards (*Backyard Baseball* × *Upper Deck* × *Power Pros* toon-shaded chibi 3D).

---

## 1. Color Tokens

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-cardstock` | `#FBF4E4` | Primary card & modal surfaces |
| `--color-cardstock-deep` | `#F1E4C8` | Secondary panels, inset stat strips |
| `--color-ink` | `#181B2C` | Borders (`2.5px`–`3px`), comic drop shadows, primary text |
| `--color-ink-muted` | `#4A5068` | Captions, secondary labels |
| `--color-turf` | `#2FB356` | Primary grass, confirm actions, ballpark base |
| `--color-turf-stripe` | `#279E4B` | Mowed grass alternating bands |
| `--color-dirt` | `#D98A4E` | Infield clay, warning track, warm accents |
| `--color-sky` | `#4CC3FF` | Ballpark sky, info tags |
| `--color-scoreboard` | `#1B4332` | Scoreboard chrome, header banners, PWA theme color |
| `--color-led-amber` | `#FFD166` | Scoreboard digits, inning indicators |
| `--color-coral` | `#FF4D6D` | Power-ups, rival warnings, hot streaks, alerts |
| `--color-gold` | `#FFC300` | Stars, trophies, MVP badges, Skill Points |
| `--color-cyan` | `#00E5FF` | Super-power energy, hyper highlights |
| `--color-violet` | `#9B5DE5` | Rare / Mystic / Knuckleball VFX & Epic frames |

---

## 2. Typography (100% Offline Bundled)

- **Display / Headers (`--font-display`)**: `Bungee`, `Fredoka`, sans-serif — bold athletic pennant & comic card headers.
- **Friendly Rounded Titles (`--font-heading`)**: `Fredoka`, sans-serif — subheadings, player names, buttons, skill nodes.
- **UI Body (`--font-body`)**: `Nunito`, sans-serif — clear readability on mobile screens.
- **Scoreboard / Stats (`--font-mono`)**: `JetBrains Mono`, monospace with `font-variant-numeric: tabular-nums` — aligned box scores, salaries, ratings.

---

## 3. Tactile 90s Surfaces & Borders

- **Comic Border**: `3px solid var(--color-ink)` (2.5px on compact chips).
- **Hard Offset Shadow**: `4px 4px 0 var(--color-ink)` for cards & primary buttons; active press translates `(2px, 2px)` and shrinks shadow to `2px 2px 0` for juicy arcade click feedback.
- **Halftone Backdrop Pattern**: Subtle radial-gradient dot grid (`rgba(24, 27, 44, 0.06)`) behind cards and splash screens.
- **Rarity Card Frames**:
  - `rookie`: Classic cardstock cream + bold team header stripe.
  - `allstar`: Metallic cool chrome gradient bezel + star accents.
  - `mvp`: Animated rainbow holographic foil sheen (`linear-gradient` shimmer) + gold badge.

---

## 4. Responsive Layout & Touch Ergonomics

- **Mobile Portrait (`< 768px`)**: Bottom fixed navigation bar (5 tabs, `>= 48px` tap targets, respects `env(safe-area-inset-bottom)`), compact top scoreboard strip, single-column swipeable card grids.
- **Mobile Landscape (3D Games)**: Ballpark viewport maximizes to ~72% width with sleek right-hand tactical dock & Manager Power buttons.
- **Desktop (`>= 768px`)**: Left club sidebar (`240px`), top club status bar (Club Name, Record, Cash, Hype, Audio toggle), multi-column spacious workspaces.

---

## 5. Chibi 3D Character & Ballpark Scale Units

- **World Scale**: `1 Three.js unit = 1 meter` (compressed stylized miniature ballpark for tight, exciting framing!).
  - Basepath distance: `14` units (stylized mini diamond — feels snappy and keeps all fielders readable on phone screens!).
  - Pitcher's mound: `(0, 0.25, -9.8)` facing Home Plate at `(0, 0, 0)`.
  - Outfield wall arc radius: `~46` units (left/right corners `38`, center `48`).
- Live mini players use shared painted body cels, a registered head and player-specific details. Align the mitt, bat and ball with the painted grip in both camera directions. Idle mannerisms rotate around that grip.
- Use the player's catalog ID for card art in every club. Show the full 4:5 illustration on card fronts. Keep enlargement keyboard-accessible and preserve the original aspect ratio.
- Give the opening hitter one objective. Show the chosen pitch target or rehearsal on the field before the manager commits. Keep the advanced dugout one tap away. During a routine pitch hold the camera through reception. Show the runner and first baseman in one frame for the force.
- Show the count change on the catch and the base highlight on the play. Keep the named Opening Day action and the postgame next action within a 390×844 viewport. Reserve at least 44px for pitch calls and camera controls.
- **Over-the-Shoulder 3D Camera Presets**:
  - `behind_pitcher`: Positioned behind pitcher's throwing shoulder looking down the lane toward home plate (`pos ≈ [1.8, 3.0, -14.2]`, `lookAt ≈ [0, 1.1, 2.0]`).
  - `behind_batter`: Positioned behind catcher/batter's shoulder looking out at the pitcher (`pos ≈ [-1.5, 2.5, 5.8]`, `lookAt ≈ [0, 1.3, -10.5]`).
  - `broadcast_follow`: Spring-damped dynamic arc tracking the ball in play.
  - `showcase_closeup`: Turntable hero view for Design Lab & Player Inspection.
  - `practice_diorama`: Angled miniature cage/bullpen vignette view.

### Opening Day rally

Keep the result with the player who made the play until the manager advances. The result panel pairs their illustration with the official call and a short description of the runners. Give **Next batter** the gold primary button and **Watch again** a secondary action. Keep the two swing choices or three pitch targets in the same spot through the half-inning.

For a force at first, let the manager see the mitt, the bag, the batter running through and the umpire in the same shot. A held runner takes a secondary lead. On a gap hit the camera can leave the retrieved ball to follow a runner into third or home. Use the runner’s actual base and destination for the cut.

In the guided half, put the manager’s club first on the compact scoreboard. Show both scores, the occupied bases, inning, outs and count. Tapping the board reveals the line score. During live play, career tabs move into Dugout. Keep the score, field and primary action together at 360×640, 390×844 and 844×390. Use the same thumb position for the first call and the next batter. During the featured player’s entrance, leave every pitch and swing choice available. A fixed camera or reduced-motion preference takes precedence over the introductory shot.

The first screen offers the actual featured player and the stakes, with the club and mascot alongside **Change club**. Use one short scouting clue on portrait phones. Matchup opens the full scouting detail, and Options opens timing and special powers. Choosing **Contact** or **Power** holds the corresponding grip and stance until **Swing**. At first base, hold the umpire’s signal with the runner still short of the bag. The mascot peeks and the glove pop marks the catch. Use the result card to explain the runners and credit a defensive out to the recorded fielder or strikeout pitcher.

Run the first-use playtest with a younger newcomer, a teen who enjoys characters, and a longtime baseball fan. Give each person a muted 360×640 phone, open the first card, and say “Play one at-bat.” Record the time to their first deliberate swing or pitch, any scrolling or requests for help, and whether they choose the next batter on their own. Aim for a first call within 15 seconds. After the play, ask “What happened?” and “Which player do you remember?” Ask the fan where they would look for the matchup details, and ask a returning player to find their saved print.
