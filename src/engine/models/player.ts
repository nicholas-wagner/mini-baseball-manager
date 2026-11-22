import type { FieldPosition, BatsHand, ThrowsHand } from '../handedness/types';
import type { NationalityId } from '../nationalities/types';
import type { SeededRng } from '../rng/seededRng';

export type CardRarity = 'rookie' | 'allstar' | 'mvp';

export type HeadShape = 'round' | 'oval' | 'square' | 'chubby' | 'heart';

export type HairStyle =
  | 'spiky90s'
  | 'flattop'
  | 'mullet'
  | 'pigtails'
  | 'afro'
  | 'pompadour'
  | 'sideSweep'
  | 'curlyTop'
  | 'bob'
  | 'mohawk';

export type CapStyle = 'forward' | 'backwards' | 'visor' | 'none';

export type EyeStyle = 'bright' | 'determined' | 'starry' | 'chill' | 'wide' | 'wink';

export type MouthStyle = 'bigGrin' | 'smirk' | 'bubblegum' | 'tongueOut' | 'openLaugh' | 'focused';

export type AccessoryStyle =
  | 'none'
  | 'shades90s'
  | 'eyeBlack'
  | 'cheekBandage'
  | 'freckles'
  | 'handlebarStache'
  | 'headband'
  | 'starEarrings';

export type BackdropStyle = 'starburst' | 'stripes' | 'halftone' | 'lightning' | 'stadium';

export interface PlayerPortraitTraits {
  seed: number;
  headShape: HeadShape;
  skinTone: string;
  skinShadow: string;
  skinHighlight: string;
  irisColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  hairHighlight: string;
  capStyle: CapStyle;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  accessory: AccessoryStyle;
  backdropStyle: BackdropStyle;
}

export type PortraitTraits = PlayerPortraitTraits;

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
  | 'contact_technician'
  | 'power_slugger'
  | 'defensive_wizard'
  | 'speed_smallball'
  | 'super_utility'
  | 'flame_closer'
  | 'crafty_tactician'
  | 'southpaw_specialist'
  | 'workhorse_ace';

export type PositionalFlexibilityProfile =
  | 'single_position'
  | 'middle_infield_pair'
  | 'corner_infield_pair'
  | 'infield_utility'
  | 'corner_outfield_pair'
  | 'all_outfield'
  | 'catcher_first'
  | 'swingman_pitcher';

export type PlayerMarketTier =
  | 'rookie'
  | 'all_star'
  | 'veteran'
  | 'above_average'
  | 'average'
  | 'below_average';

export const SPECIALIST_LABELS: Readonly<Record<PlayerSpecialistArchetype, string>> = {
  balanced_regular: 'Balanced Regular',
  contact_technician: 'Contact Technician',
  power_slugger: 'Power Slugger',
  defensive_wizard: 'Defensive Wizard',
  speed_smallball: 'Speed / Smallball',
  super_utility: 'Super-Utility',
  flame_closer: 'Flame Closer',
  crafty_tactician: 'Crafty Tactician',
  southpaw_specialist: 'Matchup Specialist',
  workhorse_ace: 'Workhorse Ace',
};

export const MARKET_TIER_LABELS: Readonly<Record<PlayerMarketTier, string>> = {
  rookie: 'ROOKIE',
  all_star: 'ALL-STAR',
  veteran: 'VETERAN',
  above_average: 'ABOVE AVG',
  average: 'AVERAGE',
  below_average: 'BARGAIN',
};

export interface PlayerRatings {
  // Batting (1-99)
  contact: number;
  power: number;
  eye: number;
  bunt: number;
  // Pitching (1-99)
  velocity: number;
  movement: number;
  control: number;
  stamina: number;
  // Athleticism & Intangibles (1-99)
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
  inningsPitchedOuts: number;
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
  traits: PlayerPortraitTraits;
  bio: string;

  // RPG Progression
  level: number;
  xp: number;
  skillPoints: number;
  unlockedSkillIds: string[];
  equippedPowerIds: string[];
  equippedRelicIds: string[];
  heritageTierUnlocked: 0 | 1 | 2 | 3;

  // Live Status & Form
  marketTier: PlayerMarketTier;
  specialistArchetype: PlayerSpecialistArchetype;
  flexibilityProfile: PositionalFlexibilityProfile;
  favoritePosition: FieldPosition;
  positionProficiency: Partial<Record<FieldPosition, number>>;
  ratings: PlayerRatings;
  statCaps: PlayerRatings;
  xpGrowthMultiplier: number;
  fatigue: number;
  morale: number;
  formScore: number;
  formState: FormState;

  // Club & History
  contract: PlayerContract;
  formerClubIds: string[];
  seasonStats: PlayerSeasonStats;
  careerStats: PlayerSeasonStats;
  awards: string[];
}

const SKIN_TONES: readonly { base: string; shadow: string; highlight: string }[] = [
  { base: '#FFE0C4', shadow: '#D9A782', highlight: '#FFF3E6' },
  { base: '#FAD0A8', shadow: '#CF9568', highlight: '#FFE8D1' },
  { base: '#F0B888', shadow: '#C28252', highlight: '#FFD6B0' },
  { base: '#D99968', shadow: '#A8693C', highlight: '#F2BA8D' },
  { base: '#B87648', shadow: '#874D27', highlight: '#D69669' },
  { base: '#8F5734', shadow: '#613419', highlight: '#B0754F' },
  { base: '#6A3E25', shadow: '#422210', highlight: '#8C593B' },
  { base: '#FFE7D1', shadow: '#DEB18E', highlight: '#FFF7F0' },
];

const HAIR_PALETTES: readonly { base: string; highlight: string }[] = [
  { base: '#1E1B28', highlight: '#4C4666' },
  { base: '#4A2B18', highlight: '#825235' },
  { base: '#8C461E', highlight: '#C9723E' },
  { base: '#D9821E', highlight: '#FFB84D' },
  { base: '#E8BE38', highlight: '#FFF099' },
  { base: '#C93022', highlight: '#FF6B57' },
  { base: '#23499D', highlight: '#5B8CFF' },
  { base: '#6D32A8', highlight: '#B37BFF' },
  { base: '#4E5B6E', highlight: '#8FA2BD' },
];

const IRIS_COLORS = [
  '#3B2314',
  '#1D63B8',
  '#258A4E',
  '#8C5822',
  '#6A359C',
  '#293242',
] as const;

const HEAD_SHAPES: readonly HeadShape[] = ['round', 'oval', 'square', 'chubby', 'heart'];
const HAIR_STYLES: readonly HairStyle[] = [
  'spiky90s',
  'flattop',
  'mullet',
  'pigtails',
  'afro',
  'pompadour',
  'sideSweep',
  'curlyTop',
  'bob',
  'mohawk',
];
const CAP_STYLES: readonly CapStyle[] = ['forward', 'forward', 'forward', 'backwards', 'visor', 'none'];
const EYE_STYLES: readonly EyeStyle[] = ['bright', 'determined', 'starry', 'chill', 'wide', 'wink'];
const MOUTH_STYLES: readonly MouthStyle[] = [
  'bigGrin',
  'smirk',
  'bubblegum',
  'tongueOut',
  'openLaugh',
  'focused',
];
const ACCESSORIES: readonly AccessoryStyle[] = [
  'none',
  'shades90s',
  'eyeBlack',
  'cheekBandage',
  'freckles',
  'handlebarStache',
  'headband',
  'starEarrings',
];
const BACKDROPS: readonly BackdropStyle[] = ['starburst', 'stripes', 'halftone', 'lightning', 'stadium'];

/** Deterministically rolls 90s cartoon appearance traits using a SeededRng. */
export function rollPlayerPortraitTraits(rng: SeededRng, seed: number): PlayerPortraitTraits {
  const skin = rng.pick(SKIN_TONES);
  const hair = rng.pick(HAIR_PALETTES);

  return {
    seed,
    headShape: rng.pick(HEAD_SHAPES),
    skinTone: skin.base,
    skinShadow: skin.shadow,
    skinHighlight: skin.highlight,
    irisColor: rng.pick(IRIS_COLORS),
    hairStyle: rng.pick(HAIR_STYLES),
    hairColor: hair.base,
    hairHighlight: hair.highlight,
    capStyle: rng.pick(CAP_STYLES),
    eyeStyle: rng.pick(EYE_STYLES),
    mouthStyle: rng.pick(MOUTH_STYLES),
    accessory: rng.pick(ACCESSORIES),
    backdropStyle: rng.pick(BACKDROPS),
  };
}

/** Creates a zero-initialized season or career stat line. */
export function createEmptySeasonStats(): PlayerSeasonStats {
  return {
    games: 0,
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbis: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    inningsPitchedOuts: 0,
    earnedRuns: 0,
    pitchingStrikeouts: 0,
    pitchingWalks: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    errors: 0,
  };
}

export function isPitcherPosition(position: FieldPosition): boolean {
  return position === 'SP' || position === 'RP';
}

function clampRating(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function computeStarterOverall(ratings: PlayerRatings): number {
  return (
    ratings.velocity * 0.3 +
    ratings.movement * 0.28 +
    ratings.control * 0.24 +
    ratings.stamina * 0.12 +
    ratings.clutch * 0.06
  );
}

function computeRelieverOverall(ratings: PlayerRatings): number {
  return (
    ratings.velocity * 0.34 +
    ratings.movement * 0.32 +
    ratings.control * 0.22 +
    ratings.clutch * 0.12
  );
}

function computeHitterOverall(ratings: PlayerRatings): number {
  return (
    ratings.contact * 0.28 +
    ratings.power * 0.26 +
    ratings.eye * 0.14 +
    ratings.speed * 0.14 +
    ratings.fielding * 0.12 +
    ratings.clutch * 0.06
  );
}

/** Computes a balanced 1-99 OVR score weighted by pitcher vs position role. */
export function computePlayerOverall(player: Pick<Player, 'position' | 'ratings'>): number {
  const { position, ratings } = player;
  if (position === 'SP') return clampRating(computeStarterOverall(ratings));
  if (position === 'RP') return clampRating(computeRelieverOverall(ratings));
  return clampRating(computeHitterOverall(ratings));
}

/** Maps a 1-99 OVR score onto the 3 collectible card rarity tiers. */
export function deriveCardRarity(overall: number): CardRarity {
  if (overall >= 86) return 'mvp';
  if (overall >= 74) return 'allstar';
  return 'rookie';
}
