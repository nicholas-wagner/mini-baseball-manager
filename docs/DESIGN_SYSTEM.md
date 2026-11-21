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
- **Chibi Mini Player Height**: `~1.65` units tall:
  - Oversized head sphere/egg: `r = 0.42` (~45% of visual silhouette!) with live 256×256 canvas facial texture.
  - Rounded capsule jersey torso: height `0.55`, radius `0.28`, team color + stripe + jersey number decal.
  - Buoyant floating gloved hands & cleated stubby feet (allows snappy cartoon swings, diving stretches, and spring jumps).
  - Cel shading via 3-band nearest-neighbor `DataTexture` on `MeshToonMaterial` + inverted-hull outline (`THREE.BackSide`, `#181B2C`, scale `1.06`).
- **Over-the-Shoulder 3D Camera Presets**:
  - `behind_pitcher`: Positioned behind pitcher's throwing shoulder looking down the lane toward home plate (`pos ≈ [1.8, 3.0, -14.2]`, `lookAt ≈ [0, 1.1, 2.0]`).
  - `behind_batter`: Positioned behind catcher/batter's shoulder looking out at the pitcher (`pos ≈ [-1.5, 2.5, 5.8]`, `lookAt ≈ [0, 1.3, -10.5]`).
  - `broadcast_follow`: Spring-damped dynamic arc tracking the ball in play.
  - `showcase_closeup`: Turntable hero view for Design Lab & Player Inspection.
  - `practice_diorama`: Angled miniature cage/bullpen vignette view.
