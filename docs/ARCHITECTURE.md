# Mini Baseball Manager — Canonical Architecture & Domain Contracts

> **Purpose**: Single source of truth for TypeScript interfaces, event streams, and storage schemas across `src/engine/`, `src/scene/`, `src/store/`, and `src/ui/`. Any AI agent building a new feature MUST align with these contracts so parallel slices integrate seamlessly.

---

## 1. Strict Dependency Direction

```mermaid
flowchart LR
    UI["src/ui/** (React + Tailwind)"] --> Store["src/store/** (Zustand + IndexedDB)"]
    UI --> Art["src/art/** (SVG Portraits, 2.5D Chibi Rigs, Flags)"]
    UI --> Scene["src/scene/** (Three.js Ballpark + Playback)"]
    UI --> Audio["src/audio/** (Web Audio Synth)"]
    Store --> Engine["src/engine/** (Pure TypeScript Domain Engine)"]
    Scene -->|"Consumes PlayEvent[] & Pure Math"| Engine
    Scene --> Art
    Art --> Engine
```

- **Rule**: `src/engine/**` NEVER imports from `src/ui/**`, `src/scene/**`, `src/store/**`, `src/audio/**`, or browser globals (`window`, `document`, `indexedDB`).
- **Rule**: `src/engine/**` only imports pure types/modules inside `src/engine/**` (exception: `BallVfxStyle` type-only import if kept pure; prefer defining `BallFlightStyle` inside `src/engine/models/` and re-exporting in `src/scene/vfx/`).

---

## 2. Core Domain Interfaces (`src/engine/models/`)

### 2.1 Player & RPG Profile (`src/engine/models/player.ts`)

```ts
import type { PortraitTraits, CardRarity } from '../../art/portraits/types';
import type { BatsHand, FieldPosition, ThrowsHand } from '../handedness/types';
import type { NationalityId } from '../nationalities/types';

export type PersonalityArchetype =
  | 'prankster'
  | 'clutch_captain'
  | 'quiet_assassin'
  | 'showboat'
  | 'gym_rat'
  | 'superstitious'
  | 'rival_hunter';

export type FormState = 'blazing' | 'hot' | 'neutral' | 'cold' | 'frozen';

export type PlayerSpecialistArchetype =
  | 'balanced_regular'
  | 'contact_technician'   // High contact/eye hitter specialist, modest power/glove
  | 'power_slugger'        // Elite HR/RBI bat specialist, slower speed & weaker defense
  | 'defensive_wizard'     // Elite glove/arm/range specialist, lighter bat
  | 'speed_smallball'      // Blazing speed, bunt & steal specialist
  | 'super_utility'        // Multi-position glue specialist
  | 'flame_closer'         // High-velocity/K short-stamina relief specialist
  | 'crafty_tactician'     // Pinpoint control/movement pitcher specialist
  | 'southpaw_specialist'  // Situational matchup specialist
  | 'workhorse_ace';       // High-stamina starter

export type PositionalFlexibilityProfile =
  | 'single_position'      // e.g., strictly 1B-only or C-only
  | 'middle_infield_pair'  // SS + 2B only
  | 'corner_infield_pair'  // 1B + 3B only
  | 'infield_utility'      // Any infield spot (1B, 2B, 3B, SS)
  | 'corner_outfield_pair' // LF + RF only
  | 'all_outfield'         // LF + CF + RF
  | 'catcher_first'        // C + 1B
  | 'swingman_pitcher';    // SP + RP

export type PlayerMarketTier =
  | 'rookie'         // Young (18-21), cheap, high XP growth (1.35x), variable max statCaps
  | 'all_star'       // Rare, elite peak ratings + fan draw, very expensive contracts
  | 'veteran'        // Older (31-38), solid quality now at affordable pay, minimal growth (0.30x XP)
  | 'above_average'  // Strong reliable starter, starter-level pay, moderate upside
  | 'average'        // Fair-salaried everyday regular, balanced tools
  | 'below_average'; // League-minimum depth, often carries 1 sharp specialist tool

export interface PlayerRatings {
  // Batting (1–99)
  contact: number;
  power: number;
  eye: number;
  bunt: number;
  // Pitching (1–99)
  velocity: number;
  movement: number;
  control: number;
  stamina: number;
  // Athleticism & Intangibles (1–99)
  speed: number;
  fielding: number;
  arm: number;
  clutch: number;
  popularity: number;
  potential: number;
}

export interface PlayerContract {
  salaryPerSeason: number;
  yearsRemaining: number;
  signingBonus: number;
  noTradeClause?: boolean;
}

export interface PlayerSeasonStats {
  games: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  inningsPitchedOuts: number; // stored in outs (e.g. 21 outs = 7.0 IP) to avoid float error
  earnedRuns: number;
  pitchingStrikeouts: number;
  pitchingWalks: number;
  wins: number;
  losses: number;
  saves: number;
  errors: number;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  age: number;
  position: FieldPosition;
  secondaryPositions: FieldPosition[];
  bats: BatsHand;
  throws: ThrowsHand;
  jerseyNumber: number;
  nationalityId: NationalityId;
  hometown: string;
  personality: PersonalityArchetype;
  rarity: CardRarity;
  traits: PortraitTraits;
  bio: string;

  // RPG Progression
  level: number;
  xp: number;
  skillPoints: number;
  unlockedSkillIds: string[];
  equippedPowerIds: string[]; // max 2 (3 at Legend LV >= 12)
  equippedRelicIds: string[]; // max 2 90s Gear Relics
  heritageTierUnlocked: 0 | 1 | 2 | 3;

  // Live Status & Form
  marketTier: PlayerMarketTier;
  specialistArchetype: PlayerSpecialistArchetype;
  flexibilityProfile: PositionalFlexibilityProfile;
  favoritePosition: FieldPosition; // Playing favorite position awards +5 Fielding/+4 Control, +3 Clutch, +5 Morale
  positionProficiency: Partial<Record<FieldPosition, number>>; // 0..100; < 50 triggers Out-of-Position penalty
  ratings: PlayerRatings;
  statCaps: PlayerRatings; // Per-tool max rating ceilings (1..99), widest variance on rookies
  xpGrowthMultiplier: number; // 1.35 (rookie) .. 0.30 (veteran)
  fatigue: number; // 0 (fresh) .. 100 (exhausted)
  morale: number; // 0 .. 100
  formScore: number; // -100 (frozen slump) .. +100 (blazing hot streak)
  formState: FormState;

  // Club & History
  contract: PlayerContract;
  formerClubIds: string[]; // enables poached-player Revenge Matchups!
  seasonStats: PlayerSeasonStats;
  careerStats: PlayerSeasonStats;
  awards: string[];
}
```

#### 2.1.1 Market Tier Pros/Cons & Positional Cross-Training Rules

| Market Tier | Age Band | Cost / Salary | XP Growth | Max `statCaps` / Upside | Strategic Role |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **`rookie`** | 18–21 | Very cheap rookie deal | `1.35x` | **Wild variance** (boom-or-bust ceilings) | Draft & farm gems to develop |
| **`all_star`** | 24–29 | Rare & very expensive | `0.85x` | Peak 85–99 tools + popularity surge | Franchise centerpiece if affordable |
| **`veteran`** | 31–38 | Affordable short-term pay | `0.30x` | Minimal room to improve (at cap) | Plug-and-play quality + mentorship |
| **`above_average`** | 23–29 | Solid starter salary | `0.95x` | Good-to-strong 72–86 ceilings | Core everyday starters |
| **`average`** | 22–30 | Balanced middle pay | `0.85x` | 64–76 steady ceilings | Dependable rotation & lineup fillers |
| **`below_average`** | 20–32 | League minimum bargain | `0.75x` | Low overall floor, often **1 sharp specialist tool** | Late-inning glove, speed, or matchup role player |

- **Favorite Position & Out-of-Position Rules**: Deploying a player at `favoritePosition` grants **Favorite Position Boost** (`+5 Fielding` or `+4 Control` on mound, `+3 Clutch`, `+5 Morale`). Deploying them at a listed position with proficiency `>= 50` plays cleanly at normal rating. Deploying them below `50` or unlisted triggers Out-of-Position fielding/error penalties.
- **Cross-Training Trade-Off**: Training a new eligible position consumes a Practice turn (opportunity cost vs batting/pitching/slump drills), increases `positionProficiency[targetPos]` by `+12..+20`, and applies **`-4..-8` positional rust decay** to other secondary/current positions until sharpened again. Reaching `95+` mastery unlocks shifting `favoritePosition` to the newly mastered position.

### 2.2 Club, Lineup & Stadium District (`src/engine/models/club.ts`)

```ts
export type LeagueTierId = 'rookie' | 'low_a' | 'high_a' | 'aa' | 'aaa' | 'majors';

export type AiArchetype =
  | 'mashers'
  | 'speed_demons'
  | 'ace_factory'
  | 'defense_first'
  | 'moneyball';

export interface LineupSlot {
  orderIndex: number; // 0..8
  playerId: string;
  defensivePosition: Exclude<FieldPosition, 'SP' | 'RP'> | 'DH';
}

export interface ClubColors {
  primary: string;
  secondary: string;
  accent: string;
  monogram: string;
}

export interface DistrictTile {
  slotId: string; // e.g., 'north-1', 'east-2'
  buildingId: string | null; // e.g., 'nacho_cantina', 'pitching_lab', 'bobblehead_shop'
  tier: 1 | 2 | 3;
}

export interface StadiumState {
  name: string;
  seatingTier: 1 | 2 | 3 | 4; // Bleachers -> Grandstand -> Double-Deck -> Mega Dome
  capacity: number;
  hasJumbotron: boolean;
  hasNightLights: boolean;
  hasMascotCannon: boolean;
  themeId: string;
  retiredNumbers: { jerseyNumber: number; playerName: string }[];
  championshipPennants: { season: number; leagueTier: LeagueTierId }[];
  districtTiles: DistrictTile[];
}

export interface ClubEconomy {
  cash: number;
  fanBase: number;
  teamHype: number; // 0..100
  ticketPrice: number;
  concessionPrice: number;
  concessionQuality: 1 | 2 | 3;
  scoutingBudget: number;
  tvContractId: string | null;
  activeSponsorIds: string[];
}

export const MAX_ACTIVE_ROSTER_SIZE = 20; // Hard cap for draft/FA signings & trades (clubs start at 18)
export const MIN_ACTIVE_ROSTER_SIZE = 15;
export const MAX_ACADEMY_ROSTER_SIZE = 6;

export interface Club {
  id: string;
  isHuman: boolean;
  city: string;
  name: string;
  mascot: string;
  colors: ClubColors;
  leagueTier: LeagueTierId;
  aiArchetype: AiArchetype;
  roster: Player[];
  academyProspects: Player[]; // up to 6 youth farm players
  lineup: LineupSlot[]; // 9 slots
  rotationIds: string[]; // 3–5 starting pitchers
  bullpenIds: string[];
  rotationCursor: number;
  coaches: CoachStaffState;
  stadium: StadiumState;
  economy: ClubEconomy;
  wins: number;
  losses: number;
  streak: number; // +N win streak, -N losing streak
}
```

### 2.3 Simulation Event Stream Contract (`src/engine/models/playEvent.ts`)

The simulation engine (`src/engine/simulation/`) emits pure `PlayEvent` objects. The 3D Scene Playback Controller (`src/scene/playback/`) consumes them to animate pitches, swings, all 9 fielders, baserunners, VFX, comic callouts, and audio cues!

```ts
export type PlayEventType =
  | 'game_start'
  | 'inning_start'
  | 'at_bat_start'
  | 'manager_power_used'
  | 'pitch_thrown'
  | 'ball_in_play'
  | 'stolen_base_attempt'
  | 'pitching_change'
  | 'inning_end'
  | 'game_end';

export type AtBatOutcome =
  | 'ball'
  | 'called_strike'
  | 'swinging_strike'
  | 'foul'
  | 'walk'
  | 'strikeout'
  | 'single'
  | 'double'
  | 'triple'
  | 'home_run'
  | 'ground_out'
  | 'fly_out'
  | 'line_out'
  | 'double_play'
  | 'sac_fly'
  | 'fielding_error'
  | 'bunt_single'
  | 'bunt_out';

export interface PlayEvent {
  seq: number;
  type: PlayEventType;
  inning: number;
  half: 'TOP' | 'BOT';
  outsBefore: number;
  outsAfter: number;
  balls: number;
  strikes: number;
  awayScore: number;
  homeScore: number;
  basesAfter: [string | null, string | null, string | null]; // 1B, 2B, 3B runner IDs
  batterId?: string;
  pitcherId?: string;
  outcome?: AtBatOutcome;
  isClutchMoment: boolean; // Triggers Clutch Cam zoom-in!
  isRivalrySpark?: boolean;
  specialPowerTriggered?: {
    actor: 'pitcher' | 'batter' | 'fielder' | 'manager';
    powerId: string;
    calloutText: string;
    vfxColor: string;
  };
  ballFlight?: {
    style: BallVfxStyle;
    landingX: number;
    landingZ: number;
    apexY: number;
    durationSec: number;
  };
  fieldingHighlight?: {
    fielderId: string;
    fielderPos: FieldPosition;
    anim: 'field_run' | 'field_dive' | 'field_high_jump';
  };
  commentary: string;
  soundCue?: SoundCue;
  xpAwards?: { playerId: string; xp: number }[];
}
```

### 2.4 Local Persistence Schema (`src/store/persistence.ts`)

```ts
export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export interface SaveSlotMetadata {
  slotId: 'slot-1' | 'slot-2' | 'slot-3';
  clubName: string;
  leagueTier: LeagueTierId;
  seasonNumber: number;
  recordLabel: string; // e.g., "14-7"
  updatedAtIso: string;
  schemaVersion: number;
}

export interface SaveFileV1 {
  schemaVersion: 1;
  savedAtIso: string;
  worldSeed: number;
  seasonNumber: number;
  currentSeriesIndex: number;
  humanClubId: string;
  manager: ManagerProfile;
  leagues: Record<LeagueTierId, Club[]>;
  rivalries: RivalryRecord[];
  trophies: TrophyRecord[];
  newspaperArchive: NewspaperIssue[];
  unlockedCosmeticIds: string[];
  settings: {
    muted: boolean;
    volume: number;
    defaultGameSpeed: 1 | 2 | 4;
    defaultWatchMode: 'live' | 'clutch' | 'sim';
    reducedMotion: boolean;
    hapticsEnabled: boolean;
  };
}
```

---

## 3. 3D World Coordinate Reference (`src/scene/`)

| Landmark | World `(x, y, z)` | Notes |
| :--- | :--- | :--- |
| Home Plate | `(0, 0, 0)` | Catcher at `(0, 0.04, 1.75)` facing `-Z` |
| Right-Handed Batter's Box | `(-0.95, 0.04, 0.15)` | 3rd-base side (`-X`) |
| Left-Handed Batter's Box | `(+0.95, 0.04, 0.15)` | 1st-base side (`+X`) |
| Pitcher's Mound | `(0, 0.24, -10.2)` | Pitcher faces `+Z` (`logicalYaw = 0`) |
| 1st Base | `(+9.8, 0, -9.8)` | 1B defender near `(8.8, 0.04, -11.4)` |
| 2nd Base | `(0, 0, -19.6)` | 2B `(4.6, 0.04, -17.6)`, SS `(-4.6, 0.04, -17.6)` |
| 3rd Base | `(-9.8, 0, -9.8)` | 3B defender near `(-8.8, 0.04, -11.4)` |
| Outfielders | `LF (-15, 0.04, -27)`, `CF (0, 0.04, -32)`, `RF (+15, 0.04, -27)` | Facing `+Z` toward home plate |
| Outfield Wall Arc | Radius `40` centered at `(0, 0, -3)` | Scoreboard at `(0, 7.6, -44.2)` |
| Behind-Home Grandstand | `z = 9.2..15.2` | Visible behind catcher in Pitcher OTS 3D |
