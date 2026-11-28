import type { FieldPosition, ThrowsHand } from '../handedness/types';
import type { DefensiveLineupPosition } from '../models/club';
import {
  isPitcherPosition,
  type Player,
  type PlayerMarketTier,
  type PlayerRatings,
  type PlayerSpecialistArchetype,
  type PositionalFlexibilityProfile,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';

const HITTER_SPECIALISTS: readonly PlayerSpecialistArchetype[] = [
  'balanced_regular',
  'balanced_regular',
  'contact_technician',
  'power_slugger',
  'defensive_wizard',
  'speed_smallball',
  'super_utility',
];

const PITCHER_SPECIALISTS: readonly PlayerSpecialistArchetype[] = [
  'balanced_regular',
  'balanced_regular',
  'flame_closer',
  'crafty_tactician',
  'southpaw_specialist',
  'workhorse_ace',
];

const SPECIALIST_SHAPES: Readonly<Record<PlayerSpecialistArchetype, Partial<PlayerRatings>>> = {
  balanced_regular: {},
  contact_technician: { contact: 10, eye: 8, bunt: 8, power: -6 },
  power_slugger: { power: 13, contact: -3, fielding: -8, speed: -9 },
  defensive_wizard: { fielding: 14, arm: 12, speed: 5, power: -9 },
  speed_smallball: { speed: 15, bunt: 12, contact: 5, power: -10 },
  super_utility: { fielding: 6, speed: 5, contact: 3 },
  flame_closer: { velocity: 12, movement: 6, stamina: -18, control: -4 },
  crafty_tactician: { control: 12, movement: 8, velocity: -6 },
  southpaw_specialist: { movement: 10, control: 7, stamina: -14 },
  workhorse_ace: { stamina: 16, control: 5, velocity: 3 },
};

const MIDDLE_INF_ONLY_LEFT_BLOCKED: ReadonlySet<FieldPosition> = new Set(['2B', '3B', 'SS']);

function clampStatValue(value: number): number {
  return Math.max(8, Math.min(99, Math.round(value)));
}

/** Rolls a role-appropriate specialist archetype; bargain players often carry 1 sharp tool. */
export function rollSpecialistArchetype(
  rng: SeededRng,
  position: FieldPosition,
  marketTier: PlayerMarketTier = 'average',
): PlayerSpecialistArchetype {
  const pool = isPitcherPosition(position) ? PITCHER_SPECIALISTS : HITTER_SPECIALISTS;
  if (marketTier === 'below_average' && rng.chance(0.85)) {
    const specialistsOnly = pool.filter((item) => item !== 'balanced_regular');
    return rng.pick(specialistsOnly);
  }
  return rng.pick(pool);
}

/** Shapes ratings asymmetrically so specialists feel distinct from balanced regulars. */
export function applySpecialistRatingShape(
  ratings: PlayerRatings,
  archetype: PlayerSpecialistArchetype,
  position: FieldPosition,
): PlayerRatings {
  const delta = SPECIALIST_SHAPES[archetype];
  const isPitcher = isPitcherPosition(position);
  const bump = (key: keyof PlayerRatings, base: number): number =>
    clampStatValue(base + (delta[key] ?? 0));

  return {
    contact: isPitcher ? ratings.contact : bump('contact', ratings.contact),
    power: isPitcher ? ratings.power : bump('power', ratings.power),
    gapPower: isPitcher ? ratings.gapPower : bump('power', ratings.gapPower),
    eye: isPitcher ? ratings.eye : bump('eye', ratings.eye),
    bunt: bump('bunt', ratings.bunt),
    velocity: isPitcher ? bump('velocity', ratings.velocity) : ratings.velocity,
    movement: isPitcher ? bump('movement', ratings.movement) : ratings.movement,
    control: isPitcher ? bump('control', ratings.control) : ratings.control,
    stamina: isPitcher ? bump('stamina', ratings.stamina) : ratings.stamina,
    speed: bump('speed', ratings.speed),
    fielding: bump('fielding', ratings.fielding),
    range: bump('fielding', ratings.range),
    arm: bump('arm', ratings.arm),
    clutch: bump('clutch', ratings.clutch),
    luck: ratings.luck,
    popularity: ratings.popularity,
    potential: ratings.potential,
  };
}

function evolvePitcherSpecialist(
  ratings: PlayerRatings,
  current: PlayerSpecialistArchetype,
): PlayerSpecialistArchetype {
  if (ratings.velocity >= 84 && ratings.stamina <= 65) return 'flame_closer';
  if (ratings.control >= 82 && ratings.movement >= 78) return 'crafty_tactician';
  if (ratings.stamina >= 86) return 'workhorse_ace';
  return current;
}

function evolveHitterSpecialist(
  ratings: PlayerRatings,
  current: PlayerSpecialistArchetype,
): PlayerSpecialistArchetype {
  if (ratings.fielding >= 82 && ratings.arm >= 78) return 'defensive_wizard';
  if (ratings.power >= 82 && ratings.power >= ratings.fielding + 10) return 'power_slugger';
  if (ratings.contact >= 82 && ratings.eye >= 76) return 'contact_technician';
  if (ratings.speed >= 85) return 'speed_smallball';
  return current;
}

/** Evolves a player into a sharper specialist archetype when primary tools cross 82+. */
export function evolveSpecialistArchetype(
  player: Pick<Player, 'position' | 'specialistArchetype' | 'ratings'>,
): PlayerSpecialistArchetype {
  if (isPitcherPosition(player.position)) {
    return evolvePitcherSpecialist(player.ratings, player.specialistArchetype);
  }
  return evolveHitterSpecialist(player.ratings, player.specialistArchetype);
}

interface FlexOption {
  profile: PositionalFlexibilityProfile;
  positions: readonly FieldPosition[];
}

const FLEX_TABLE: Readonly<Record<FieldPosition, readonly FlexOption[]>> = {
  SP: [
    { profile: 'swingman_pitcher', positions: ['SP', 'RP'] },
    { profile: 'single_position', positions: ['SP'] },
  ],
  RP: [
    { profile: 'swingman_pitcher', positions: ['RP', 'SP'] },
    { profile: 'single_position', positions: ['RP'] },
  ],
  C: [
    { profile: 'single_position', positions: ['C'] },
    { profile: 'catcher_first', positions: ['C', '1B'] },
  ],
  '1B': [
    { profile: 'single_position', positions: ['1B'] },
    { profile: 'corner_infield_pair', positions: ['1B', '3B'] },
  ],
  '2B': [
    { profile: 'middle_infield_pair', positions: ['2B', 'SS'] },
    { profile: 'infield_utility', positions: ['1B', '2B', '3B', 'SS'] },
  ],
  '3B': [
    { profile: 'corner_infield_pair', positions: ['3B', '1B'] },
    { profile: 'infield_utility', positions: ['1B', '2B', '3B', 'SS'] },
  ],
  SS: [
    { profile: 'middle_infield_pair', positions: ['SS', '2B'] },
    { profile: 'infield_utility', positions: ['1B', '2B', '3B', 'SS'] },
  ],
  LF: [
    { profile: 'corner_outfield_pair', positions: ['LF', 'RF'] },
    { profile: 'all_outfield', positions: ['LF', 'CF', 'RF'] },
  ],
  CF: [{ profile: 'all_outfield', positions: ['CF', 'LF', 'RF'] }],
  RF: [
    { profile: 'corner_outfield_pair', positions: ['RF', 'LF'] },
    { profile: 'all_outfield', positions: ['RF', 'LF', 'CF'] },
  ],
};

function selectFlexOption(
  rng: SeededRng,
  position: FieldPosition,
  archetype: PlayerSpecialistArchetype,
): FlexOption {
  const options = FLEX_TABLE[position];
  if (archetype === 'super_utility') {
    return options[options.length - 1];
  }
  return rng.pick(options);
}

/** Rolls natural positional eligibility, favorite position, and proficiency scores (0..100). */
export function rollPositionalEligibility(
  rng: SeededRng,
  position: FieldPosition,
  throwsHand: ThrowsHand,
  archetype: PlayerSpecialistArchetype,
): {
  flexibilityProfile: PositionalFlexibilityProfile;
  favoritePosition: FieldPosition;
  positionProficiency: Partial<Record<FieldPosition, number>>;
  secondaryPositions: FieldPosition[];
} {
  const chosen = selectFlexOption(rng, position, archetype);
  const filtered = chosen.positions.filter(
    (pos) => pos === position || !(throwsHand === 'L' && MIDDLE_INF_ONLY_LEFT_BLOCKED.has(pos)),
  );
  const effectiveProfile: PositionalFlexibilityProfile =
    filtered.length <= 1 ? 'single_position' : chosen.profile;

  const positionProficiency: Partial<Record<FieldPosition, number>> = {
    [position]: rng.int(88, 97),
  };
  const secondaryPositions: FieldPosition[] = [];
  for (const pos of filtered) {
    if (pos !== position) {
      positionProficiency[pos] = rng.int(64, 82);
      secondaryPositions.push(pos);
    }
  }

  return {
    flexibilityProfile: effectiveProfile,
    favoritePosition: position,
    positionProficiency,
    secondaryPositions,
  };
}

/** Returns all positions where a player maintains playable >= 50 mastery. */
export function getEligiblePositions(
  player: Pick<Player, 'positionProficiency'>,
): FieldPosition[] {
  return (Object.entries(player.positionProficiency) as [FieldPosition, number][])
    .filter(([, mastery]) => mastery >= 50)
    .sort((a, b) => b[1] - a[1])
    .map(([pos]) => pos);
}

export interface PositionAssignmentEval {
  isFavorite: boolean;
  isOutOfPosition: boolean;
  proficiency: number;
  fieldingDelta: number;
  controlDelta: number;
  clutchDelta: number;
  errorMultiplier: number;
}

/** Evaluates Favorite Position Boost (+5 FLD / +4 CTL / +3 CLU) or Out-of-Position rust/penalty. */
export function evaluatePositionAssignment(
  player: Pick<Player, 'position' | 'favoritePosition' | 'positionProficiency'>,
  assignedPosition: DefensiveLineupPosition | FieldPosition,
): PositionAssignmentEval {
  if (assignedPosition === 'DH') {
    return {
      isFavorite: false,
      isOutOfPosition: false,
      proficiency: 75,
      fieldingDelta: 0,
      controlDelta: 0,
      clutchDelta: 0,
      errorMultiplier: 1,
    };
  }

  const proficiency = player.positionProficiency[assignedPosition] ?? 20;
  const isFavorite = assignedPosition === player.favoritePosition;
  if (proficiency < 50) {
    return {
      isFavorite: false,
      isOutOfPosition: true,
      proficiency,
      fieldingDelta: -22,
      controlDelta: -8,
      clutchDelta: -5,
      errorMultiplier: 2.5,
    };
  }
  if (isFavorite) {
    return {
      isFavorite: true,
      isOutOfPosition: false,
      proficiency,
      fieldingDelta: 5,
      controlDelta: 4,
      clutchDelta: 3,
      errorMultiplier: 0.85,
    };
  }
  return {
    isFavorite: false,
    isOutOfPosition: false,
    proficiency,
    fieldingDelta: 0,
    controlDelta: 0,
    clutchDelta: 0,
    errorMultiplier: 1,
  };
}

export interface CrossTrainResult {
  trained: boolean;
  reason?: string;
  player: Player;
  deltaGain: number;
  rustApplied: number;
}

/**
 * Trains a player at a target position, sacrificing current focus and applying
 * -4..-8 positional rust decay to existing positions. Shifts favoritePosition at 95+.
 */
export function crossTrainPosition(
  rng: SeededRng,
  player: Player,
  targetPosition: FieldPosition,
): CrossTrainResult {
  if (isPitcherPosition(player.position) !== isPitcherPosition(targetPosition)) {
    return {
      trained: false,
      reason: 'Pitchers and position players train separate fundamentals.',
      player,
      deltaGain: 0,
      rustApplied: 0,
    };
  }
  if (player.throws === 'L' && MIDDLE_INF_ONLY_LEFT_BLOCKED.has(targetPosition)) {
    return {
      trained: false,
      reason: 'Left-handed throwers cannot cross-train cleanly at 2B, 3B, or SS.',
      player,
      deltaGain: 0,
      rustApplied: 0,
    };
  }

  const deltaGain = rng.int(14, 20);
  const rustApplied = rng.int(4, 8);
  const nextProficiency: Partial<Record<FieldPosition, number>> = {};

  for (const [posKey, score] of Object.entries(player.positionProficiency) as [FieldPosition, number][]) {
    if (posKey !== targetPosition) {
      const floor = posKey === player.favoritePosition ? 45 : 30;
      nextProficiency[posKey] = Math.max(floor, score - rustApplied);
    }
  }

  const startScore = player.positionProficiency[targetPosition] ?? 32;
  const trainedScore = Math.min(100, startScore + deltaGain);
  nextProficiency[targetPosition] = trainedScore;

  const updatedFavorite =
    trainedScore >= 95 ? targetPosition : player.favoritePosition;

  const nextSecondary = (Object.entries(nextProficiency) as [FieldPosition, number][])
    .filter(([pos, mastery]) => pos !== player.position && mastery >= 50)
    .map(([pos]) => pos);

  return {
    trained: true,
    player: {
      ...player,
      favoritePosition: updatedFavorite,
      positionProficiency: nextProficiency,
      secondaryPositions: nextSecondary,
      fatigue: Math.min(100, player.fatigue + 10),
    },
    deltaGain,
    rustApplied,
  };
}
